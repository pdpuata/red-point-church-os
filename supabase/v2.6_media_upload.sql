-- Red Point Church App V2.6
-- Run this in Supabase SQL Editor after V2.5 media migration.
alter table public.events add column if not exists image_url text;
alter table public.announcements add column if not exists image_url text;
alter table public.sermons add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('church-media', 'church-media', true)
on conflict (id) do update set public = true;

create policy "Public can view church media"
on storage.objects for select
using (bucket_id = 'church-media');

create policy "Admins can upload church media"
on storage.objects for insert to authenticated
with check (bucket_id = 'church-media' and exists (select 1 from public.admin_users where user_id = auth.uid()));

create policy "Admins can update church media"
on storage.objects for update to authenticated
using (bucket_id = 'church-media' and exists (select 1 from public.admin_users where user_id = auth.uid()))
with check (bucket_id = 'church-media' and exists (select 1 from public.admin_users where user_id = auth.uid()));

create policy "Admins can delete church media"
on storage.objects for delete to authenticated
using (bucket_id = 'church-media' and exists (select 1 from public.admin_users where user_id = auth.uid()));
