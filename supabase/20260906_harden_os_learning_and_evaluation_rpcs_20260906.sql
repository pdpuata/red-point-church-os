-- Red Point Church OS — harden learning/evaluation RPCs.
-- Applied to production Supabase on 2026-09-06.
-- SECURITY DEFINER writes require explicit Admin authorization; the policy
-- lookup helper is read-only and now runs as SECURITY INVOKER.
CREATE OR REPLACE FUNCTION public.os_evaluate_workflow_run(p_run_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', pg_temp
AS $function$
declare r record; eval_id uuid; outcome text; score numeric;
begin
  if not public.is_admin() then raise exception 'admin_required'; end if;
  select wr.*,w.key into r from public.os_workflow_runs wr join public.os_workflows w on w.id=wr.workflow_id where wr.id=p_run_id;
  if not found then return null; end if;
  if r.status='completed' then outcome:='success'; score:=1; elsif r.status='escalated' then outcome:='escalated'; score:=0.5; else outcome:='failure'; score:=0; end if;
  insert into public.os_workflow_evaluations(workflow_run_id,workflow_key,outcome,score,human_intervention,verification_quality,signals)
  values(r.id,r.key,outcome,score,coalesce(r.human_intervention,false),case when r.verification is not null then 'verified' else 'unverified' end,jsonb_build_object('trigger_source',r.trigger_source,'error',r.error,'escalation',r.escalation))
  on conflict(workflow_run_id) do update set outcome=excluded.outcome,score=excluded.score,human_intervention=excluded.human_intervention,verification_quality=excluded.verification_quality,signals=excluded.signals;
  select id into eval_id from public.os_workflow_evaluations where workflow_run_id=r.id;
  return eval_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.os_run_learning_cycle()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', pg_temp
AS $function$
declare c record; cycle_id uuid; proposals integer:=0; proposal_key text;
begin
  if not public.is_admin() then raise exception 'admin_required'; end if;
  insert into public.os_learning_cycles(window_start,window_end) values(now()-interval '30 days',now()) returning id into cycle_id;
  update public.os_learning_cycles lc set runs_observed=(select count(*) from public.os_workflow_evaluations e where e.created_at>=lc.window_start and e.created_at<=lc.window_end),successes=(select count(*) from public.os_workflow_evaluations e where e.outcome='success' and e.created_at>=lc.window_start and e.created_at<=lc.window_end),escalations=(select count(*) from public.os_workflow_evaluations e where e.outcome='escalated' and e.created_at>=lc.window_start and e.created_at<=lc.window_end),failures=(select count(*) from public.os_workflow_evaluations e where e.outcome='failure' and e.created_at>=lc.window_start and e.created_at<=lc.window_end),intervention_rate=coalesce((select avg(case when e.human_intervention then 1 else 0 end) from public.os_workflow_evaluations e where e.created_at>=lc.window_start and e.created_at<=lc.window_end),0),average_score=coalesce((select avg(e.score) from public.os_workflow_evaluations e where e.created_at>=lc.window_start and e.created_at<=lc.window_end),0) where lc.id=cycle_id;
  for c in select p.policy_key,p.policy_value,lc.runs_observed,lc.intervention_rate,lc.average_score from public.os_runtime_policies p cross join public.os_learning_cycles lc where lc.id=cycle_id loop
    if c.runs_observed>=10 and c.policy_key='runtime.max_dispatches' and c.intervention_rate>0.60 then
      proposal_key:='adaptive:'||c.policy_key||':'||to_char(current_date,'YYYYMMDD');
      insert into public.os_learning_proposals(proposal_key,policy_key,current_value,proposed_value,reason,evidence) values(proposal_key,c.policy_key,c.policy_value,jsonb_build_object('limit',greatest(3,least(25,(c.policy_value->>'limit')::int-2))),'High intervention rate suggests reducing autonomous concurrency until reliability improves.',jsonb_build_object('runs',c.runs_observed,'intervention_rate',c.intervention_rate,'average_score',c.average_score)) on conflict(proposal_key) do nothing;
      if found then proposals:=proposals+1; end if;
    elsif c.runs_observed>=10 and c.policy_key='runtime.max_dispatches' and c.intervention_rate<0.10 and c.average_score>=0.95 then
      proposal_key:='adaptive:'||c.policy_key||':'||to_char(current_date,'YYYYMMDD');
      insert into public.os_learning_proposals(proposal_key,policy_key,current_value,proposed_value,reason,evidence) values(proposal_key,c.policy_key,c.policy_value,jsonb_build_object('limit',least(25,(c.policy_value->>'limit')::int+2)),'Sustained verified reliability supports a small increase in autonomous throughput.',jsonb_build_object('runs',c.runs_observed,'intervention_rate',c.intervention_rate,'average_score',c.average_score)) on conflict(proposal_key) do nothing;
      if found then proposals:=proposals+1; end if;
    end if;
  end loop;
  update public.os_learning_cycles set proposals_created=proposals where id=cycle_id;
  insert into public.os_audit_events(actor_type,actor_agent_key,action,entity_type,entity_id,evidence) values('system','learning_governor','learning_cycle','learning_cycle',cycle_id,jsonb_build_object('proposals',proposals));
  return (select jsonb_build_object('ok',true,'cycle_id',id,'runs_observed',runs_observed,'average_score',average_score,'intervention_rate',intervention_rate,'proposals_created',proposals) from public.os_learning_cycles where id=cycle_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.os_runtime_policy_int(p_key text, p_default integer)
RETURNS integer
LANGUAGE sql
SECURITY INVOKER
SET search_path TO 'public', pg_temp
AS $function$
  select coalesce((select (policy_value->>'limit')::int from public.os_runtime_policies where policy_key=p_key and status='active'),p_default)
$function$;

REVOKE EXECUTE ON FUNCTION public.os_evaluate_workflow_run(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.os_evaluate_workflow_run(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.os_run_learning_cycle() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.os_run_learning_cycle() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.os_runtime_policy_int(text, integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.os_runtime_policy_int(text, integer) TO authenticated;
