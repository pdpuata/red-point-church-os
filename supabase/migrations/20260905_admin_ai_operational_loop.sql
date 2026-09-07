create table if not exists public.admin_qa_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  trigger text not null default 'manual',
  status text not null default 'running' check (status in ('running','passed','failed')),
  summary jsonb not null default '{}'::jsonb
);
create table if not exists public.admin_qa_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.admin_qa_runs(id) on delete cascade,
  test_key text not null,
  surface text not null,
  operation text not null,
  status text not null check (status in ('passed','failed','skipped')),
  detail text,
  checked_at timestamptz not null default now(),
  unique(run_id,test_key)
);
create table if not exists public.admin_repair_queue (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.admin_qa_runs(id) on delete set null,
  surface text not null,
  issue text not null,
  suggested_action text,
  priority text not null default 'medium' check(priority in ('low','medium','high','critical')),
  status text not null default 'open' check(status in ('open','in_progress','resolved','wont_fix')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table public.admin_qa_runs enable row level security;
alter table public.admin_qa_results enable row level security;
alter table public.admin_repair_queue enable row level security;
drop policy if exists "admins manage qa runs" on public.admin_qa_runs;
create policy "admins manage qa runs" on public.admin_qa_runs for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage qa results" on public.admin_qa_results;
create policy "admins manage qa results" on public.admin_qa_results for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admins manage repair queue" on public.admin_repair_queue;
create policy "admins manage repair queue" on public.admin_repair_queue for all to authenticated using (public.is_admin()) with check (public.is_admin());
create index if not exists idx_admin_qa_runs_started on public.admin_qa_runs(started_at desc);
create index if not exists idx_admin_qa_results_run on public.admin_qa_results(run_id);
create index if not exists idx_admin_repair_status on public.admin_repair_queue(status,priority,created_at desc);
create or replace function public.admin_operational_snapshot()
returns jsonb language plpgsql security definer stable set search_path=public,pg_temp as $$
declare uid uuid := auth.uid(); isadm boolean; result jsonb;
begin
  select exists(select 1 from public.admin_users where user_id=uid) into isadm;
  if not isadm then return jsonb_build_object('ok',false,'error','not_admin'); end if;
  select jsonb_build_object(
    'ok',true,'checked_at',now(),'admin',true,
    'counts',jsonb_build_object(
      'events',(select count(*) from public.events),
      'announcements',(select count(*) from public.announcements),
      'sermons',(select count(*) from public.sermons),
      'ministries',(select count(*) from public.ministries),
      'leaders',(select count(*) from public.leaders),
      'visitors',(select count(*) from public.visitor_submissions),
      'notifications',(select count(*) from public.notification_history)
    ),
    'tables',jsonb_build_object(
      'events',true,'announcements',true,'sermons',true,'ministries',true,
      'leaders',true,'visitor_submissions',true,'site_settings',true,
      'notification_history',true,'admin_qa_runs',true,'admin_qa_results',true,
      'admin_repair_queue',true
    )
  ) into result;
  return result;
end $$;
revoke all on function public.admin_operational_snapshot() from public;
grant execute on function public.admin_operational_snapshot() to authenticated;
