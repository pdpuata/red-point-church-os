-- Red Point Church OS — repair authenticated access to staff control tower.
-- Applied to production Supabase as migration 20260906194530.
-- Root cause verified: admin bootstrap exists and the view was security_invoker=true,
-- but authenticated lacked SELECT on public.os_staff_control_tower.
-- Keep anon denied; underlying os_* tables remain protected by admin RLS policies.

grant select on public.os_staff_control_tower to authenticated;
revoke all on public.os_staff_control_tower from anon;
