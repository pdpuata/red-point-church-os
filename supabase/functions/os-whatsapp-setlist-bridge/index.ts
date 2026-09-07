import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

const normalizePhone = (value: string) => value.replace(/[^\d+]/g, "").replace(/^00/, "+");
const normalizeTitle = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function parseDateToken(token: string, now = new Date()) {
  const clean = token.trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
  const m = clean.match(/^(\d{1,2})([A-Z]{3})(\d{4})?$/);
  if (!m) return null;
  const months: Record<string, number> = { JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11 };
  if (months[m[2]] === undefined) return null;
  const year = m[3] ? Number(m[3]) : now.getUTCFullYear();
  const d = new Date(Date.UTC(year, months[m[2]], Number(m[1])));
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function parseSetlist(text: string) {
  const lines = text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  if (!lines.length) return { error: "empty_message" };
  const header = lines[0].match(/^SETLIST\s+([^\s]+)\s*$/i);
  if (!header) return { error: "invalid_command", help: "Start with SETLIST followed by the service date, e.g. SETLIST 13SEP" };
  const serviceDate = parseDateToken(header[1]);
  if (!serviceDate) return { error: "invalid_date", help: "Use a date like 13SEP or 13SEP2026." };

  const songs = lines.slice(1).map((line) => {
    const parts = line.split(/\s*\|\s*/);
    return { title: parts[0].trim(), key: parts[1]?.trim() || null };
  }).filter((x) => x.title);
  if (!songs.length) return { error: "no_songs", help: "Add one song per line, optionally as Song Title | Key." };
  return { service_date: serviceDate, songs };
}

async function sendWhatsApp(to: string, body: string) {
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneNumberId) return { ok: false, reason: "whatsapp_provider_not_configured" };

  const response = await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: normalizePhone(to).replace(/^\+/, ""), type: "text", text: { preview_url: false, body } }),
  });
  const raw = await response.text();
  let data: any = {};
  try { data = JSON.parse(raw); } catch (_) { data = { raw }; }
  if (!response.ok) return { ok: false, reason: "whatsapp_send_failed", status: response.status, provider: data };
  return { ok: true, provider_message_id: data?.messages?.[0]?.id || null };
}

function serviceSummary(serviceDate: string, bandName: string | null, songs: any[]) {
  const label = new Date(`${serviceDate}T00:00:00Z`).toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" });
  return `Setlist received for ${label}.\n${bandName ? `${bandName} identified.\n` : "Band not yet identified.\n"}${songs.length} song${songs.length === 1 ? "" : "s"} imported as a draft.\n\n${songs.map((s, i) => `${i + 1}. ${s.title}${s.key ? ` — ${s.key}` : ""}`).join("\n")}\n\nReview and approve in Church OS before distribution.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && verifyToken && token === verifyToken && challenge) return new Response(challenge, { status: 200 });
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const payload = await req.json();
    const dbUrl = Deno.env.get("SUPABASE_URL");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!dbUrl || !serviceRole) return json({ ok: false, error: "backend_configuration_error" }, 500);
    const db = createClient(dbUrl, serviceRole);

    const value = payload?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];
    if (!message || message.type !== "text") return json({ ok: true, ignored: true, reason: "no_text_message" });

    const fromPhone = normalizePhone(message.from || "");
    const allowlist = (Deno.env.get("WHATSAPP_ADMIN_PHONES") || "").split(",").map(normalizePhone).filter(Boolean);
    if (!allowlist.length || !allowlist.includes(fromPhone)) return json({ ok: true, ignored: true, reason: "sender_not_allowlisted" });

    const body = message.text?.body || "";
    const parsed = parseSetlist(body);
    if ((parsed as any).error) {
      await sendWhatsApp(fromPhone, `I could not process that setlist.\n\n${(parsed as any).help || "Use SETLIST 13SEP followed by one song per line."}`);
      return json({ ok: false, reason: (parsed as any).error });
    }

    const result = await db.rpc("os_ingest_whatsapp_setlist", {
      p_provider_message_id: message.id,
      p_from_phone: fromPhone,
      p_service_date: (parsed as any).service_date,
      p_songs: (parsed as any).songs,
      p_raw_body: body,
    });
    if (result.error) throw result.error;
    const ingest = result.data;

    if (!ingest?.ok) {
      const reply = ingest?.reason === "unmatched_songs"
        ? `I received the setlist, but these songs are not in the Church OS song library yet:\n${(ingest.unmatched || []).map((x: any) => `• ${x.title}`).join("\n")}\n\nNothing was published.`
        : ingest?.reason === "service_not_found"
          ? `I could not find a Sunday service for ${(parsed as any).service_date}. Nothing was published.`
          : "I received the message but could not safely import it. Nothing was published.";
      await sendWhatsApp(fromPhone, reply);
      return json({ ok: false, ingest });
    }

    const [serviceRes, bandRes] = await Promise.all([
      db.from("music_services").select("id,service_date,band_id,title").eq("id", ingest.service_id).single(),
      ingest.band_id ? db.from("bands").select("id,name").eq("id", ingest.band_id).single() : Promise.resolve({ data: null, error: null }),
    ]);
    if (serviceRes.error) throw serviceRes.error;

    const reply = serviceSummary((parsed as any).service_date, bandRes.data?.name || null, (parsed as any).songs);
    const acknowledgement = await sendWhatsApp(fromPhone, reply);

    return json({
      ok: true,
      imported: true,
      status: "draft",
      service: serviceRes.data,
      band: bandRes.data,
      song_count: (parsed as any).songs.length,
      acknowledgement,
      next_step: "Approve the setlist in Church OS before distribution.",
    });
  } catch (error) {
    return json({ ok: false, error: "webhook_runtime_error", message: error instanceof Error ? error.message : String(error) }, 500);
  }
});
