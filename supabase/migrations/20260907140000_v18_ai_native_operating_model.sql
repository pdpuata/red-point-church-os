-- AI-native operating model: the workflow registry becomes the church operating model.
-- Applied to the live project during Phase 2 build; this migration records the durable source-of-truth changes.

-- The workflow registry is seeded/upgraded by the Phase 2 operating-model rollout.
-- os_get_ai_operating_model() is the admin read model used by the operating-model surface.

create or replace function public.os_get_ai_operating_model()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_total int; v_operational int; v_partial int; v_designed int;
  v_open_tasks int; v_data_gaps int; v_attention int; v_workflows jsonb;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok',false,'reason','admin_required');
  end if;

  with states as (
    select w.*,
      case
        when w.key in ('operations_risk','media_readiness','communication_routing','sunday_readiness','worship_roster','setlist_operations','sunday_operating_system') then 'operational'
        when w.key in ('visitor_followup','production_readiness','training','institutional_memory','temporal_operations') then 'partial'
        else 'designed'
      end implementation_state
    from public.os_workflows w where w.enabled
  )
  select count(*)::int,
    count(*) filter(where implementation_state='operational')::int,
    count(*) filter(where implementation_state='partial')::int,
    count(*) filter(where implementation_state='designed')::int,
    jsonb_agg(jsonb_build_object('key',key,'name',name,'domain',domain,'automation_level',automation_level,'human_approval_required',human_approval_required,'implementation_state',implementation_state,'trigger_type',trigger_type,'purpose',purpose,'definition',definition) order by domain,key)
  into v_total,v_operational,v_partial,v_designed,v_workflows from states;

  select count(*)::int into v_open_tasks from public.os_tasks where status='open';
  select count(*)::int into v_data_gaps from public.os_operational_data_readiness where status in ('blocked','needs_attention');
  select count(*)::int into v_attention from public.os_control_tower_attention where status not in ('resolved','completed','closed');

  return jsonb_build_object(
    'ok',true,'generated_at',now(),
    'principle','Humans retain authority, AI owns perception, coordination and routine execution where safe.',
    'counts',jsonb_build_object('total',coalesce(v_total,0),'operational',coalesce(v_operational,0),'partial',coalesce(v_partial,0),'designed',coalesce(v_designed,0),'open_tasks',coalesce(v_open_tasks,0),'data_gaps',coalesce(v_data_gaps,0),'attention_items',coalesce(v_attention,0)),
    'north_star','The system should manage the workflow; humans should manage judgement, relationships and consequential decisions.',
    'next_build_order',jsonb_build_array(
      jsonb_build_object('step',1,'focus','Make the event fabric trigger real workflows automatically','reason','Move from manual invocation to event-driven operation'),
      jsonb_build_object('step',2,'focus','Complete People to capability to training loop','reason','Turn capability gaps into measurable development'),
      jsonb_build_object('step',3,'focus','Complete Sunday orchestration across worship, production and communications','reason','One readiness state should drive the whole pre-service operation'),
      jsonb_build_object('step',4,'focus','Activate pastoral follow-up with explicit human boundaries','reason','Prevent people from falling through operational cracks'),
      jsonb_build_object('step',5,'focus','Close finance, equipment and administration loops','reason','Extend autonomy beyond worship operations')
    ),
    'workflows',coalesce(v_workflows,'[]'::jsonb)
  );
end $$;

revoke execute on function public.os_get_ai_operating_model() from public, anon;
grant execute on function public.os_get_ai_operating_model() to authenticated;
