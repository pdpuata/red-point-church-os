create or replace view public.os_control_tower_attention with (security_invoker=true) as
select
  'task'::text as item_type,
  t.id as item_id,
  t.title,
  coalesce(t.description,'') as description,
  t.priority,
  t.status,
  t.due_at,
  t.created_at,
  w.key as workflow_key,
  w.name as workflow_name,
  t.entity_type,
  t.entity_id,
  t.owner_user_id,
  t.source,
  case when t.due_at is not null and t.due_at < now() and t.status not in ('completed','cancelled') then true else false end as overdue,
  null::text as decision_type,
  null::text as proposed_by
from public.os_tasks t
join public.os_workflow_runs r on r.id=t.workflow_run_id
join public.os_workflows w on w.id=r.workflow_id
where t.status not in ('completed','cancelled')
union all
select
  'decision'::text as item_type,
  d.id as item_id,
  initcap(replace(d.decision_type,'_',' ')) as title,
  coalesce(d.rationale,'Decision required') as description,
  'high'::text as priority,
  d.status,
  null::timestamptz as due_at,
  coalesce(d.decided_at, r.created_at) as created_at,
  w.key as workflow_key,
  w.name as workflow_name,
  null::text as entity_type,
  null::uuid as entity_id,
  d.approved_by as owner_user_id,
  d.proposed_by as source,
  false as overdue,
  d.decision_type,
  d.proposed_by
from public.os_decisions d
left join public.os_workflow_runs r on r.id=d.workflow_run_id
left join public.os_workflows w on w.id=r.workflow_id
where d.status in ('pending','proposed','requires_approval');

revoke all on public.os_control_tower_attention from anon, authenticated;
grant select on public.os_control_tower_attention to authenticated;

create or replace function public.os_resolve_task(p_task_id uuid, p_resolution jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare v_task public.os_tasks%rowtype;
begin
  if not public.is_admin() then raise exception 'admin_required'; end if;
  select * into v_task from public.os_tasks where id=p_task_id for update;
  if not found then raise exception 'task_not_found'; end if;
  update public.os_tasks set status='completed', completed_at=now(), resolution=coalesce(p_resolution,'{}'::jsonb) where id=p_task_id;
  insert into public.os_audit_events(actor_type,actor_user_id,action,entity_type,entity_id,before_data,after_data,evidence)
  values ('human',auth.uid(),'resolve_task','os_task',p_task_id,to_jsonb(v_task),to_jsonb((select t from public.os_tasks t where t.id=p_task_id)),jsonb_build_object('resolution',coalesce(p_resolution,'{}'::jsonb)));
  return jsonb_build_object('ok',true,'task_id',p_task_id,'status','completed');
end;
$$;
revoke all on function public.os_resolve_task(uuid,jsonb) from public;
grant execute on function public.os_resolve_task(uuid,jsonb) to authenticated;
