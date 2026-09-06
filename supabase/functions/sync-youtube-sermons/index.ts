import { json, optionsResponse } from "../_shared/cors.ts";
import { adminClient, requireAdmin } from "../_shared/supabase.ts";

async function youtube(path: string) {
  const key = Deno.env.get("YOUTUBE_API_KEY");
  if (!key) throw new Error("YOUTUBE_API_KEY is not configured.");
  const response = await fetch(`https://www.googleapis.com/youtube/v3/${path}${path.includes("?") ? "&" : "?"}key=${encodeURIComponent(key)}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "YouTube API request failed.");
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    await requireAdmin(req);
    const channel = await youtube("channels?part=snippet,contentDetails&id=UCEN1U4zn9RnvEkykRrerg5Q");
    const channelItem = channel.items?.[0];
    if (!channelItem) throw new Error("Could not find the configured Red Point Church YouTube channel.");
    const channelTitle = channelItem.snippet?.title || "Red Point Church";
    const uploads = channelItem.contentDetails.relatedPlaylists.uploads;
    const list = await youtube(`playlistItems?part=snippet,contentDetails&playlistId=${encodeURIComponent(uploads)}&maxResults=50`);
    const videoIds = (list.items || []).map((x: any) => x.contentDetails?.videoId).filter(Boolean);
    if (!videoIds.length) return json({ imported: 0, skipped: 0 });
    const details = await youtube(`videos?part=snippet,contentDetails&id=${videoIds.map(encodeURIComponent).join(",")}`);
    const db = adminClient();
    let imported = 0;
    let skipped = 0;
    for (const video of details.items || []) {
      const id = video.id;
      const url = `https://www.youtube.com/watch?v=${id}`;
      const { data: existing } = await db.from("sermons").select("id").eq("youtube_url", url).maybeSingle();
      if (existing) { skipped++; continue; }
      const publishedAt = video.snippet?.publishedAt || null;
      const { error } = await db.from("sermons").insert({
        title: video.snippet?.title || "Untitled sermon",
        description: video.snippet?.description || null,
        preached_at: publishedAt,
        youtube_url: url,
        image_url: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        published: false,
      });
      if (!error) imported++; else if (String(error.message).toLowerCase().includes("duplicate")) skipped++; else throw error;
    }
    return json({ imported, skipped, channelId: channelItem.id, channelTitle });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "YouTube sync failed." }, 500);
  }
});
