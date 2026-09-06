-- V3.4 Communication Centre
create table if not exists public.notification_history (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  target text not null default 'Home',
  sent_count integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.notification_history enable row level security;
drop policy if exists "Admins can read notification history" on public.notification_history;
create policy "Admins can read notification history" on public.notification_history for select using (exists (select 1 from public.admin_users where user_id = auth.uid()));
drop policy if exists "Admins can insert notification history" on public.notification_history;
create policy "Admins can insert notification history" on public.notification_history for insert with check (exists (select 1 from public.admin_users where user_id = auth.uid()));
create index if not exists notification_history_created_idx on public.notification_history(created_at desc);
