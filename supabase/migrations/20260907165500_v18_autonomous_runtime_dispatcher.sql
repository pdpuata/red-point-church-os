-- Durable source of truth for the live runtime dispatcher.
create or replace function public.os_autonomous_runtime_tick()
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
declare t uuid; q record; r public.os_workflow_runs; existing_run uuid; checks jsonb; blockers integer; completed integer:=0; failed integer:=0; queued integer:=0; claimed integer:=0; discovered integer:=0; errs jsonb:='[]'::jsonb; svc record; sched record; wf_id uuid; task_title text; task_detail text; task_key_value text; horizon integer; service_limit integer; dispatch_limit integer; setlist_result jsonb;
begin
 insert into public.os_runtime_ticks default values returning id into t;
 horizon:=public.os_runtime_policy_int('runtime.service_horizon_days',7); service_limit:=public.os_runtime_policy_int('runtime.max_services',25); dispatch_limit:=public.os_runtime_policy_int('runtime.max_dispatches',10);
 for svc in select ms.id from public.music_services ms where ms.service_date between current_date and current_date+horizon order by ms.service_date limit service_limit loop
  discovered:=discovered+1;
  perform public.os_publish_event_internal('SERVICE_APPROACHING','music_service',svc.id,'autonomous_runtime','service-approaching:'||svc.id::text||':'||to_char(current_date,'YYYYMMDD'),jsonb_build_object('service_id',svc.id,'source','runtime'));
  begin
   select id into wf_id from public.os_workflows where key='sunday_readiness' and enabled=true limit 1;
   if wf_id is not null then insert into public.os_workflow_dispatch_queue(workflow_id,trigger_key,entity_type,entity_id,input_context) values(wf_id,'runtime:sunday_readiness:'||svc.id||':'||to_char(current_date,'YYYYMMDD'),'music_service',svc.id,jsonb_build_object('source','v18_runtime','service_id',svc.id)) on conflict(trigger_key) do nothing; end if;
   select id into wf_id from public.os_workflows where key='worship_roster' and enabled=true limit 1;
   if wf_id is not null then insert into public.os_workflow_dispatch_queue(workflow_id,trigger_key,entity_type,entity_id,input_context) values(wf_id,'runtime:worship_roster:'||svc.id||':'||to_char(current_date,'YYYYMMDD'),'music_service',svc.id,jsonb_build_object('source','v18_runtime','service_id',svc.id)) on conflict(trigger_key) do nothing; end if;
  exception when others then errs:=errs||jsonb_build_object('stage','service_discovery','service_id',svc.id,'error',sqlerrm); end;
 end loop;
 for sched in select ws.*,w.key workflow_key from public.os_workflow_schedules ws join public.os_workflows w on w.id=ws.workflow_id where ws.enabled and ws.next_due_at is not null and ws.next_due_at<=now() order by ws.next_due_at limit 25 loop
  begin update public.os_workflow_schedules set last_dispatch_at=now(),next_due_at=now()+interval '1 minute',updated_at=now() where id=sched.id; select id into wf_id from public.os_workflows where key=sched.workflow_key and enabled=true limit 1; if wf_id is not null then insert into public.os_workflow_dispatch_queue(workflow_id,trigger_key,entity_type,entity_id,input_context) values(wf_id,'schedule:'||sched.schedule_key||':'||to_char(now(),'YYYYMMDDHH24MI'),'system',sched.entity_id,coalesce(sched.input_context,'{}'::jsonb)) on conflict(trigger_key) do nothing; queued:=queued+1; end if; exception when others then errs:=errs||jsonb_build_object('stage','schedule','schedule_key',sched.schedule_key,'error',sqlerrm); end;
 end loop;
 for q in select d.*,w.key workflow_key from public.os_workflow_dispatch_queue d join public.os_workflows w on w.id=d.workflow_id where d.status='queued' and d.available_at<=now() order by d.created_at limit dispatch_limit for update of d skip locked loop
  claimed:=claimed+1; update public.os_workflow_dispatch_queue set status='claimed',claimed_at=now(),attempts=attempts+1 where id=q.id;
  begin
   select id into existing_run from public.os_workflow_runs where trigger_key=q.trigger_key limit 1;
   if existing_run is not null then select * into r from public.os_workflow_runs where id=existing_run; else insert into public.os_workflow_runs(workflow_id,trigger_source,entity_type,entity_id,status,started_at,input_context,trigger_key) values(q.workflow_id,coalesce(q.input_context->>'source','runtime_worker'),q.entity_type,q.entity_id,'running',now(),coalesce(q.input_context,'{}'::jsonb),q.trigger_key) returning * into r; end if;
   if q.workflow_key in ('sunday_readiness','worship_roster') and q.entity_id is not null then
    if q.workflow_key='sunday_readiness' then checks:=jsonb_build_object('checks',public.os_check_music_service(q.entity_id)); else select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into checks from public.os_check_roster(q.entity_id) x; checks:=jsonb_build_object('checks',checks); end if;
    blockers:=coalesce((select count(*) from jsonb_array_elements(checks->'checks') x where coalesce(x->>'status','')='fail'),0);
    update public.os_workflow_runs set status=case when blockers>0 then 'escalated' else 'completed' end,finished_at=now(),output=checks,verification=jsonb_build_object('runtime_worker',true,'verified_at',now()),human_intervention=(blockers>0) where id=r.id;
    perform public.os_evaluate_workflow_run_internal(r.id);
    if blockers>0 then for task_title,task_detail,task_key_value in select coalesce(x->>'label','Operational blocker'),coalesce(x->>'detail','Action required'),'runtime:'||q.trigger_key||':'||coalesce(x->>'check_key',md5(x::text)) from jsonb_array_elements(checks->'checks') x where coalesce(x->>'status','')='fail' loop if not exists(select 1 from public.os_tasks where task_key=task_key_value and status not in ('completed','cancelled')) then insert into public.os_tasks(workflow_run_id,entity_type,entity_id,title,description,priority,status,source,task_key) values(r.id,q.entity_type,q.entity_id,task_title,task_detail,'high','open','autonomous_runtime',task_key_value); end if; end loop; end if; completed:=completed+1;
   elsif q.workflow_key='setlist_operations' and q.entity_id is not null then
    setlist_result:=public.os_run_setlist_operations_agent_internal(q.entity_id);
    blockers:=case when coalesce((setlist_result->>'ok')::boolean,false) then coalesce(jsonb_array_length(setlist_result->'result'->'risks'),0) else 1 end;
    update public.os_workflow_runs set status=case when coalesce((setlist_result->>'ok')::boolean,false) then 'completed' else 'escalated' end,finished_at=now(),output=setlist_result,verification=jsonb_build_object('runtime_worker',true,'verified',true,'verified_at',now()),human_intervention=(blockers>0) where id=r.id;
    perform public.os_evaluate_workflow_run_internal(r.id); completed:=completed+1;
   else update public.os_workflow_runs set status='escalated',finished_at=now(),error=jsonb_build_object('reason','workflow_requires_handler','workflow_key',q.workflow_key),human_intervention=true where id=r.id; perform public.os_evaluate_workflow_run_internal(r.id); failed:=failed+1; end if;
   update public.os_workflow_dispatch_queue set status=case when q.workflow_key in ('sunday_readiness','worship_roster','setlist_operations') then 'completed' else 'failed' end,completed_at=now(),last_error=case when q.workflow_key in ('sunday_readiness','worship_roster','setlist_operations') then null else jsonb_build_object('reason','workflow_requires_handler') end where id=q.id;
  exception when others then failed:=failed+1; errs:=errs||jsonb_build_object('stage','dispatch','dispatch_id',q.id,'workflow_key',q.workflow_key,'error',sqlerrm); update public.os_workflow_dispatch_queue set status='failed',completed_at=now(),last_error=jsonb_build_object('error',sqlerrm) where id=q.id; end;
 end loop;
 perform public.os_refresh_institutional_memory_internal();
 update public.os_runtime_ticks set finished_at=now(),schedules_enqueued=queued,dispatches_claimed=claimed,dispatches_completed=completed,dispatches_failed=failed,errors=errs where id=t;
 return jsonb_build_object('ok',true,'tick_id',t,'services_discovered',discovered,'schedules_enqueued',queued,'dispatches_claimed',claimed,'dispatches_completed',completed,'dispatches_failed',failed,'errors',errs);
end $$;
revoke all on function public.os_autonomous_runtime_tick() from public,anon,authenticated;
