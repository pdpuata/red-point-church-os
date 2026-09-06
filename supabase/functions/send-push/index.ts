import { json, optionsResponse } from "../_shared/cors.ts";
import { adminClient, requireAdmin } from "../_shared/supabase.ts";

async function sendExpo(messages: Array<Record<string, unknown>>) {
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.errors?.[0]?.message || "Expo push service failed.");
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    await requireAdmin(req);
    const body = await req.json();
    const title = String(body.title || "").trim().slice(0, 80);
    const message = String(body.body || "").trim().slice(0, 500);
    const target = String(body.target || "Home").slice(0, 40);
    const recipientUserId = body.recipient_user_id ? String(body.recipient_user_id) : null;
    const communicationId = body.communication_id ? String(body.communication_id) : null;
    const kind = String(body.kind || "General").slice(0, 40);
    if (!title || !message) return json({ error: "Title and message are required." }, 400);

    const db = adminClient();
    const deviceQuery = db.from("device_tokens").select("expo_push_token").eq("active", true);
    const { data: devices, error } = recipientUserId ? await deviceQuery.eq("user_id", recipientUserId) : await deviceQuery;
    if (error) throw error;
    const tokens = (devices || []).map((d) => d.expo_push_token).filter(Boolean);
    let sent = 0;
    for (let i = 0; i < tokens.length; i += 100) {
      const chunk = tokens.slice(i, i + 100).map((to) => ({ to, title, body: message, sound: "default", data: { screen: target, kind } }));
      if (chunk.length) { await sendExpo(chunk); sent += chunk.length; }
    }
    await db.from("notification_history").insert({ title, body: message, target, sent_count: sent });
    if (communicationId) {
      await db.from("os_communications").update({ status: sent > 0 ? "sent" : "failed", sent_at: sent > 0 ? new Date().toISOString() : null, failure_reason: sent > 0 ? null : "No active recipient device token", updated_at: new Date().toISOString() }).eq("id", communicationId);
    }
    return json({ ok: true, sent, recipient_user_id: recipientUserId });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Could not send notification." }, 500);
  }
});
