-- v18: make the operational layer safe for a simple elder-facing experience.
-- The UI should ask one question: "What needs my attention?"

create or replace function public.os_get_elder_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_service record;
  v_assignments integer := 0;
  v_confirmed integer := 0;
  v_setlist_items integer := 0;
  v_open_tasks integer := 0;
  v_new_visitors integer := 0;
  v_communications integer := 0;
  v_attention jsonb := '[]'::jsonb;
  v_status text := 'ready';
  v_readiness integer := 100;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'reason', 'admin_required');
  end if;

  select ms.id, ms.title, ms.service_date, ms.status, ms.band_id, b.name as band_name
    into v_service
  from public.music_services ms
  left join public.bands b on b.id = ms.band_id
  where ms.service_date >= current_date
  order by ms.service_date asc, ms.starts_at asc
  limit 1;

  if v_service.id is not null then
    select count(*)::int,
           count(*) filter (where confirmation_status = 'confirmed')::int
      into v_assignments, v_confirmed
    from public.service_assignments
    where service_id = v_service.id
      and assignment_status = 'active';

    select count(*)::int
      into v_setlist_items
    from public.music_setlist_items i
    join public.music_setlists s on s.id = i.setlist_id
    where s.service_id = v_service.id
      and s.status = 'published';
  end if;

  select count(*)::int into v_open_tasks
  from public.os_tasks
  where status in ('open','in_progress','blocked');

  select count(*)::int into v_new_visitors
  from public.visitor_submissions
  where status = 'new';

  select count(*)::int into v_communications
  from public.os_communications
  where status in ('draft','approved','queued','sending','failed');

  if v_service.id is not null then
    if v_assignments = 0 then
      v_status := 'needs_attention';
      v_readiness := v_readiness - 35;
      v_attention := v_attention || jsonb_build_array(jsonb_build_object(
        'key','roster_missing','severity','high','title','People still need to be assigned',
        'detail',format('%s has no active service assignments.', to_char(v_service.service_date,'FMDD FMMonth YYYY')),
        'action','Review the roster'));
    elsif v_confirmed < v_assignments then
      v_status := 'needs_attention';
      v_readiness := v_readiness - least(30, greatest(5, (v_assignments-v_confirmed)*4));
      v_attention := v_attention || jsonb_build_array(jsonb_build_object(
        'key','roster_confirmation','severity','medium','title','Some people still need to confirm',
        'detail',format('%s of %s assigned people have confirmed.', v_confirmed, v_assignments),
        'action','Review confirmations'));
    end if;

    if v_setlist_items = 0 then
      v_status := 'needs_attention';
      v_readiness := v_readiness - 25;
      v_attention := v_attention || jsonb_build_array(jsonb_build_object(
        'key','setlist_missing','severity','high','title','The service setlist is not ready',
        'detail','Songs have not yet been published for the upcoming service.',
        'action','Review the service plan'));
    end if;
  else
    v_status := 'needs_attention';
    v_readiness := 0;
    v_attention := v_attention || jsonb_build_array(jsonb_build_object(
      'key','service_missing','severity','high','title','No upcoming service is scheduled',
      'detail','The operating system cannot prepare a service that has not been scheduled.',
      'action','Schedule the next service'));
  end if;

  if v_new_visitors > 0 then
    v_status := 'needs_attention';
    v_readiness := v_readiness - least(20, v_new_visitors * 5);
    v_attention := v_attention || jsonb_build_array(jsonb_build_object(
      'key','visitor_followup','severity','medium','title','People are waiting for a response',
      'detail',format('%s new visitor request%s need follow-up.', v_new_visitors, case when v_new_visitors=1 then '' else 's' end),
      'action','Follow up with visitors'));
  end if;

  if v_open_tasks > 0 then
    v_status := 'needs_attention';
    v_readiness := v_readiness - least(20, v_open_tasks * 3);
  end if;

  v_readiness := greatest(0, least(100, v_readiness));

  return jsonb_build_object(
    'ok', true,
    'status', v_status,
    'readiness_percent', v_readiness,
    'service', case when v_service.id is null then null else jsonb_build_object(
      'id',v_service.id,'title',v_service.title,'service_date',v_service.service_date,
      'status',v_service.status,'band_name',v_service.band_name,
      'assignments',v_assignments,'confirmed',v_confirmed,'setlist_items',v_setlist_items
    ) end,
    'attention', v_attention,
    'counts', jsonb_build_object(
      'open_tasks',v_open_tasks,
      'new_visitors',v_new_visitors,
      'communication_items',v_communications
    ),
    'generated_at', now()
  );
end;
$$;

revoke execute on function public.os_get_elder_dashboard() from public, anon;
grant execute on function public.os_get_elder_dashboard() to authenticated;

create or replace function public.os_generate_assignment_message(p_assignment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare a record;
begin
  if not public.is_admin() then
    return jsonb_build_object('ok',false,'reason','admin_required');
  end if;

  select sa.id,
         sa.user_id,
         sa.person_id,
         coalesce(mp.display_name, pr.display_name, p.display_name) as display_name,
         mp.linked_user_id,
         sa.responsibility,
         ms.service_date,
         b.name as band_name
    into a
  from public.service_assignments sa
  left join public.music_people mp on mp.id = sa.person_id
  left join public.profiles pr on pr.user_id = sa.user_id
  left join public.music_services ms on ms.id = sa.service_id
  left join public.bands b on b.id = ms.band_id
  left join public.profiles p on p.user_id = coalesce(sa.user_id, mp.linked_user_id)
  where sa.id = p_assignment_id;

  if not found then
    return jsonb_build_object('ok',false,'reason','assignment_not_found');
  end if;

  if coalesce(a.linked_user_id, a.user_id) is null then
    return jsonb_build_object(
      'ok',false,
      'reason','recipient_not_linked',
      'assignment_id',a.id,
      'person_id',a.person_id,
      'recipient_name',coalesce(a.display_name,'Unknown person'),
      'detail','This person exists in the canonical music registry but is not linked to a Supabase Auth account yet.'
    );
  end if;

  return jsonb_build_object(
    'ok',true,
    'assignment_id',a.id,
    'recipient_user_id',coalesce(a.user_id,a.linked_user_id),
    'recipient_name',coalesce(a.display_name,'there'),
    'message_type','service_assignment_confirmation',
    'draft',format('Hi %s, you have been assigned to serve as %s%s on %s. Please confirm that you are available.',coalesce(a.display_name,'there'),a.responsibility,case when a.band_name is not null then ' with '||a.band_name else '' end,to_char(a.service_date,'FMDay, FMDD FMMonth YYYY')),
    'requires_human_approval',true
  );
end;
$$;

revoke execute on function public.os_generate_assignment_message(uuid) from public, anon;
grant execute on function public.os_generate_assignment_message(uuid) to authenticated;
