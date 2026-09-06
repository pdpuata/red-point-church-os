-- Red Point Church
-- Migration: 000002_admin_rls_fix
-- Purpose: make admin authorization work without exposing admin_users.
--
-- admin_users is intentionally RLS-protected with no direct table access.
-- A SECURITY DEFINER helper lets RLS policies verify the current user without
-- granting authenticated users SELECT access to the admin_users table.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  );
$$;

-- The function is used by RLS policies, not as a general-purpose public API.
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Content administration

drop policy if exists "admins manage events" on public.events;
create policy "admins manage events"
on public.events
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins manage announcements" on public.announcements;
create policy "admins manage announcements"
on public.announcements
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins manage sermons" on public.sermons;
create policy "admins manage sermons"
on public.sermons
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admins manage site settings" on public.site_settings;
create policy "admins manage site settings"
on public.site_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Visitor submissions

drop policy if exists "admins read visitors" on public.visitor_submissions;
create policy "admins read visitors"
on public.visitor_submissions
for select
to authenticated
using (public.is_admin());

drop policy if exists "admins update visitors" on public.visitor_submissions;
create policy "admins update visitors"
on public.visitor_submissions
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Device tokens remain server-managed for registration. Admins may read them
-- from the dashboard; the existing ALL policy is retained for admin tooling.
drop policy if exists "admins manage device tokens" on public.device_tokens;
create policy "admins manage device tokens"
on public.device_tokens
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Ministries / leaders

drop policy if exists "Admins manage ministries" on public.ministries;
create policy "Admins manage ministries"
on public.ministries
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins manage leaders" on public.leaders;
create policy "Admins manage leaders"
on public.leaders
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Notification history is administrative data. The Edge Function writes it
-- with the service-role client; the mobile admin UI only needs SELECT.
drop policy if exists "Admins can read notification history" on public.notification_history;
create policy "Admins can read notification history"
on public.notification_history
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can insert notification history" on public.notification_history;
create policy "Admins can insert notification history"
on public.notification_history
for insert
to authenticated
with check (public.is_admin());

-- Storage: use the same helper for church-media administration.
drop policy if exists "Admins can upload church media" on storage.objects;
create policy "Admins can upload church media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'church-media'
  and public.is_admin()
);

drop policy if exists "Admins can update church media" on storage.objects;
create policy "Admins can update church media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'church-media'
  and public.is_admin()
)
with check (
  bucket_id = 'church-media'
  and public.is_admin()
);

drop policy if exists "Admins can delete church media" on storage.objects;
create policy "Admins can delete church media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'church-media'
  and public.is_admin()
);
