-- Phase 2: event-driven autonomous runtime.
-- The live database has been upgraded with the same definitions in this migration.

create or replace function public.os_queue_workflow_dispatch_internal(p_workflow_key text,p_trigger_key text,p_entity_type text default null,p_entity_id uuid default null,p_input_context jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp
as $$ declare v_workflow uuid; v_id uuid; begin
 if nullif(trim(p_workflow_key),'') is null or nullif(trim(p_trigger_key),'') is null then raise exception 'workflow_and_trigger_required'; end if;
 select id into v_workflow from public.os_workflows where key=p_workflow_key and enabled=true limit 1;
 if v_workflow is null then raise exception 'workflow_not_enabled'; end if;
 insert into public.os_workflow_dispatch_queue(workflow_id,trigger_key,entity_type,entity_id,input_context)
 values(v_workflow,p_trigger_key,p_entity_type,p_entity_id,coalesce(p_input_context,'{}'::jsonb))
 on conflict(trigger_key) do update set input_context=excluded.input_context returning id into v_id; return v_id;
end $$;
revoke all on function public.os_queue_workflow_dispatch_internal(text,text,text,uuid,jsonb) from public,anon,authenticated;

create or replace function public.os_publish_event_internal(p_event_key text,p_entity_type text,p_entity_id uuid,p_source text,p_idempotency_key text,p_payload jsonb,p_correlation_id text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$ declare e public.os_events; s record; d public.os_event_deliveries; q uuid; existing uuid; deliveries int:=0;
begin
 if nullif(trim(p_event_key),'') is null or nullif(trim(p_idempotency_key),'') is null then return jsonb_build_object('ok',false,'reason','event_identity_required'); end if;
 select id into existing from public.os_events where idempotency_key=p_idempotency_key limit 1;
 if existing is not null then return jsonb_build_object('ok',true,'event_id',existing,'idempotent',true); end if;
 insert into public.os_events(event_key,entity_type,entity_id,source,idempotency_key,payload,correlation_id) values(p_event_key,p_entity_type,p_entity_id,coalesce(p_source,'database'),p_idempotency_key,coalesce(p_payload,'{}'::jsonb),p_correlation_id) returning * into e;
 for s in select * from public.os_event_subscriptions where event_key=p_event_key and enabled loop
  insert into public.os_event_deliveries(event_id,subscription_id,status) values(e.id,s.id,case when s.action_mode='observe' then 'ignored' else 'queued' end) on conflict(event_id,subscription_id) do nothing returning * into d;
  deliveries:=deliveries+1;
  if s.action_mode='queue' and s.workflow_id is not null and d.id is not null then
    q:=public.os_queue_workflow_dispatch_internal((select key from public.os_workflows where id=s.workflow_id),'event:'||e.id::text||':'||s.id::text,coalesce(p_entity_type,'event'),p_entity_id,jsonb_build_object('event_id',e.id,'event_key',p_event_key,'payload',coalesce(p_payload,'{}'::jsonb)));
    update public.os_event_deliveries set workflow_dispatch_id=q where id=d.id;
  end if;
 end loop;
 return jsonb_build_object('ok',true,'event_id',e.id,'idempotent',false,'deliveries',deliveries);
end $$;
revoke all on function public.os_publish_event_internal(text,text,uuid,text,text,jsonb,text) from public,anon,authenticated;

create or replace function public.os_emit_service_event() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare k text; payload jsonb; begin
 if tg_op='INSERT' then k:='SERVICE_CREATED'; else k:='SERVICE_CHANGED'; end if;
 payload:=jsonb_build_object('service_id',new.id,'service_date',new.service_date,'title',new.title,'status',new.status,'band_id',new.band_id);
 perform public.os_publish_event_internal(k,'music_service',new.id,'database_trigger','music-service:'||new.id::text||':'||case when tg_op='INSERT' then 'created' else 'changed-'||new.updated_at::text end,payload); return new; end $$;
create or replace function public.os_emit_assignment_event() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin perform public.os_publish_event_internal('ROSTER_CHANGED','service_assignment',new.id,'database_trigger','assignment:'||new.id::text||':'||coalesce(new.updated_at::text,new.created_at::text),jsonb_build_object('assignment_id',new.id,'service_id',new.service_id,'person_id',new.person_id,'responsibility',new.responsibility,'status',new.assignment_status)); return new; end $$;
drop trigger if exists os_emit_service_event_after_write on public.music_services;
create trigger os_emit_service_event_after_write after insert or update on public.music_services for each row execute function public.os_emit_service_event();
drop trigger if exists os_emit_assignment_event_after_write on public.service_assignments;
create trigger os_emit_assignment_event_after_write after insert or update on public.service_assignments for each row execute function public.os_emit_assignment_event();

insert into public.os_event_subscriptions(event_key,workflow_id,enabled,filter,action_mode)
select 'ROSTER_CHANGED',id,true,'{}'::jsonb,'queue' from public.os_workflows where key='sunday_readiness' and enabled and not exists(select 1 from public.os_event_subscriptions s where s.event_key='ROSTER_CHANGED' and s.workflow_id=public.os_workflows.id);
insert into public.os_event_subscriptions(event_key,workflow_id,enabled,filter,action_mode)
select 'ROSTER_CHANGED',id,true,'{}'::jsonb,'queue' from public.os_workflows where key='worship_roster' and enabled and not exists(select 1 from public.os_event_subscriptions s where s.event_key='ROSTER_CHANGED' and s.workflow_id=public.os_workflows.id);
insert into public.os_event_subscriptions(event_key,workflow_id,enabled,filter,action_mode)
select 'SERVICE_CREATED',id,true,'{}'::jsonb,'queue' from public.os_workflows where key='setlist_operations' and enabled and not exists(select 1 from public.os_event_subscriptions s where s.event_key='SERVICE_CREATED' and s.workflow_id=public.os_workflows.id);
insert into public.os_event_subscriptions(event_key,workflow_id,enabled,filter,action_mode)
select 'SERVICE_APPROACHING',id,true,'{}'::jsonb,'queue' from public.os_workflows where key='setlist_operations' and enabled and not exists(select 1 from public.os_event_subscriptions s where s.event_key='SERVICE_APPROACHING' and s.workflow_id=public.os_workflows.id);

create or replace function public.os_evaluate_workflow_run_internal(p_run_id uuid) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare r record; eval_id uuid; outcome text; score numeric; begin
 select wr.*,w.key into r from public.os_workflow_runs wr join public.os_workflows w on w.id=wr.workflow_id where wr.id=p_run_id; if not found then return null; end if;
 if r.status='completed' then outcome:='success'; score:=1; elsif r.status='escalated' then outcome:='escalated'; score:=0.5; else outcome:='failure'; score:=0; end if;
 insert into public.os_workflow_evaluations(workflow_run_id,workflow_key,outcome,score,human_intervention,verification_quality,signals) values(r.id,r.key,outcome,score,coalesce(r.human_intervention,false),case when r.verification is not null then 'verified' else 'unverified' end,jsonb_build_object('trigger_source',r.trigger_source,'error',r.error,'escalation',r.escalation)) on conflict(workflow_run_id) do update set outcome=excluded.outcome,score=excluded.score,human_intervention=excluded.human_intervention,verification_quality=excluded.verification_quality,signals=excluded.signals;
 select id into eval_id from public.os_workflow_evaluations where workflow_run_id=r.id; return eval_id; end $$;
revoke all on function public.os_evaluate_workflow_run_internal(uuid) from public,anon,authenticated;

-- os_autonomous_runtime_tick() is the live dispatcher for sunday_readiness, worship_roster and setlist_operations. It uses the internal evaluator so cron execution is not dependent on a user JWT.
