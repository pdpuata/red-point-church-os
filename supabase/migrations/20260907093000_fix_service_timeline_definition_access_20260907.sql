grant select on table public.os_service_timeline_definitions to authenticated;
revoke all on table public.os_service_timeline_definitions from anon;

create policy "authenticated can read service timeline definitions"
on public.os_service_timeline_definitions
for select
to authenticated
using (public.is_admin() or public.is_music_leader());
