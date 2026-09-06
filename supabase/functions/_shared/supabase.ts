import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.4";

export function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase server configuration is incomplete.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function requireAdmin(request: Request) {
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Bearer ")) throw new Error("Authentication required.");
  const token = header.slice(7);
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !anon) throw new Error("Supabase server configuration is incomplete.");
  const userClient = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await userClient.auth.getUser();
  if (error || !user) throw new Error("Invalid authentication.");
  const db = adminClient();
  const { data: admin, error: adminError } = await db.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  if (adminError || !admin) throw new Error("Administrator access required.");
  return user;
}
