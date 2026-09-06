create table if not exists public.os_people_sources (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  source_type text not null check (source_type in ('csv','google_sheets','planning_center','manual','api')),
  display_name text not null,
  status text not null default 'planned' check (status in ('planned','configured','active','paused','retired')),
  owner text,
  config jsonb not null default '{}'::jsonb,
  last_import_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.os_people_import_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.os_people_sources(id) on delete restrict,
  status text not null default 'received' check (status in ('received','validating','normalized','ready_for_review','approved','applied','rejected','failed')),
  source_reference text,
  row_count integer not null default 0,
  matched_count integer not null default 0,
  unmatched_count integer not null default 0,
  ambiguous_count integer not null default 0,
  error_count integer not null default 0,
  summary jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.os_people_import_rows (
  id uuid primary key default gen_random_uuid(),
  import_run_id uuid not null references public.os_people_import_runs(id) on delete cascade,
  row_number integer not null,
  external_key text,
  raw_data jsonb not null default '{}'::jsonb,
  normalized_data jsonb,
  matched_user_id uuid references auth.users(id),
  match_method text,
  match_confidence numeric(5,4),
  status text not null default 'received' check (status in ('received','normalized','matched','ambiguous','unmatched','approved','rejected','applied','error')),
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(import_run_id,row_number)
);

create table if not exists public.os_people_source_mappings (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.os_people_sources(id) on delete cascade,
  source_field text not null,
  target_field text not null,
  transform text,
  required boolean not null default false,
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  unique(source_id,source_field,target_field)
);

alter table public.os_people_sources enable row level security;
alter table public.os_people_import_runs enable row level security;
alter table public.os_people_import_rows enable row level security;
alter table public.os_people_source_mappings enable row level security;

drop policy if exists os_people_sources_admin on public.os_people_sources;
create policy os_people_sources_admin on public.os_people_sources for all using (is_admin()) with check (is_admin());
drop policy if exists os_people_import_runs_admin on public.os_people_import_runs;
create policy os_people_import_runs_admin on public.os_people_import_runs for all using (is_admin()) with check (is_admin());
drop policy if exists os_people_import_rows_admin on public.os_people_import_rows;
create policy os_people_import_rows_admin on public.os_people_import_rows for all using (is_admin()) with check (is_admin());
drop policy if exists os_people_source_mappings_admin on public.os_people_source_mappings;
create policy os_people_source_mappings_admin on public.os_people_source_mappings for all using (is_admin()) with check (is_admin());

create or replace view public.os_people_ingestion_readiness
with (security_invoker=true) as
select
  s.id,
  s.source_key,
  s.source_type,
  s.display_name,
  s.status,
  count(r.id)::int as import_runs,
  max(r.created_at) as last_import_attempt,
  coalesce(sum(r.row_count),0)::int as rows_received,
  coalesce(sum(r.matched_count),0)::int as rows_matched,
  coalesce(sum(r.unmatched_count),0)::int as rows_unmatched,
  coalesce(sum(r.ambiguous_count),0)::int as rows_ambiguous,
  count(m.id)::int as mappings
from public.os_people_sources s
left join public.os_people_import_runs r on r.source_id=s.id
left join public.os_people_source_mappings m on m.source_id=s.id
group by s.id,s.source_key,s.source_type,s.display_name,s.status;

grant select on public.os_people_ingestion_readiness to authenticated;
revoke all on public.os_people_ingestion_readiness from anon;

grant select,insert,update,delete on public.os_people_sources to authenticated;
grant select,insert,update,delete on public.os_people_import_runs to authenticated;
grant select,insert,update,delete on public.os_people_import_rows to authenticated;
grant select,insert,update,delete on public.os_people_source_mappings to authenticated;

create or replace function public.os_register_people_source(
  p_source_key text,
  p_source_type text,
  p_display_name text,
  p_owner text default null,
  p_config jsonb default '{}'::jsonb
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_id uuid;
begin
  if not is_admin() then return jsonb_build_object('ok',false,'reason','admin_required'); end if;
  if nullif(trim(p_source_key),'') is null or nullif(trim(p_display_name),'') is null then
    return jsonb_build_object('ok',false,'reason','source_key_and_display_name_required');
  end if;
  insert into os_people_sources(source_key,source_type,display_name,owner,config,status)
  values(lower(trim(p_source_key)),p_source_type,trim(p_display_name),nullif(trim(p_owner),''),coalesce(p_config,'{}'::jsonb),'planned')
  on conflict(source_key) do update set source_type=excluded.source_type,display_name=excluded.display_name,owner=excluded.owner,config=excluded.config,updated_at=now()
  returning id into v_id;
  insert into os_audit_events(event_type,entity_type,entity_id,metadata)
  values('people_source_registered','people_source',v_id,jsonb_build_object('source_key',p_source_key,'source_type',p_source_type));
  return jsonb_build_object('ok',true,'source_id',v_id);
end; $$;

grant execute on function public.os_register_people_source(text,text,text,text,jsonb) to authenticated;
revoke execute on function public.os_register_people_source(text,text,text,text,jsonb) from anon,public;

create or replace function public.os_create_people_import_run(
  p_source_key text,
  p_source_reference text default null,
  p_row_count integer default 0
) returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_source uuid; v_run uuid;
begin
  if not is_admin() then return jsonb_build_object('ok',false,'reason','admin_required'); end if;
  select id into v_source from os_people_sources where source_key=lower(trim(p_source_key)) limit 1;
  if v_source is null then return jsonb_build_object('ok',false,'reason','source_not_registered'); end if;
  insert into os_people_import_runs(source_id,source_reference,row_count,status,created_by)
  values(v_source,nullif(trim(p_source_reference),''),greatest(0,coalesce(p_row_count,0)),'received',auth.uid()) returning id into v_run;
  update os_people_sources set last_import_at=now(),updated_at=now() where id=v_source;
  insert into os_audit_events(event_type,entity_type,entity_id,metadata)
  values('people_import_run_created','people_import_run',v_run,jsonb_build_object('source_key',p_source_key,'row_count',p_row_count));
  return jsonb_build_object('ok',true,'run_id',v_run,'source_id',v_source);
end; $$;

grant execute on function public.os_create_people_import_run(text,text,integer) to authenticated;
revoke execute on function public.os_create_people_import_run(text,text,integer) from anon,public;

insert into public.os_people_sources(source_key,source_type,display_name,status,config)
values
 ('planning_center','planning_center','Planning Center People','planned','{"purpose":"future controlled people ingestion; credentials/config intentionally absent"}'::jsonb),
 ('google_sheets','google_sheets','Google Sheets People/Roster','planned','{"purpose":"future controlled spreadsheet ingestion; credentials/config intentionally absent"}'::jsonb),
 ('csv_upload','csv','CSV Upload','active','{"purpose":"manual controlled import"}'::jsonb),
 ('manual_entry','manual','Manual Entry','active','{"purpose":"small exception corrections"}'::jsonb)
on conflict(source_key) do nothing;
