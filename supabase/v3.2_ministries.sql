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

create index if not exists ministries_sort_idx on public.ministries (sort_order, title);

alter table public.ministries enable row level security;
drop policy if exists "Public can read published ministries" on public.ministries;
create policy "Public can read published ministries" on public.ministries for select using (published = true);
drop policy if exists "Admins manage ministries" on public.ministries;
create policy "Admins manage ministries" on public.ministries for all using (exists (select 1 from public.admin_users au where au.user_id = auth.uid())) with check (exists (select 1 from public.admin_users au where au.user_id = auth.uid()));
