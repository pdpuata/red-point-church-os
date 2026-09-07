create or replace function public.os_plan_roster(p_service_id uuid)
returns jsonb
language plpgsql
set search_path = public
as $function$
declare
  svc public.music_services%rowtype;
  result jsonb;
begin
  select * into svc from public.music_services where id = p_service_id;
  if not found then return jsonb_build_object('ok',false,'reason','service_not_found','service_id',p_service_id); end if;
  if not (public.is_admin() or public.is_music_leader()) then return jsonb_build_object('ok',false,'reason','authorization_required'); end if;
  if svc.band_id is null then return jsonb_build_object('ok',true,'service_id',p_service_id,'band_id',null,'candidate_count',0,'candidates',jsonb_build_array(),'human_approval_required',true,'data_gaps',jsonb_build_array('band_not_assigned')); end if;
  with person_base as (
    select p.id as person_id,p.display_name,p.linked_user_id,bool_or(r.is_leader) as is_leader,string_agg(distinct r.role, ', ' order by r.role) as roles,coalesce(av.status,'available') as availability,coalesce(rc.recent_service_count,0) as recent_service_count,
      case when bool_or(r.is_leader) then 20 else 0 end + case when coalesce(av.status,'available')='unavailable' then -100 when coalesce(av.status,'available')='tentative' then -10 else 0 end + coalesce(rc.recent_service_count,0)*-3 as score,
      array_remove(array[case when bool_or(r.is_leader) then 'Band leader' end,case when coalesce(av.status,'available')='unavailable' then 'Marked unavailable' when coalesce(av.status,'available')='tentative' then 'Marked tentative' end,case when coalesce(rc.recent_service_count,0)>0 then 'Served recently' end,case when p.linked_user_id is not null then 'Linked to auth user' end],null) as reason_array
    from public.music_person_band_roles r join public.music_people p on p.id=r.person_id
    left join public.music_service_availability av on av.service_id=p_service_id and av.user_id=p.linked_user_id
    left join lateral (select count(*)::int recent_service_count from public.service_assignments x join public.music_services ms on ms.id=x.service_id where x.person_id=p.id and ms.service_date >= svc.service_date-interval '8 weeks' and ms.service_date < svc.service_date and x.assignment_status='active') rc on true
    where r.band_id=svc.band_id and p.status='active'
    group by p.id,p.display_name,p.linked_user_id,av.status,rc.recent_service_count
  )
  select jsonb_build_object('ok',true,'service_id',p_service_id,'band_id',svc.band_id,'candidate_count',count(*),'candidates',coalesce(jsonb_agg(jsonb_build_object('person_id',person_id,'user_id',linked_user_id,'display_name',display_name,'score',score,'availability',availability,'recent_service_count',recent_service_count,'responsibility',roles,'roles',roles,'is_leader',is_leader,'reasons',to_jsonb(reason_array)) order by score desc,display_name),'[]'::jsonb),'human_approval_required',true,'data_gaps',case when count(*)=0 then jsonb_build_array('band_has_no_members') else jsonb_build_array() end) into result
  from person_base;
  return result;
end
$function$;

create or replace function public.os_evaluate_service_timeline(p_service_id uuid)
returns jsonb language plpgsql set search_path=public as $function$
declare v_now timestamptz:=now(); v_service public.music_services%rowtype; v_workflow_id uuid; v_run_id uuid; v_stage record; v_due_at timestamptz; v_task_id uuid; v_completed integer:=0; v_active integer:=0; v_future integer:=0; v_overdue integer:=0; v_trigger_key text;
begin
 if not public.is_admin() then return jsonb_build_object('ok',false,'reason','admin_required'); end if;
 select * into v_service from public.music_services where id=p_service_id; if not found then return jsonb_build_object('ok',false,'reason','service_not_found'); end if;
 select id into v_workflow_id from public.os_workflows where key='temporal_operations' limit 1;
 if v_workflow_id is null then insert into public.os_workflows(key,name,purpose,domain,trigger_type,automation_level,human_approval_required,enabled,version,definition,success_metrics) values('temporal_operations','Temporal Operations','Keep service operations aligned to time and surface exceptions before deadlines.','operations','manual','operational',true,true,1,jsonb_build_object('stages','os_service_timeline_definitions'),jsonb_build_object('target','deadlines surfaced before failure')) returning id into v_workflow_id; end if;
 v_trigger_key:='temporal:'||p_service_id::text||':'||to_char(v_now at time zone 'UTC','YYYY-MM-DD-HH24'); select id into v_run_id from public.os_workflow_runs where trigger_key=v_trigger_key limit 1;
 if v_run_id is null then insert into public.os_workflow_runs(workflow_id,trigger_source,trigger_key,entity_type,entity_id,status,started_at,input_context) values(v_workflow_id,'human',v_trigger_key,'music_service',p_service_id,'running',v_now,jsonb_build_object('service_id',p_service_id)) returning id into v_run_id; end if;
 for v_stage in select * from public.os_service_timeline_definitions order by sort_order loop
  v_due_at:=(((v_service.service_date+v_stage.offset_days)+v_stage.anchor_time) at time zone 'Africa/Johannesburg');
  if v_due_at<=v_now then
   insert into public.os_tasks(workflow_run_id,entity_type,entity_id,title,description,priority,status,owner_user_id,due_at,source,resolution,task_key) values(v_run_id,'music_service',p_service_id,v_stage.stage_name,v_stage.description||' Service: '||coalesce(v_service.title,'Untitled')||'.',v_stage.priority,'pending',null,v_due_at,'temporal_operations','{}'::jsonb,'timeline:'||p_service_id::text||':'||v_stage.stage_key) on conflict (task_key) where task_key is not null do update set workflow_run_id=excluded.workflow_run_id,due_at=excluded.due_at,description=excluded.description,priority=excluded.priority returning id into v_task_id;
  else v_future:=v_future+1; end if;
 end loop;
 select count(*) filter(where status in('pending','open','in_progress')),count(*) filter(where status in('pending','open','in_progress') and due_at<v_now),count(*) filter(where status in('completed','resolved','cancelled')) into v_active,v_overdue,v_completed from public.os_tasks where workflow_run_id=v_run_id;
 update public.os_workflow_runs set status=case when v_overdue>0 then 'escalated' else 'completed' end,finished_at=v_now,output=jsonb_build_object('active_tasks',v_active,'overdue_tasks',v_overdue,'completed_tasks',v_completed,'future_stages',v_future) where id=v_run_id;
 insert into public.os_audit_events(actor_type,actor_user_id,action,entity_type,entity_id,event_type,payload,summary) values('human',auth.uid(),'temporal_operations_evaluated','music_service',p_service_id,'temporal_operations_evaluated',jsonb_build_object('run_id',v_run_id,'active_tasks',v_active,'overdue_tasks',v_overdue,'future_stages',v_future),'Temporal operations evaluated');
 return jsonb_build_object('ok',true,'service_id',p_service_id,'run_id',v_run_id,'active_tasks',v_active,'overdue_tasks',v_overdue,'completed_tasks',v_completed,'future_stages',v_future,'evaluated_at',v_now);
end;$function$;