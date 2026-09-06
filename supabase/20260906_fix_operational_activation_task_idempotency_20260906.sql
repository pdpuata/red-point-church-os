-- Red Point Church OS — fix operational activation task idempotency.
-- Applied to production Supabase on 2026-09-06.
-- The os_tasks unique index on task_key is partial (task_key IS NOT NULL),
-- so the activation task insert must use the matching ON CONFLICT predicate.
CREATE OR REPLACE FUNCTION public.os_generate_operational_activation_tasks()
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
declare
  v_workflow_id uuid;
  v_run_id uuid;
  v_trigger_key text := 'activation:' || to_char(current_date,'YYYY-MM-DD');
  v_phase record;
  v_created integer := 0;
  v_current_phase text;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok',false,'reason','admin_required');
  end if;

  insert into public.os_workflows(key,name,purpose,domain,trigger_type,automation_level,human_approval_required,enabled,version,definition,success_metrics)
  values (
    'operational_graph_activation', 'Operational Graph Activation',
    'Systematically activate the real church operating graph in dependency order.',
    'church_operations', 'manual_or_scheduled', 'recommend', true, true, 1,
    jsonb_build_object('loop',jsonb_build_array('measure readiness','identify first blocked phase','create stable task','verify','unlock next phase')),
    jsonb_build_object('metrics',jsonb_build_array('phase readiness','blocker count','time to activation','verification coverage'))
  ) on conflict (key) do nothing;

  select id into v_workflow_id from public.os_workflows where key='operational_graph_activation';

  insert into public.os_workflow_runs(workflow_id,trigger_source,status,input_context,decision,output,verification,escalation,human_intervention,trigger_key)
  values (v_workflow_id,'operational_activation','running',jsonb_build_object('trigger_key',v_trigger_key), '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, true, v_trigger_key)
  on conflict (trigger_key) where trigger_key is not null do update set status=excluded.status;

  select id into v_run_id from public.os_workflow_runs where trigger_key=v_trigger_key;

  select * into v_phase from public.os_operational_activation where status <> 'ready' order by phase_order limit 1;
  v_current_phase := coalesce(v_phase.phase_key,'complete');

  if v_phase.phase_key is not null then
    insert into public.os_tasks(workflow_run_id,entity_type,title,description,priority,status,source,resolution,task_key)
    values (
      v_run_id, 'activation_phase', 'Activate ' || v_phase.phase_name,
      coalesce(v_phase.next_action,'Resolve the current activation blocker.') || ' Evidence: ' || coalesce(v_phase.readiness_evidence::text,v_phase.integrity_evidence::text,'none') || '.',
      case when v_phase.status='blocked' then 'high' else 'medium' end, 'open', 'operational_activation',
      jsonb_build_object('phase_key',v_phase.phase_key,'next_action',v_phase.next_action,'unlocks',v_phase.unlocks),
      'activation:' || v_phase.phase_key
    ) on conflict (task_key) where task_key is not null do nothing;
    get diagnostics v_created = row_count;
  end if;

  update public.os_workflow_runs
  set status=case when v_current_phase='complete' then 'completed' else 'escalated' end,
      finished_at=now(),
      output=jsonb_build_object('current_phase',v_current_phase,'created_tasks',v_created),
      verification=jsonb_build_object('activation_view','evaluated','first_blocked_phase',v_current_phase),
      escalation=case when v_current_phase='complete' then '{}'::jsonb else jsonb_build_object('phase',v_current_phase) end
  where id=v_run_id;

  insert into public.os_audit_events(event_type,entity_type,entity_id,payload)
  values ('operational_activation_evaluated','workflow_run',v_run_id,jsonb_build_object('current_phase',v_current_phase,'created_tasks',v_created));

  return jsonb_build_object('ok',true,'run_id',v_run_id,'current_phase',v_current_phase,'created_tasks',v_created);
end;
$function$;
