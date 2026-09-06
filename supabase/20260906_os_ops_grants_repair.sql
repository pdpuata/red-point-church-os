-- Red Point Church OS — os_* grants/RLS repair (DRAFT — NOT APPLIED)
-- Date: 2026-09-06
--
-- STATUS: Contingent. Apply only AFTER supabase/ops_authorization_diagnostic.sql confirms
-- that the 403 wall is caused by missing production grants, not by an empty admin_users
-- bootstrap. If admin_users is empty, run the bootstrap in DEPLOYMENT_ORDER.md instead —
-- grants alone will not make is_admin() true.
--
-- Pattern enforced (per repo migrations, e.g. 20260906195000_os_people_source_intake_v7_5_26):
--   views/read models:  grant select to authenticated; revoke from anon.
--   RPCs:               grant execute to authenticated; revoke from anon/public;
--                       authorization stays inside the function via is_admin().
--
-- Safety: read-only grants/revokes only; every statement is existence-guarded and idempotent.

-- A. os_% views and materialized views
do $$
declare v record;
begin
  for v in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('v','m') and c.relname like 'os\_%'
  loop
    execute format('grant select on public.%I to authenticated', v.relname);
    execute format('revoke all on public.%I from anon', v.relname);
  end loop;
end $$;

-- B. The three RPCs observed failing in the app console
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure::text as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('os_publish_event', 'os_register_people_source', 'os_claim_workflow_dispatches')
  loop
    execute format('grant execute on function public.%s to authenticated', f.sig);
    execute format('revoke execute on function public.%s from anon, public', f.sig);
  end loop;
end $$;

-- C. OPTIONAL — enable only if diagnostic section 4/6 shows os_% BASE TABLES lack SELECT for
--    authenticated while the views use security_invoker=true (base-table rights are then required).
--    Uncomment after review:
-- do $$
-- declare t record;
-- begin
--   for t in
--     select c.relname
--     from pg_class c
--     join pg_namespace n on n.oid = c.relnamespace
--     where n.nspname = 'public' and c.relkind = 'r' and c.relname like 'os\_%'
--   loop
--     execute format('grant select on public.%I to authenticated', t.relname);
--     execute format('revoke all on public.%I from anon', t.relname);
--   end loop;
-- end $$;
