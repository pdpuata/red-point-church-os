import { corsHeaders, json, optionsResponse } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json();
    const name = String(body.name || "").trim().slice(0, 120);
    const contact = String(body.contact || "").trim().slice(0, 180);
    const message = String(body.message || "").trim().slice(0, 2000);
    if (!name || !contact) return json({ error: "Name and contact are required." }, 400);

    const db = adminClient();
    const { data, error } = await db.from("visitor_submissions").insert({ name, contact, message: message || null }).select("id").single();
    if (error) throw error;

    const to = Deno.env.get("VISITOR_EMAIL_TO");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const from = Deno.env.get("RESEND_FROM_EMAIL");
    if (to && resendKey && from) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject: `New Red Point Church visitor: ${name}`, text: `Name: ${name}\nContact: ${contact}\nMessage: ${message || "(none)"}\nSubmission ID: ${data.id}` }),
      });
      if (!response.ok) console.error("Visitor email failed", await response.text());
    } else {
      console.warn("Visitor email secrets are not configured; submission was stored.");
    }
    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ error: "Could not submit visitor details." }, 500);
  }
});
