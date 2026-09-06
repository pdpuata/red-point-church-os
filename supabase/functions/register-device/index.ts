import { corsHeaders, json, optionsResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json();
    const expoPushToken = String(body.expoPushToken || "").trim();
    const platform = ["ios", "android", "web", "unknown"].includes(body.platform) ? body.platform : "unknown";
    if (!expoPushToken.startsWith("ExponentPushToken[") && !expoPushToken.startsWith("ExpoPushToken[")) {
      return json({ error: "Invalid Expo push token." }, 400);
    }
    const db = adminClient();
    const { error } = await db.from("device_tokens").upsert({
      expo_push_token: expoPushToken,
      platform,
      device_name: typeof body.deviceName === "string" ? body.deviceName.slice(0, 120) : null,
      app_version: typeof body.appVersion === "string" ? body.appVersion.slice(0, 40) : null,
      active: true,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "expo_push_token" });
    if (error) throw error;
    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ error: "Could not register device." }, 500);
  }
});
