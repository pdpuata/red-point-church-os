create table if not exists public.os_service_timeline_definitions (
  stage_key text primary key, stage_name text not null, offset_days integer not null, anchor_time time not null,
  priority text not null default 'medium', description text not null, sort_order integer not null
);
insert into public.os_service_timeline_definitions(stage_key,stage_name,offset_days,anchor_time,priority,description,sort_order) values
('roster_planning','Roster planning',-21,'09:00','high','Roster should be actively planned and data gaps surfaced.',10),
('confirmation_risk','Confirmation risk',-14,'09:00','high','Assignments should be confirmed or escalated before the final week.',20),
('setlist_lock','Setlist deadline',-7,'09:00','high','Setlist should be proposed/locked and missing songs or items surfaced.',30),
('media_host','Media + host preparation',-5,'09:00','medium','Media and host preparation should be underway.',40),
('rehearsal_readiness','Rehearsal readiness',-3,'09:00','high','Outstanding rehearsal dependencies should be visible before practice.',50),
('sunday_gate','Sunday readiness gate',-1,'09:00','critical','The Sunday operating system should have a current readiness snapshot.',60),
('execution','Execution window',0,'00:00','critical','Service-day operational exceptions remain visible until resolved.',70),
('post_service','Post-service review',1,'09:00','medium','Capture operational outcomes and exceptions after the service.',80),
('learning','Learning capture',7,'09:00','low','Convert service evidence into institutional learning.',90)
on conflict(stage_key) do update set stage_name=excluded.stage_name,offset_days=excluded.offset_days,anchor_time=excluded.anchor_time,priority=excluded.priority,description=excluded.description,sort_order=excluded.sort_order;
create or replace view public.os_service_timeline with (security_invoker=true) as
with service_stages as (
 select s.id service_id,s.title,s.service_date,s.status service_status,d.stage_key,d.stage_name,d.offset_days,d.anchor_time,d.priority,d.description,d.sort_order,
 (((s.service_date+d.offset_days)+d.anchor_time) at time zone 'Africa/Johannesburg') due_at
 from public.music_services s cross join public.os_service_timeline_definitions d
), task_state as (
 select ss.*,t.id task_id,t.status task_status,t.completed_at,
 case when t.status in ('completed','resolved','cancelled') then 'completed' when now()<ss.due_at then 'future' when now()>=ss.due_at then 'overdue' else 'due' end state
 from service_stages ss left join public.os_tasks t on t.task_key='timeline:'||ss.service_id::text||':'||ss.stage_key
)
select service_id,title,service_date,service_status,stage_key,stage_name,due_at,priority,description,state,task_id,task_status,completed_at,sort_order,
greatest(0,floor(extract(epoch from (due_at-now()))/86400))::integer days_until_due from task_state;
grant select on public.os_service_timeline to authenticated; revoke all on public.os_service_timeline from anon;
create or replace function public.os_evaluate_service_timeline(p_service_id uuid) returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_now timestamptz:=now(); v_service public.music_services%rowtype; v_workflow_id uuid; v_run_id uuid; v_stage record; v_due_at timestamptz; v_task_id uuid; v_future integer:=0; v_active integer:=0; v_completed integer:=0; v_overdue integer:=0; v_trigger_key text;
begin
 if not public.is_admin() then return jsonb_build_object('ok',false,'reason','admin_required'); end if;
 select * into v_service from public.music_services where id=p_service_id; if not found then return jsonb_build_object('ok',false,'reason','service_not_found'); end if;
 select id into v_workflow_id from public.os_workflows where key='temporal_operations' limit 1;
 if v_workflow_id is null then insert into public.os_workflows(key,name,purpose,domain,trigger_type,automation_level,human_approval_required,enabled,version,definition,success_metrics)
 values('temporal_operations','Temporal Operations','Keep service operations aligned to time and surface exceptions before deadlines.','operations','manual','operational',true,true,1,jsonb_build_object('stages','os_service_timeline_definitions'),jsonb_build_object('target','deadlines surfaced before failure')) returning id into v_workflow_id; end if;
 v_trigger_key:='temporal:'||p_service_id::text||':'||to_char(v_now at time zone 'UTC','YYYY-MM-DD-HH24');
 select id into v_run_id from public.os_workflow_runs where trigger_key=v_trigger_key limit 1;
 if v_run_id is null then insert into public.os_workflow_runs(workflow_id,trigger_key,status,started_at,context) values(v_workflow_id,v_trigger_key,'running',v_now,jsonb_build_object('service_id',p_service_id)) returning id into v_run_id; end if;
 for v_stage in select * from public.os_service_timeline_definitions order by sort_order loop
  v_due_at:=(((v_service.service_date+v_stage.offset_days)+v_stage.anchor_time) at time zone 'Africa/Johannesburg');
  if v_due_at<=v_now then
   insert into public.os_tasks(workflow_run_id,entity_type,entity_id,title,description,priority,status,owner_user_id,due_at,source,resolution,task_key)
   values(v_run_id,'music_service',p_service_id,v_stage.stage_name,v_stage.description||' Service: '||coalesce(v_service.title,'Untitled')||'.',v_stage.priority,'pending',null,v_due_at,'temporal_operations','{}'::jsonb,'timeline:'||p_service_id::text||':'||v_stage.stage_key)
   on conflict (task_key) do update set workflow_run_id=excluded.workflow_run_id,due_at=excluded.due_at,description=excluded.description,priority=excluded.priority returning id into v_task_id;
  else v_future:=v_future+1; end if;
 end loop;
 select count(*) filter(where status in ('pending','open','in_progress')),count(*) filter(where status in ('pending','open','in_progress') and due_at<v_now),count(*) filter(where status in ('completed','resolved','cancelled')) into v_active,v_overdue,v_completed from public.os_tasks where workflow_run_id=v_run_id;
 update public.os_workflow_runs set status=case when v_overdue>0 then 'escalated' else 'completed' end,completed_at=v_now,output=jsonb_build_object('active_tasks',v_active,'overdue_tasks',v_overdue,'completed_tasks',v_completed,'future_stages',v_future) where id=v_run_id;
 insert into public.os_audit_events(event_type,entity_type,entity_id,payload) values('temporal_operations_evaluated','music_service',p_service_id,jsonb_build_object('run_id',v_run_id,'active_tasks',v_active,'overdue_tasks',v_overdue,'future_stages',v_future));
 return jsonb_build_object('ok',true,'service_id',p_service_id,'run_id',v_run_id,'active_tasks',v_active,'overdue_tasks',v_overdue,'completed_tasks',v_completed,'future_stages',v_future,'evaluated_at',v_now);
end; $$;
grant execute on function public.os_evaluate_service_timeline(uuid) to authenticated; revoke execute on function public.os_evaluate_service_timeline(uuid) from anon;
