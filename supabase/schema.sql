-- Red Point Church V0.4 production-oriented backend.
-- Run this in the Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  published_at timestamptz not null default now(),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- V1.4 announcement controls (safe to run on an existing database).
alter table public.announcements add column if not exists important boolean not null default false;
alter table public.announcements add column if not exists expires_at timestamptz;

create table if not exists public.sermons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  preached_at timestamptz,
  youtube_url text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ministries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  meeting_info text,
  contact text,
  image_url text,
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.visitor_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,
  message text,
  created_at timestamptz not null default now(),
  followed_up_at timestamptz,
  status text not null default 'new' check (status in ('new','contacted','closed'))
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios', 'android', 'web', 'unknown')),
  device_name text,
  app_version text,
  active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists events_public_schedule_idx on public.events (published, starts_at);
create index if not exists announcements_public_schedule_idx on public.announcements (published, published_at desc);
create index if not exists sermons_public_schedule_idx on public.sermons (published, preached_at desc);

create index if not exists visitor_created_idx on public.visitor_submissions (created_at desc);
create index if not exists visitor_status_idx on public.visitor_submissions (status, created_at desc);
create index if not exists device_active_idx on public.device_tokens (active, last_seen_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at before update on public.events for each row execute function public.set_updated_at();
drop trigger if exists announcements_set_updated_at on public.announcements;
create trigger announcements_set_updated_at before update on public.announcements for each row execute function public.set_updated_at();
drop trigger if exists sermons_set_updated_at on public.sermons;
create trigger sermons_set_updated_at before update on public.sermons for each row execute function public.set_updated_at();

alter table public.events enable row level security;
alter table public.announcements enable row level security;
alter table public.sermons enable row level security;
alter table public.visitor_submissions enable row level security;
alter table public.admin_users enable row level security;
alter table public.device_tokens enable row level security;
alter table public.site_settings enable row level security;


-- Public Home copy is readable; only authorised admins can change it.
drop policy if exists "public can read site settings" on public.site_settings;
create policy "public can read site settings" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "admins manage site settings" on public.site_settings;
create policy "admins manage site settings" on public.site_settings for all to authenticated using (exists (select 1 from public.admin_users a where a.user_id = auth.uid())) with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- Public content is readable only when published.
drop policy if exists "public can read published events" on public.events;
create policy "public can read published events" on public.events for select to anon, authenticated using (published = true);
drop policy if exists "public can read published announcements" on public.announcements;
create policy "public can read published announcements" on public.announcements for select to anon, authenticated using (published = true);
drop policy if exists "public can read published sermons" on public.sermons;
create policy "public can read published sermons" on public.sermons for select to anon, authenticated using (published = true);

-- Authenticated admins can manage content.
drop policy if exists "admins manage events" on public.events;
create policy "admins manage events" on public.events for all to authenticated using (exists (select 1 from public.admin_users a where a.user_id = auth.uid())) with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
drop policy if exists "admins manage announcements" on public.announcements;
create policy "admins manage announcements" on public.announcements for all to authenticated using (exists (select 1 from public.admin_users a where a.user_id = auth.uid())) with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
drop policy if exists "admins manage sermons" on public.sermons;
create policy "admins manage sermons" on public.sermons for all to authenticated using (exists (select 1 from public.admin_users a where a.user_id = auth.uid())) with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- Admins can view visitor submissions in the dashboard. Public users cannot.
drop policy if exists "admins read visitors" on public.visitor_submissions;
create policy "admins read visitors" on public.visitor_submissions for select to authenticated using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));
drop policy if exists "admins update visitors" on public.visitor_submissions;
create policy "admins update visitors" on public.visitor_submissions for update to authenticated using (exists (select 1 from public.admin_users a where a.user_id = auth.uid())) with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- The mobile app does not directly write device tokens; register-device uses a server-side key.
drop policy if exists "admins manage device tokens" on public.device_tokens;
create policy "admins manage device tokens" on public.device_tokens for all to authenticated using (exists (select 1 from public.admin_users a where a.user_id = auth.uid())) with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- Admin bootstrap:
-- 1. Create an admin account under Authentication > Users in Supabase.
-- 2. Copy that user's UUID.
-- 3. Run: insert into public.admin_users(user_id) values ('YOUR-USER-UUID');


alter table public.ministries enable row level security;
drop policy if exists "Public can read published ministries" on public.ministries;
create policy "Public can read published ministries" on public.ministries for select using (published = true);
drop policy if exists "Admins manage ministries" on public.ministries;
create policy "Admins manage ministries" on public.ministries for all using (exists (select 1 from public.admin_users au where au.user_id = auth.uid())) with check (exists (select 1 from public.admin_users au where au.user_id = auth.uid()));


-- V3.4 notification history
create table if not exists public.notification_history (id uuid primary key default gen_random_uuid(), title text not null, body text not null, target text not null default 'Home', sent_count integer not null default 0, created_at timestamptz not null default now());
alter table public.notification_history enable row level security;
drop policy if exists "Admins can read notification history" on public.notification_history;
create policy "Admins can read notification history" on public.notification_history for select using (exists (select 1 from public.admin_users where user_id = auth.uid()));
drop policy if exists "Admins can insert notification history" on public.notification_history;
create policy "Admins can insert notification history" on public.notification_history for insert with check (exists (select 1 from public.admin_users where user_id = auth.uid()));
create index if not exists notification_history_created_idx on public.notification_history(created_at desc);
