import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

function deterministicAnalysis(context: any) {
  const risks: string[] = [];
  const recommendations: string[] = [];
  const recent = context.recent_song_repetitions || [];

  if (!context.active_assignments?.length) {
    risks.push("no_active_assignments");
    recommendations.push("Complete the service roster before finalising the setlist.");
  }
  if (recent.length) {
    risks.push("recent_song_repetition");
    recommendations.push("Review recently repeated songs before publishing the next setlist.");
  }
  if (!risks.length) {
    recommendations.push("Review the historical rotation and select a balanced, singable setlist.");
  }

  return {
    summary: risks.length
      ? `Deterministic setlist operations analysis found ${risks.length} operational risk${risks.length === 1 ? "" : "s"}.`
      : "No deterministic setlist operations blockers were detected from the supplied context.",
    risks,
    recommendations,
    confidence: 0.75,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  let stage = "initialisation";
  let serviceId: string | null = null;
  let context: any = null;

  try {
    stage = "authentication";
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ ok: false, error: "missing_authorization" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !serviceRole) {
      return json({ ok: false, error: "backend_configuration_error", stage }, 500);
    }

    const user = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: admin, error: adminError } = await user.rpc("is_admin");
    if (adminError || !admin) return json({ ok: false, error: "admin_required" }, 403);

    stage = "request";
    const body = await req.json().catch(() => ({}));
    serviceId = body?.service_id || null;

    const db = createClient(url, serviceRole);

    stage = "service_context";
    let service: any;
    if (serviceId) {
      const r = await db.from("music_services").select("id,title,service_date,band_id,notes").eq("id", serviceId).single();
      if (r.error) throw r.error;
      service = r.data;
    } else {
      const r = await db.from("music_services").select("id,title,service_date,band_id,notes").gte("service_date", new Date().toISOString().slice(0, 10)).order("service_date", { ascending: true }).limit(1).single();
      if (r.error) throw r.error;
      service = r.data;
      serviceId = service.id;
    }

    stage = "operational_context";
    const [songs, sets, items, assignments, roles] = await Promise.all([
      db.from("music_songs").select("id,title").order("title"),
      db.from("music_setlists").select("id,service_id,status,music_services(service_date,title)").eq("status", "published").order("created_at", { ascending: true }),
      db.from("music_setlist_items").select("setlist_id,song_id,position,music_songs(title)"),
      db.from("service_assignments").select("id,person_id,responsibility,assignment_status,confirmation_status,notes").eq("service_id", service.id).eq("assignment_status", "active"),
      db.from("music_person_band_roles").select("person_id,role,is_leader,music_people(display_name)").eq("band_id", service.band_id),
    ]);
    for (const result of [songs, sets, items, assignments, roles]) {
      if (result.error) throw result.error;
    }

    const history = (sets.data || []).map((s: any) => ({
      service_date: s.music_services?.service_date || null,
      title: s.music_services?.title || null,
      songs: (items.data || []).filter((i: any) => i.setlist_id === s.id).sort((a: any, b: any) => a.position - b.position).map((i: any) => i.music_songs?.title).filter(Boolean),
    }));

    const counts = new Map<string, number>();
    for (const h of history) for (const title of h.songs) counts.set(title, (counts.get(title) || 0) + 1);
    const recentTitles = history.slice(-8).flatMap((x: any) => x.songs);
    const repeated = [...new Set(recentTitles)].filter((title) => recentTitles.filter((x: string) => x === title).length > 1).map((title) => ({ title, plays: recentTitles.filter((x: string) => x === title).length }));

    context = {
      service,
      active_assignments: assignments.data || [],
      band_roles: roles.data || [],
      song_catalog_size: (songs.data || []).length,
      historical_setlists: history.slice(-20),
      most_played: [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([title, plays]) => ({ title, plays })),
      recent_song_repetitions: repeated,
    };

    stage = "ai_provider";
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return json({ ok: true, configured: false, ai_available: false, service_id: service.id, analysis: deterministicAnalysis(context), context, provider: { status: "not_configured" } });
    }

    const model = Deno.env.get("OPENAI_SETLIST_MODEL") || "gpt-5.6-luna";
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: "You are the Setlist Operations Agent for Red Point Church. Analyze supplied worship setlist history and upcoming-service context. Detect excessive repetition, gaps in song rotation, recent reuse, service-pattern anomalies, and operational risks. Recommend concrete next actions. Do not invent songs, people, dates, theology, availability or assignments. Do not approve or finalize a setlist. Human music-leader approval is required for any final setlist decision." },
          { role: "user", content: JSON.stringify(context) },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "setlist_operations_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                summary: { type: "string" },
                risks: { type: "array", items: { type: "string" } },
                recommendations: { type: "array", items: { type: "string" } },
                confidence: { type: "number" },
              },
              required: ["summary", "risks", "recommendations", "confidence"],
              additionalProperties: false,
            },
          },
        },
      }),
    });

    const raw = await response.text();
    if (!response.ok) {
      let providerCode = "unknown";
      let providerMessage = "AI provider request failed";
      try {
        const parsed = JSON.parse(raw);
        providerCode = parsed?.error?.code || parsed?.error?.type || providerCode;
        providerMessage = parsed?.error?.message || providerMessage;
      } catch (_) {}
      return json({
        ok: true,
        configured: true,
        ai_available: false,
        fallback: true,
        service_id: service.id,
        analysis: deterministicAnalysis(context),
        context,
        provider: { status: "error", code: providerCode, message: providerMessage, http_status: response.status },
      });
    }

    stage = "ai_parse";
    const payload = JSON.parse(raw);
    const analysis = JSON.parse(payload.output_text);
    return json({ ok: true, configured: true, ai_available: true, fallback: false, service_id: service.id, model, analysis, context, provider: { status: "ok" } });
  } catch (error) {
    return json({
      ok: true,
      configured: Boolean(Deno.env.get("OPENAI_API_KEY")),
      ai_available: false,
      fallback: true,
      service_id: serviceId,
      analysis: deterministicAnalysis(context || {}),
      context,
      provider: { status: "runtime_error", stage, message: error instanceof Error ? error.message : String(error) },
    });
  }
});
