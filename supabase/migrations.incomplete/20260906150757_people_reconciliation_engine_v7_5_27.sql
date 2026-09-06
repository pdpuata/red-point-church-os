-- v7.5.27 — People Reconciliation Engine schema parity.
-- Staging only: no direct mutation of profiles or operational people graph.

alter table public.os_people_import_rows
  add column if not exists row_fingerprint text,
  add column if not exists previous_row_id uuid references public.os_people_import_rows(id),
  add column if not exists change_type text check (change_type is null or change_type in ('new','unchanged','update','conflict','unmatched','possible_duplicate')),
  add column if not exists identity_confidence numeric(5,4),
  add column if not exists reconciliation_status text default 'pending' check (reconciliation_status in ('pending','ready','needs_review','approved','rejected','applied')),
  add column if not exists reconciliation_reasons jsonb not null default '[]'::jsonb;

create index if not exists os_people_import_rows_reconciliation_idx on public.os_people_import_rows(import_run_id,reconciliation_status,change_type);
create index if not exists os_people_import_rows_fingerprint_idx on public.os_people_import_rows(import_run_id,row_fingerprint);

create table if not exists public.os_people_reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid not null references public.os_people_import_runs(id) on delete cascade,
  previous_import_run_id uuid references public.os_people_import_runs(id),
  status text not null default 'ready' check (status in ('ready','needs_review','approved','applied','failed')),
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid references auth.users(id),
  unique(import_run_id)
);

create table if not exists public.os_people_reconciliation_items (
  id uuid primary key default gen_random_uuid(),
  reconciliation_run_id uuid not null references public.os_people_reconciliation_runs(id) on delete cascade,
  import_row_id uuid not null references public.os_people_import_rows(id) on delete cascade,
  previous_row_id uuid references public.os_people_import_rows(id),
  change_type text not null check (change_type in ('new','unchanged','update','conflict','unmatched','possible_duplicate')),
  identity_confidence numeric(5,4),
  field_diffs jsonb not null default '[]'::jsonb,
  reasons jsonb not null default '[]'::jsonb,
  ai_recommendation jsonb,
  resolution_status text not null default 'pending' check (resolution_status in ('pending','approved','rejected','deferred')),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique(reconciliation_run_id,import_row_id)
);

alter table public.os_people_reconciliation_runs enable row level security;
alter table public.os_people_reconciliation_items enable row level security;
drop policy if exists os_people_reconciliation_runs_admin on public.os_people_reconciliation_runs;
create policy os_people_reconciliation_runs_admin on public.os_people_reconciliation_runs for all using (is_admin()) with check (is_admin());
drop policy if exists os_people_reconciliation_items_admin on public.os_people_reconciliation_items;
create policy os_people_reconciliation_items_admin on public.os_people_reconciliation_items for all using (is_admin()) with check (is_admin());
grant select,insert,update,delete on public.os_people_reconciliation_runs to authenticated;
grant select,insert,update,delete on public.os_people_reconciliation_items to authenticated;
revoke all on public.os_people_reconciliation_runs from anon,public;
revoke all on public.os_people_reconciliation_items from anon,public;

create or replace view public.os_people_reconciliation_readiness with (security_invoker=true) as
select r.id as reconciliation_run_id,r.import_run_id,r.previous_import_run_id,r.status,r.summary,r.created_at,r.completed_at,
 count(i.id)::int as item_count,
 count(i.id) filter (where i.resolution_status='pending')::int as pending_count,
 count(i.id) filter (where i.change_type='new')::int as new_count,
 count(i.id) filter (where i.change_type='unchanged')::int as unchanged_count,
 count(i.id) filter (where i.change_type='update')::int as update_count,
 count(i.id) filter (where i.change_type='conflict')::int as conflict_count,
 count(i.id) filter (where i.change_type='unmatched')::int as unmatched_count,
 count(i.id) filter (where i.change_type='possible_duplicate')::int as duplicate_count
from public.os_people_reconciliation_runs r left join public.os_people_reconciliation_items i on i.reconciliation_run_id=r.id group by r.id;
grant select on public.os_people_reconciliation_readiness to authenticated;
revoke all on public.os_people_reconciliation_readiness from anon;
