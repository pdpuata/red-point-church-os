import { corsHeaders, json, optionsResponse } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.4";

// Authoritative public sermon source: Red Point Church's official podcast RSS feed.
const RSS_URL = Deno.env.get("SERMON_RSS_URL") || "https://www.redpointchurch.com/pinetown-podcast-feed?format=rss";
const AUDIO_HOSTS = new Set(["static1.squarespace.com", "static.squarespace.com"]);

function adminDb() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase server configuration is incomplete.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function audioProxyUrl(req: Request, audioUrl: string) {
  const url = new URL(req.url);
  url.search = "";
  url.searchParams.set("audio", audioUrl);
  return url.toString();
}

async function filterUnpublishedItems(xml: string) {
  const db = adminDb();
  const { data, error } = await db.from("sermons").select("source_guid,published").not("source_guid", "is", null);
  if (error) throw error;
  const statusByGuid = new Map((data || []).map((row: { source_guid: string; published: boolean }) => [row.source_guid, row.published]));

  return xml.replace(/<item\b[^>]*>[\s\S]*?<\/item>/gi, (item) => {
    const guidMatch = item.match(/<guid\b[^>]*>([\s\S]*?)<\/guid>/i);
    if (!guidMatch) return item;
    const guid = guidMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();
    return statusByGuid.get(guid) === false ? "" : item;
  });
}

function rewriteAudioUrls(xml: string, req: Request) {
  const rewrite = (full: string, prefix: string, url: string, suffix: string, tag: string) => {
    try {
      const upstream = new URL(url);
      if (!AUDIO_HOSTS.has(upstream.hostname)) return full;
      return `<${tag}${prefix}url="${audioProxyUrl(req, upstream.toString())}"${suffix}>`;
    } catch {
      return full;
    }
  };

  let result = xml.replace(/<enclosure\b([^>]*?)\burl=["']([^"']+)["']([^>]*)>/gi,
    (full, before, url, after) => rewrite(full, before, url, after, "enclosure"));
  result = result.replace(/<media:content\b([^>]*?)\burl=["']([^"']+)["']([^>]*)>/gi,
    (full, before, url, after) => rewrite(full, before, url, after, "media:content"));
  return result;
}

async function proxyAudio(req: Request, audioUrl: string) {
  const upstreamUrl = new URL(audioUrl);
  if (!AUDIO_HOSTS.has(upstreamUrl.hostname)) return json({ error: "Audio source is not allowed." }, 403);

  const headers = new Headers();
  const range = req.headers.get("Range");
  if (range) headers.set("Range", range);

  const upstream = await fetch(upstreamUrl, { headers });
  if (!upstream.ok && upstream.status !== 206) return json({ error: `Audio source responded ${upstream.status}.` }, 502);

  const responseHeaders = new Headers(corsHeaders);
  responseHeaders.set("Content-Type", upstream.headers.get("Content-Type") || "audio/mp4");
  for (const name of ["Content-Length", "Content-Range", "Accept-Ranges", "Cache-Control", "ETag", "Last-Modified"]) {
    const value = upstream.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  responseHeaders.set("Content-Disposition", "inline");
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  try {
    const requestUrl = new URL(req.url);
    const audio = requestUrl.searchParams.get("audio");
    if (audio) return await proxyAudio(req, audio);
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const upstream = await fetch(RSS_URL, { headers: { Accept: "application/rss+xml, application/xml, text/xml" } });
    if (!upstream.ok) return json({ error: `Upstream RSS responded ${upstream.status}` }, 502);
    const filtered = await filterUnpublishedItems(await upstream.text());
    const xml = rewriteAudioUrls(filtered, req);
    return json({ ok: true, xml, fetched_at: new Date().toISOString() });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Could not load sermon feed." }, 500);
  }
});
