-- Cron/runtime execution has no user JWT, so internal evaluation must not call admin-gated RPCs.
create or replace function public.os_evaluate_workflow_run_internal(p_run_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp
as $$
declare r record; eval_id uuid; outcome text; score numeric;
begin
 select wr.*,w.key into r from public.os_workflow_runs wr join public.os_workflows w on w.id=wr.workflow_id where wr.id=p_run_id;
 if not found then return null; end if;
 if r.status='completed' then outcome:='success'; score:=1; elsif r.status='escalated' then outcome:='escalated'; score:=0.5; else outcome:='failure'; score:=0; end if;
 insert into public.os_workflow_evaluations(workflow_run_id,workflow_key,outcome,score,human_intervention,verification_quality,signals)
 values(r.id,r.key,outcome,score,coalesce(r.human_intervention,false),case when r.verification is not null then 'verified' else 'unverified' end,jsonb_build_object('trigger_source',r.trigger_source,'error',r.error,'escalation',r.escalation))
 on conflict(workflow_run_id) do update set outcome=excluded.outcome,score=excluded.score,human_intervention=excluded.human_intervention,verification_quality=excluded.verification_quality,signals=excluded.signals;
 select id into eval_id from public.os_workflow_evaluations where workflow_run_id=r.id; return eval_id;
end $$;
revoke all on function public.os_evaluate_workflow_run_internal(uuid) from public,anon,authenticated;

-- The setlist agent must not create a new agent run every five minutes for the same service.
-- The live function returns the most recent verified run when one exists inside its 30-minute window.
