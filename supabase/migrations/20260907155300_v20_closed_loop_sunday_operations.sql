-- v20: closed-loop Sunday operations worker.
-- The autonomous runtime already dispatches the deterministic readiness, roster and setlist handlers.
-- This migration adds the internal control-plane worker that continuously evaluates the complete
-- Sunday operating loop without requiring a user JWT, while keeping the public/manual runner admin-gated.

create or replace function public.os_run_sunday_operating_loop_internal(p_service_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  svc record;
  wf record;
  run_id uuid;
  existing_id uuid;
  roster_count int := 0;
  pending_count int := 0;
  declined_count int := 0;
  setlist_count int := 0;
  item_count int := 0;
  comm_pending int := 0;
  comm_failed int := 0;
  blocker_count int := 0;
  warning_count int := 0;
  checks jsonb := '[]'::jsonb;
  trigger_key_value text := 'sunday_operating_loop:runtime:' || p_service_id;
begin
  select * into svc from public.music_services where id = p_service_id;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'service_not_found');
  end if;

  select owr.id into existing_id
  from public.os_workflow_runs owr
  where owr.trigger_key = trigger_key_value
  limit 1;
  if existing_id is not null then
    return jsonb_build_object('ok', true, 'idempotent', true, 'run_id', existing_id, 'service_id', p_service_id);
  end if;

  select * into wf
  from public.os_workflows
  where key = 'sunday_operating_system'
  limit 1;
  if wf.id is null then
    return jsonb_build_object('ok', false, 'reason', 'workflow_missing');
  end if;

  insert into public.os_workflow_runs(
    workflow_id, trigger_source, entity_type, entity_id, status, input_context,
    decision, output, verification, escalation, human_intervention, trigger_key
  ) values (
    wf.id, 'autonomous_runtime', 'music_service', p_service_id, 'running',
    jsonb_build_object('service_id', p_service_id, 'source', 'autonomous_runtime'),
    '{}', '{}', '{}', '{}', false, trigger_key_value
  ) returning id into run_id;

  select
    count(*) filter (where assignment_status = 'active'),
    count(*) filter (where assignment_status = 'active' and confirmation_status = 'pending'),
    count(*) filter (where assignment_status = 'active' and confirmation_status = 'declined')
  into roster_count, pending_count, declined_count
  from public.service_assignments
  where service_id = p_service_id;

  if roster_count = 0 then
    blocker_count := blocker_count + 1;
    checks := checks || jsonb_build_array(jsonb_build_object('key','roster','status','blocked','detail','No active service assignments'));
  elsif declined_count > 0 then
    blocker_count := blocker_count + 1;
    checks := checks || jsonb_build_array(jsonb_build_object('key','roster_confirmation','status','blocked','detail',declined_count || ' declined assignment(s)'));
  elsif pending_count > 0 then
    blocker_count := blocker_count + 1;
    checks := checks || jsonb_build_array(jsonb_build_object('key','roster_confirmation','status','blocked','detail',pending_count || ' pending confirmation(s)'));
  else
    checks := checks || jsonb_build_array(jsonb_build_object('key','roster_confirmation','status','passed','detail',roster_count || ' confirmed assignment(s)'));
  end if;

  select count(*) into setlist_count from public.music_setlists where service_id = p_service_id;
  select count(*) into item_count
  from public.music_setlist_items i
  join public.music_setlists s on s.id = i.setlist_id
  where s.service_id = p_service_id;

  if setlist_count = 0 then
    blocker_count := blocker_count + 1;
    checks := checks || jsonb_build_array(jsonb_build_object('key','setlist','status','blocked','detail','No setlist exists'));
  elsif item_count = 0 then
    blocker_count := blocker_count + 1;
    checks := checks || jsonb_build_array(jsonb_build_object('key','setlist_items','status','blocked','detail','Setlist has no songs'));
  else
    checks := checks || jsonb_build_array(jsonb_build_object('key','setlist','status','passed','detail',item_count || ' song(s) in setlist'));
  end if;

  select
    count(*) filter (where c.status in ('draft','approved','sending')),
    count(*) filter (where c.status = 'failed')
  into comm_pending, comm_failed
  from public.os_communications c
  join public.service_assignments a on a.id = c.assignment_id
  where a.service_id = p_service_id;

  if comm_failed > 0 then
    blocker_count := blocker_count + 1;
    checks := checks || jsonb_build_array(jsonb_build_object('key','communications','status','blocked','detail',comm_failed || ' failed communication(s)'));
  elsif comm_pending > 0 then
    warning_count := warning_count + 1;
    checks := checks || jsonb_build_array(jsonb_build_object('key','communications','status','warning','detail',comm_pending || ' communication(s) not completed'));
  else
    checks := checks || jsonb_build_array(jsonb_build_object('key','communications','status','passed','detail','No outstanding communication failures'));
  end if;

  insert into public.os_readiness_checks(
    service_id, check_key, label, status, severity, detail, evidence
  ) values (
    p_service_id, 'sunday_operating_loop', 'Sunday Operating System',
    case when blocker_count > 0 then 'blocked' when warning_count > 0 then 'warning' else 'ready' end,
    case when blocker_count > 0 then 'blocker' when warning_count > 0 then 'warning' else 'info' end,
    'Control-plane readiness snapshot',
    jsonb_build_object(
      'checks', checks,
      'roster_count', roster_count,
      'pending_confirmations', pending_count,
      'declined', declined_count,
      'setlists', setlist_count,
      'songs', item_count,
      'communications_pending', comm_pending,
      'communications_failed', comm_failed
    )
  )
  on conflict (service_id, check_key) do update set
    status = excluded.status,
    severity = excluded.severity,
    detail = excluded.detail,
    evidence = excluded.evidence,
    checked_at = now();

  if blocker_count > 0 then
    insert into public.os_tasks(
      workflow_run_id, entity_type, entity_id, title, description,
      priority, status, source, task_key
    ) values (
      run_id, 'music_service', p_service_id,
      'Sunday service has readiness blockers',
      'Resolve the blockers surfaced by the Sunday Operating System before service.',
      'high', 'open', 'sunday_operating_system',
      'sunday_os:' || p_service_id || ':blockers'
    ) on conflict (task_key) where task_key is not null do nothing;
  end if;

  update public.os_workflow_runs set
    status = case when blocker_count > 0 then 'escalated' else 'completed' end,
    finished_at = now(),
    output = jsonb_build_object('checks', checks, 'blockers', blocker_count, 'warnings', warning_count),
    verification = jsonb_build_object('verified', true, 'checked_at', now(), 'runtime_worker', true),
    escalation = jsonb_build_object('required', blocker_count > 0),
    human_intervention = (blocker_count > 0)
  where id = run_id;

  perform public.os_evaluate_workflow_run_internal(run_id);

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'run_id', run_id,
    'service_id', p_service_id,
    'status', case when blocker_count > 0 then 'escalated' else 'completed' end,
    'blockers', blocker_count,
    'warnings', warning_count,
    'checks', checks
  );
end;
$$;

revoke all on function public.os_run_sunday_operating_loop_internal(uuid) from public;
revoke execute on function public.os_run_sunday_operating_loop_internal(uuid) from anon, authenticated;

create or replace function public.os_run_sunday_operating_worker()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  s record;
  processed int := 0;
  escalated int := 0;
  errors jsonb := '[]'::jsonb;
  result jsonb;
begin
  for s in
    select id
    from public.music_services
    where service_date between current_date and current_date + public.os_runtime_policy_int('runtime.service_horizon_days', 7)
    order by service_date
    limit public.os_runtime_policy_int('runtime.max_services', 25)
  loop
    begin
      result := public.os_run_sunday_operating_loop_internal(s.id);
      processed := processed + 1;
      if result->>'status' = 'escalated' then escalated := escalated + 1; end if;
    exception when others then
      errors := errors || jsonb_build_object('service_id', s.id, 'error', sqlerrm);
    end;
  end loop;

  return jsonb_build_object(
    'ok', jsonb_array_length(errors) = 0,
    'services_processed', processed,
    'services_escalated', escalated,
    'errors', errors,
    'ran_at', now()
  );
end;
$$;

revoke all on function public.os_run_sunday_operating_worker() from public;
revoke execute on function public.os_run_sunday_operating_worker() from anon, authenticated;

-- The public/manual workflow remains available for admin-triggered execution, but the runtime
-- dispatcher must not enqueue it as an unsupported workflow. The dedicated worker owns this loop.
update public.os_workflows
set enabled = false
where key = 'sunday_operating_system';

select cron.schedule(
  'sunday-operating-worker',
  '*/5 * * * *',
  'select public.os_run_sunday_operating_worker();'
);
