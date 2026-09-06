-- v7.5.27 — People Reconciliation Runtime
-- Production already contains the v7.5.27 staging schema. This migration adds the
-- executable deterministic reconciliation contract without granting mutation authority.

create table if not exists public.os_people_field_mapping_proposals (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.os_people_sources(id) on delete cascade,
  source_field text not null,
  target_field text not null,
  confidence numeric(5,4) not null default 0,
  reasoning text,
  status text not null default 'proposed' check (status in ('proposed','accepted','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_id,source_field,target_field)
);

alter table public.os_people_field_mapping_proposals enable row level security;
drop policy if exists os_people_field_mapping_proposals_admin on public.os_people_field_mapping_proposals;
create policy os_people_field_mapping_proposals_admin on public.os_people_field_mapping_proposals for all using (is_admin()) with check (is_admin());
grant select,insert,update,delete on public.os_people_field_mapping_proposals to authenticated;
revoke all on public.os_people_field_mapping_proposals from anon,public;

create or replace function public.os_reconcile_people_import_run(p_import_run_id uuid)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare
  v_source_id uuid; v_previous_run uuid; v_recon_id uuid; v_row record; v_prev record;
  v_email text; v_name text; v_user_id uuid; v_match_count int; v_method text; v_conf numeric(5,4);
  v_change text; v_reasons jsonb; v_diffs jsonb;
  v_new int:=0; v_unchanged int:=0; v_update int:=0; v_conflict int:=0; v_unmatched int:=0; v_duplicate int:=0;
begin
  if not is_admin() then return jsonb_build_object('ok',false,'reason','admin_required'); end if;
  select source_id into v_source_id from os_people_import_runs where id=p_import_run_id;
  if v_source_id is null then return jsonb_build_object('ok',false,'reason','import_run_not_found'); end if;

  select id into v_previous_run from os_people_import_runs
    where source_id=v_source_id and id<>p_import_run_id
      and created_at < (select created_at from os_people_import_runs where id=p_import_run_id)
    order by created_at desc limit 1;

  insert into os_people_reconciliation_runs(import_run_id,previous_import_run_id,status,summary,created_by)
  values(p_import_run_id,v_previous_run,'ready',jsonb_build_object('identity_resolution','deterministic','mutation_authority','none'),auth.uid())
  on conflict (import_run_id) do update set previous_import_run_id=excluded.previous_import_run_id,status='ready',summary=excluded.summary,completed_at=null;
  select id into v_recon_id from os_people_reconciliation_runs where import_run_id=p_import_run_id;
  delete from os_people_reconciliation_items where reconciliation_run_id=v_recon_id;

  for v_row in select * from os_people_import_rows where import_run_id=p_import_run_id order by row_number loop
    v_email:=lower(nullif(trim(coalesce(v_row.normalized_data->>'email',v_row.raw_data->>'email')),''));
    v_name:=lower(regexp_replace(trim(coalesce(v_row.normalized_data->>'display_name',v_row.raw_data->>'display_name',v_row.raw_data->>'name','')),'\s+',' ','g'));
    v_user_id:=case when coalesce(v_row.normalized_data->>'user_id',v_row.raw_data->>'user_id','') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then (coalesce(v_row.normalized_data->>'user_id',v_row.raw_data->>'user_id'))::uuid else null end;
    v_method:=null; v_conf:=0; v_match_count:=0; v_change:=null; v_reasons:='[]'::jsonb; v_diffs:='[]'::jsonb; v_prev:=null;

    if v_user_id is not null and exists(select 1 from profiles where user_id=v_user_id) then v_method:='user_id'; v_conf:=1.0;
    elsif v_email is not null then
      select count(*),min(user_id) into v_match_count,v_user_id from profiles where lower(email)=v_email;
      if v_match_count=1 then v_method:='email'; v_conf:=0.99; elsif v_match_count>1 then v_method:='email_conflict'; v_conf:=0.5; end if;
    end if;
    if v_method is null and v_name<>'' then
      select count(*),min(user_id) into v_match_count,v_user_id from profiles where lower(regexp_replace(trim(display_name),'\s+',' ','g'))=v_name;
      if v_match_count=1 then v_method:='display_name'; v_conf:=0.92; elsif v_match_count>1 then v_method:='display_name_conflict'; v_conf:=0.5; end if;
    end if;

    if (v_email is not null and (select count(*) from os_people_import_rows p where p.import_run_id=p_import_run_id and lower(coalesce(p.normalized_data->>'email',p.raw_data->>'email'))=v_email)>1)
       or (v_email is null and v_name<>'' and (select count(*) from os_people_import_rows p where p.import_run_id=p_import_run_id and lower(regexp_replace(trim(coalesce(p.normalized_data->>'display_name',p.raw_data->>'display_name',p.raw_data->>'name','')),'\s+',' ','g'))=v_name)>1) then
      v_change:='possible_duplicate'; v_duplicate:=v_duplicate+1; v_reasons:=v_reasons||jsonb_build_array('multiple current import rows share the same identity field');
    elsif v_method in ('email_conflict','display_name_conflict') then
      v_change:='conflict'; v_conflict:=v_conflict+1; v_reasons:=v_reasons||jsonb_build_array('multiple profiles match the supplied identity');
    elsif v_method is null then
      v_change:='unmatched'; v_unmatched:=v_unmatched+1; v_reasons:=v_reasons||jsonb_build_array('no deterministic identity match found');
    else
      if v_previous_run is not null then
        select * into v_prev from os_people_import_rows p
        where p.import_run_id=v_previous_run and ((v_row.external_key is not null and p.external_key=v_row.external_key) or (v_email is not null and lower(coalesce(p.normalized_data->>'email',p.raw_data->>'email'))=v_email) or (v_user_id is not null and p.matched_user_id=v_user_id))
        order by p.row_number limit 1;
      end if;
      if v_prev.id is null then v_change:='new'; v_new:=v_new+1;
      else
        if coalesce(v_row.normalized_data->>'display_name',v_row.raw_data->>'display_name',v_row.raw_data->>'name','') <> coalesce(v_prev.normalized_data->>'display_name',v_prev.raw_data->>'display_name',v_prev.raw_data->>'name','') then v_diffs:=v_diffs||jsonb_build_array(jsonb_build_object('field','display_name','before',coalesce(v_prev.normalized_data->>'display_name',v_prev.raw_data->>'display_name',v_prev.raw_data->>'name',''),'after',coalesce(v_row.normalized_data->>'display_name',v_row.raw_data->>'display_name',v_row.raw_data->>'name',''))); end if;
        if coalesce(v_row.normalized_data->>'email',v_row.raw_data->>'email','') <> coalesce(v_prev.normalized_data->>'email',v_prev.raw_data->>'email','') then v_diffs:=v_diffs||jsonb_build_array(jsonb_build_object('field','email','before',coalesce(v_prev.normalized_data->>'email',v_prev.raw_data->>'email',''),'after',coalesce(v_row.normalized_data->>'email',v_row.raw_data->>'email',''))); end if;
        if jsonb_array_length(v_diffs)=0 then v_change:='unchanged'; v_unchanged:=v_unchanged+1; else v_change:='update'; v_update:=v_update+1; end if;
      end if;
    end if;

    update os_people_import_rows set row_fingerprint=encode(extensions.digest(convert_to(coalesce(normalized_data,raw_data)::text,'utf8'),'sha256'),'hex'),previous_row_id=v_prev.id,change_type=v_change,identity_confidence=v_conf,reconciliation_status=case when v_change in ('conflict','unmatched','possible_duplicate') then 'needs_review' else 'ready' end,reconciliation_reasons=v_reasons,matched_user_id=coalesce(v_user_id,matched_user_id),match_method=coalesce(v_method,match_method),match_confidence=case when v_conf>0 then v_conf else match_confidence end,updated_at=now() where id=v_row.id;

    insert into os_people_reconciliation_items(reconciliation_run_id,import_row_id,previous_row_id,change_type,identity_confidence,field_diffs,reasons,resolution_status)
    values(v_recon_id,v_row.id,v_prev.id,v_change,v_conf,v_diffs,v_reasons,case when v_change in ('conflict','unmatched','possible_duplicate') then 'pending' else 'pending' end);
  end loop;

  update os_people_reconciliation_runs set status=case when v_conflict+v_unmatched+v_duplicate>0 then 'needs_review' else 'ready' end,summary=jsonb_build_object('new',v_new,'unchanged',v_unchanged,'update',v_update,'conflict',v_conflict,'unmatched',v_unmatched,'possible_duplicate',v_duplicate,'identity_resolution','deterministic','mutation_authority','none','activation_path','os_prepare_people_activation -> os_apply_people_activation'),completed_at=now() where id=v_recon_id;
  insert into os_audit_events(event_type,entity_type,entity_id,metadata) values('people_import_reconciled','people_reconciliation_run',v_recon_id,jsonb_build_object('import_run_id',p_import_run_id,'new',v_new,'unchanged',v_unchanged,'update',v_update,'conflict',v_conflict,'unmatched',v_unmatched,'duplicate',v_duplicate));
  return jsonb_build_object('ok',true,'reconciliation_run_id',v_recon_id,'previous_import_run_id',v_previous_run,'new',v_new,'unchanged',v_unchanged,'update',v_update,'conflict',v_conflict,'unmatched',v_unmatched,'duplicate',v_duplicate);
end; $$;

grant execute on function public.os_reconcile_people_import_run(uuid) to authenticated;
revoke execute on function public.os_reconcile_people_import_run(uuid) from anon,public;

create or replace function public.os_resolve_people_reconciliation_item(p_item_id uuid,p_resolution text,p_notes text default null)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_recon uuid; v_row uuid;
begin
  if not is_admin() then return jsonb_build_object('ok',false,'reason','admin_required'); end if;
  if p_resolution not in ('approved','rejected','deferred') then return jsonb_build_object('ok',false,'reason','invalid_resolution'); end if;
  select reconciliation_run_id,import_row_id into v_recon,v_row from os_people_reconciliation_items where id=p_item_id;
  if v_recon is null then return jsonb_build_object('ok',false,'reason','item_not_found'); end if;
  update os_people_reconciliation_items set resolution_status=p_resolution,resolved_by=auth.uid(),resolved_at=now() where id=p_item_id;
  update os_people_import_rows set reconciliation_status=case when p_resolution='approved' then 'approved' when p_resolution='rejected' then 'rejected' else 'needs_review' end,updated_at=now() where id=v_row;
  insert into os_audit_events(event_type,entity_type,entity_id,metadata) values('people_reconciliation_resolved','people_reconciliation_item',p_item_id,jsonb_build_object('resolution',p_resolution,'notes',p_notes,'reconciliation_run_id',v_recon,'import_row_id',v_row));
  return jsonb_build_object('ok',true,'item_id',p_item_id,'resolution',p_resolution);
end; $$;
grant execute on function public.os_resolve_people_reconciliation_item(uuid,text,text) to authenticated;
revoke execute on function public.os_resolve_people_reconciliation_item(uuid,text,text) from anon,public;


create or replace view public.os_people_reconciliation_inbox
with (security_invoker=true) as
select ir.id as import_run_id, s.source_key, s.display_name as source_name, ir.status as import_status,
       ir.row_count, ir.matched_count, ir.unmatched_count as source_unmatched_count, ir.ambiguous_count as source_ambiguous_count, ir.error_count as source_error_count, ir.created_at,
       rr.id as reconciliation_run_id, rr.status as reconciliation_status, rr.summary,
       coalesce(count(ri.id),0)::int as item_count,
       coalesce(count(ri.id) filter (where ri.resolution_status='pending'),0)::int as pending_count,
       coalesce(count(ri.id) filter (where ri.change_type='new'),0)::int as new_count,
       coalesce(count(ri.id) filter (where ri.change_type='unchanged'),0)::int as unchanged_count,
       coalesce(count(ri.id) filter (where ri.change_type='update'),0)::int as update_count,
       coalesce(count(ri.id) filter (where ri.change_type='conflict'),0)::int as conflict_count,
       coalesce(count(ri.id) filter (where ri.change_type='unmatched'),0)::int as reconciliation_unmatched_count,
       coalesce(count(ri.id) filter (where ri.change_type='possible_duplicate'),0)::int as duplicate_count
from public.os_people_import_runs ir
join public.os_people_sources s on s.id=ir.source_id
left join public.os_people_reconciliation_runs rr on rr.import_run_id=ir.id
left join public.os_people_reconciliation_items ri on ri.reconciliation_run_id=rr.id
group by ir.id,s.source_key,s.display_name,ir.status,ir.row_count,ir.matched_count,ir.unmatched_count,ir.ambiguous_count,ir.error_count,ir.created_at,rr.id,rr.status,rr.summary;
grant select on public.os_people_reconciliation_inbox to authenticated;
revoke all on public.os_people_reconciliation_inbox from anon;
