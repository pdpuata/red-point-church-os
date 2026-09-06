-- V6.2 Security & Privacy Hardening
-- Reasserts least-privilege RLS on public content and adds useful indexes.

alter table if exists public.leaders enable row level security;

-- Public users may only read published leaders.
drop policy if exists "Public can read published leaders" on public.leaders;
create policy "Public can read published leaders"
  on public.leaders for select
  to anon, authenticated
  using (published = true);

-- Only authenticated church admins may manage leaders.
drop policy if exists "Admins manage leaders" on public.leaders;
create policy "Admins manage leaders"
  on public.leaders for all
  to authenticated
  using (exists (select 1 from public.admin_users au where au.user_id = auth.uid()))
  with check (exists (select 1 from public.admin_users au where au.user_id = auth.uid()));

create index if not exists leaders_published_sort_idx
  on public.leaders (published, sort_order, name);

create index if not exists announcements_published_date_idx
  on public.announcements (published, published_at desc);

create index if not exists sermons_published_date_idx
  on public.sermons (published, preached_at desc);

create index if not exists events_published_start_idx
  on public.events (published, starts_at asc);
