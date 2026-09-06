-- Red Point Church OS — fix operational data task idempotency.
-- Applied to production Supabase on 2026-09-06.
-- The existing os_tasks unique index on task_key is partial (task_key IS NOT NULL),
-- so ON CONFLICT must include the matching predicate.
CREATE OR REPLACE FUNCTION public.os_generate_operational_data_tasks()
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
declare
  r record;
  created_count int := 0;
  task_key_value text;
begin
  if not public.is_admin() then raise exception 'admin_required'; end if;

  for r in select * from public.os_operational_data_readiness where status='attention' loop
    task_key_value := 'data-readiness:' || r.domain_key;
    insert into public.os_tasks (title, description, priority, status, source, task_key)
    values (
      'Resolve ' || r.domain_name || ' data readiness',
      'The operational graph reports ' || r.blocker_count || ' blocker(s). Review the domain evidence and complete the missing source data before enabling further automation.',
      case when r.blocker_count >= 3 then 'high' else 'normal' end,
      'open', 'system_integrity', task_key_value
    ) on conflict (task_key) where task_key is not null do nothing;
    if found then created_count := created_count + 1; end if;
  end loop;

  insert into public.os_audit_events (event_type, entity_type, summary, metadata)
  values ('data_readiness_tasks_generated','system','Operational data readiness tasks generated',jsonb_build_object('created_count',created_count));

  return jsonb_build_object('ok',true,'created_count',created_count);
end;
$function$;
