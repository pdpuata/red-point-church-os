-- v22: turn missing recipient identity into an explicit operational action.
-- The worker never guesses a phone number or sends to an unverified destination.

create or replace function public.os_run_sunday_action_worker()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  s record;
  a record;
  processed int := 0;
  prepared int := 0;
  identity_escalations int := 0;
  replacement_escalations int := 0;
  errors jsonb := '[]'::jsonb;
  msg_body text;
  recipient uuid;
begin
  for s in
    select id, service_date
    from public.music_services
    where service_date between current_date and current_date + public.os_runtime_policy_int('runtime.service_horizon_days', 7)
      and service_type = 'sunday_service'
      and status <> 'cancelled'
    order by service_date
    limit public.os_runtime_policy_int('runtime.max_services', 25)
  loop
    begin
      processed := processed + 1;
      perform public.os_run_sunday_operating_loop_internal(s.id);

      for a in
        select sa.id, sa.user_id, sa.person_id, sa.responsibility,
               mp.display_name, mp.linked_user_id
        from public.service_assignments sa
        left join public.music_people mp on mp.id = sa.person_id
        where sa.service_id = s.id
          and sa.assignment_status = 'active'
          and sa.confirmation_status = 'pending'
      loop
        recipient := coalesce(a.user_id, a.linked_user_id);
        if recipient is null then
          insert into public.os_tasks(
            entity_type, entity_id, title, description, priority, status, source, task_key, due_at, resolution
          ) values (
            'service_assignment', a.id, 'Link assigned person for confirmation',
            format('%s is assigned to serve as %s on %s but has no linked Church OS user account. Link the person before automated confirmation can be sent.',
              coalesce(a.display_name,'Assigned person'), a.responsibility,
              to_char(s.service_date,'FMDay, FMDD FMMonth YYYY')),
            'high', 'open', 'sunday_action_worker', 'identity-linkage:' || a.id,
            s.service_date::timestamptz,
            jsonb_build_object('human_approval_required',true,'autonomous_identity_guessing',false)
          ) on conflict (task_key) where task_key is not null do nothing;
          identity_escalations := identity_escalations + 1;
          continue;
        end if;

        msg_body := format('Hi %s, you are assigned to serve as %s on %s. Please confirm that you are available.',
          coalesce(a.display_name,'there'), a.responsibility,
          to_char(s.service_date, 'FMDay, FMDD FMMonth YYYY'));

        insert into public.os_communications(
          assignment_id, recipient_user_id, channel, message_type, title, body,
          status, idempotency_key, metadata
        ) values (
          a.id, recipient, 'push', 'service_assignment_confirmation',
          'Red Point Church · Service Assignment', msg_body, 'draft',
          'assignment-confirmation:' || a.id,
          jsonb_build_object('generated_by','sunday_action_worker','autonomous',true,'external_send',false)
        ) on conflict (idempotency_key) do update set body=excluded.body, updated_at=now();
        prepared := prepared + 1;
      end loop;

      for a in
        select sa.id, sa.responsibility, mp.display_name
        from public.service_assignments sa
        left join public.music_people mp on mp.id = sa.person_id
        where sa.service_id = s.id
          and sa.assignment_status = 'active'
          and sa.confirmation_status = 'declined'
      loop
        insert into public.os_tasks(
          entity_type, entity_id, title, description, priority, status, source, task_key, due_at, resolution
        ) values (
          'service_assignment', a.id, 'Replacement approval required',
          format('%s declined the %s assignment for %s. Review roster candidates and approve any replacement.',
            coalesce(a.display_name,'Assigned person'), a.responsibility,
            to_char(s.service_date,'FMDay, FMDD FMMonth YYYY')),
          'high', 'open', 'sunday_action_worker', 'replacement-approval:' || a.id,
          s.service_date::timestamptz,
          jsonb_build_object('human_approval_required',true,'autonomous_staffing',false)
        ) on conflict (task_key) where task_key is not null do nothing;
        replacement_escalations := replacement_escalations + 1;
      end loop;
    exception when others then
      errors := errors || jsonb_build_object('service_id', s.id, 'error', sqlerrm);
    end;
  end loop;

  return jsonb_build_object('ok',jsonb_array_length(errors)=0,'services_processed',processed,
    'communications_prepared',prepared,'identity_linkage_escalated',identity_escalations,
    'replacement_approvals_escalated',replacement_escalations,'errors',errors,'ran_at',now());
end;
$$;

revoke all on function public.os_run_sunday_action_worker() from public;
revoke execute on function public.os_run_sunday_action_worker() from anon, authenticated;
