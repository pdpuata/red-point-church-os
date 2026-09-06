import { corsHeaders, json, optionsResponse } from "../_shared/cors.ts";

// Public sermon RSS proxy. The church website does not send CORS headers, so
// browsers (Expo web) cannot fetch the feed directly. Native apps fetch it
// directly; web clients call this function instead.
// Public data only — deployed with verify_jwt = false (see supabase/config.toml).
const RSS_URL = Deno.env.get("SERMON_RSS_URL") || "https://www.redpointchurch.com/pinetown-podcast-feed?format=rss";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  try {
    const upstream = await fetch(RSS_URL, {
      headers: { Accept: "application/rss+xml, application/xml, text/xml" },
    });
    if (!upstream.ok) return json({ error: `Upstream RSS responded ${upstream.status}` }, 502);
    const xml = await upstream.text();
    return json({ ok: true, xml, fetched_at: new Date().toISOString() });
  } catch (error) {
    console.error(error);
    return json({ error: "Could not load sermon feed." }, 500);
  }
});
