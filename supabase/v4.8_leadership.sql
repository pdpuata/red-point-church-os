create table if not exists public.leaders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  bio text,
  contact text,
  image_url text,
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists leaders_sort_idx on public.leaders (sort_order, name);
alter table public.leaders enable row level security;
drop policy if exists "Public can read published leaders" on public.leaders;
create policy "Public can read published leaders" on public.leaders for select using (published = true);
drop policy if exists "Admins manage leaders" on public.leaders;
create policy "Admins manage leaders" on public.leaders for all using (exists (select 1 from public.admin_users au where au.user_id = auth.uid())) with check (exists (select 1 from public.admin_users au where au.user_id = auth.uid()));
