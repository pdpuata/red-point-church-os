-- Red Point Church OS — fix the Admin System Integrity Audit execution context.
-- Applied to production Supabase on 2026-09-06.
-- The audit writes its own run/result tables, so authenticated Admin users
-- must not need direct INSERT grants. Keep the explicit admin check in the
-- function body and lock the SECURITY DEFINER search_path.
ALTER FUNCTION public.os_run_system_integrity_audit()
  SECURITY DEFINER
  SET search_path = public, pg_temp;

REVOKE EXECUTE ON FUNCTION public.os_run_system_integrity_audit() FROM anon;
REVOKE EXECUTE ON FUNCTION public.os_run_system_integrity_audit() FROM public;
GRANT EXECUTE ON FUNCTION public.os_run_system_integrity_audit() TO authenticated;
