-- Restore the shared admin authorization helper used by later admin/QA policies.
-- SECURITY DEFINER is intentionally constrained to the public schema and the
-- authenticated user's own admin_users membership. No service-role path is used.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
