-- Red Point Church OS — Ops/Admin authorization diagnostic (READ-ONLY)
-- Date: 2026-09-06
-- Context: App on Admin → Ops received HTTP 403 on all os_* reads and admin_qa_runs insert,
--          HTTP 400 on rpc/os_publish_event and rpc/os_register_people_source,
--          HTTP 403 on rpc/os_claim_workflow_dispatches.
-- How to run: Supabase Dashboard → SQL Editor → paste → Run. Nothing here mutates data.
-- Record the output under .ai/evidence/ per the repository operating loop.

-- 0. Which database are we actually inspecting?
select current_database() as database, current_user as executed_as, now() as checked_at;

-- 1. ADMIN BOOTSTRAP — is any account registered as admin?
--    A count of 0 means is_admin() is false for everyone: every admin check will fail.
select count(*) as admin_user_count from public.admin_users;
--    Then confirm the app's signed-in account specifically (UUID from Authentication → Users):
-- select exists(select 1 from public.admin_users where user_id = '<AUTH-USER-UUID>') as account_is_admin;

-- 2. is_admin() definition (confirms what production actually evaluates).
select p.proname,
       p.prosecdef as security_definer,
       pg_get_function_result(p.oid) as returns,
       pg_get_function_source(p.oid) as source
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'is_admin';
-- Note: `select public.is_admin();` in the SQL editor runs as postgres with no JWT,
-- so auth.uid() is null and it returns false even for admins. Use check 1 for the real answer.

-- 3. Do the ops objects exist at all in production?
select t.name, to_regclass(format('public.%I', t.name)) is not null as exists_in_production
from (values
  ('os_people_directory'), ('os_agent_runtime_health'), ('os_workflow_runtime_health'),
  ('os_operational_data_readiness'), ('os_system_integrity_live'), ('os_communication_queue'),
  ('os_staff_control_tower'), ('os_control_tower_attention'), ('os_operational_activation'),
  ('admin_qa_runs'), ('admin_qa_results'), ('admin_repair_queue')
) as t(name)
order by t.name;

-- 4. Table/view grants — the 403 fingerprint.
--    Expected per repo pattern: authenticated holds SELECT; anon holds nothing.
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and (table_name like 'os\_%' or table_name like 'admin\_%')
  and privilege_type = 'SELECT'
order by table_name, grantee;

-- 5. security_invoker flag on the os_* views
--    (when true, the invoker also needs rights on the view's base tables).
select c.relname as view_name, c.reloptions
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('v','m') and c.relname like 'os\_%'
order by c.relname;

-- 6. RLS state and policies on the base tables behind the views.
select c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and (c.relname like 'os\_%' or c.relname like 'admin\_%')
order by c.relname;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and (tablename like 'os\_%' or tablename like 'admin\_%')
order by tablename, policyname;

-- 7. RPC signatures in production — explains the 400s
--    (compare arguments against the call params in src/os/os.ts).
select p.proname,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('os_publish_event', 'os_register_people_source', 'os_claim_workflow_dispatches')
order by p.proname;

-- 8. RPC execute grants.
select routine_name, grantee, privilege_type
from information_schema.role_routine_grants
where routine_schema = 'public'
  and routine_name in ('os_publish_event', 'os_register_people_source', 'os_claim_workflow_dispatches')
order by routine_name, grantee;
