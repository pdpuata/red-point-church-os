create or replace function public.os_check_roster(p_service_id uuid)
returns table(check_key text, label text, status text, detail text, metadata jsonb)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_band uuid; v_assignments int; v_confirmed int;
begin
 select band_id into v_band from public.music_services where id=p_service_id;
 if not found then return query select 'service_exists','Service exists','fail','Service not found','{}'::jsonb; return; end if;
 if not (public.is_admin() or public.is_music_leader() or exists(select 1 from public.band_memberships where band_id=v_band and user_id=auth.uid() and is_leader)) then
   return query select 'authorization','Authorization','fail','Admin, music leader, or assigned band leader required','{}'::jsonb;
   return;
 end if;
 return query select 'band_assigned','Band assigned',case when v_band is null then 'fail' else 'pass' end,case when v_band is null then 'No band is assigned to this service' else 'Band assigned' end,jsonb_build_object('band_id',v_band);
 select count(*),count(*) filter(where confirmation_status='confirmed') into v_assignments,v_confirmed from public.service_assignments where service_id=p_service_id;
 return query select 'roster_exists','Roster exists',case when v_assignments>0 then 'pass' else 'fail' end,case when v_assignments>0 then format('%s assignment(s), %s confirmed',v_assignments,v_confirmed) else 'No service assignments exist' end,jsonb_build_object('assignments',v_assignments,'confirmed',v_confirmed);
 return query select 'roster_confirmation','Roster confirmed',case when v_assignments>0 and v_confirmed=v_assignments then 'pass' when v_assignments>0 then 'warn' else 'fail' end,case when v_assignments=0 then 'Cannot confirm an empty roster' when v_confirmed=v_assignments then 'All assignments confirmed' else format('%s of %s assignments confirmed',v_confirmed,v_assignments) end,jsonb_build_object('assignments',v_assignments,'confirmed',v_confirmed);
end $$;

create or replace function public.os_generate_roster_recommendations(p_service_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_band uuid; v_candidates jsonb; v_count int;
begin
 select band_id into v_band from public.music_services where id=p_service_id;
 if not found then raise exception 'service not found'; end if;
 if not (public.is_admin() or public.is_music_leader() or exists(select 1 from public.band_memberships where band_id=v_band and user_id=auth.uid() and is_leader)) then
   return jsonb_build_object('ok',false,'reason','authorization_required','recommendations','[]'::jsonb);
 end if;
 if v_band is null then return jsonb_build_object('ok',false,'reason','no_band_assigned','recommendations','[]'::jsonb); end if;
 select coalesce(jsonb_agg(jsonb_build_object('user_id',bm.user_id,'display_name',coalesce(p.display_name,p.email),'score',case when bm.is_leader then 1.0 else 0.8 end,'reasons',jsonb_build_array(case when bm.is_leader then 'Band leader' else 'Band member' end))), '[]'::jsonb) into v_candidates
 from public.band_memberships bm left join public.profiles p on p.user_id=bm.user_id where bm.band_id=v_band;
 select jsonb_array_length(v_candidates) into v_count;
 return jsonb_build_object('ok',true,'service_id',p_service_id,'band_id',v_band,'candidate_count',v_count,'recommendations',v_candidates,'auto_assigned',false,'approval_required',true);
end $$;

create or replace function public.os_run_roster_agent(p_service_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_wf uuid; v_run uuid; v_checks jsonb; v_blockers int; v_key text; v_band uuid;
begin
 select band_id into v_band from public.music_services where id=p_service_id;
 if not found then return jsonb_build_object('ok',false,'reason','service_not_found'); end if;
 if not (public.is_admin() or public.is_music_leader() or exists(select 1 from public.band_memberships where band_id=v_band and user_id=auth.uid() and is_leader)) then
   return jsonb_build_object('ok',false,'reason','authorization_required');
 end if;
 v_key := 'roster:'||p_service_id::text;
 select id into v_wf from public.os_workflows where key='worship_roster' and enabled=true;
 if v_wf is null then raise exception 'worship_roster workflow not configured'; end if;
 select id into v_run from public.os_workflow_runs where trigger_key=v_key order by created_at desc limit 1;
 if v_run is not null then return jsonb_build_object('ok',true,'idempotent',true,'run_id',v_run); end if;
 select coalesce(jsonb_agg(x), '[]'::jsonb) into v_checks from public.os_check_roster(p_service_id) x;
 select count(*) into v_blockers from jsonb_array_elements(v_checks) x where x->>'status'='fail';
 insert into public.os_workflow_runs(workflow_id,trigger_source,trigger_key,entity_type,entity_id,status,started_at,finished_at,input_context,decision,output,verification)
 values(v_wf,'agent',v_key,'music_service',p_service_id,case when v_blockers>0 then 'escalated' else 'completed' end,now(),now(),jsonb_build_object('service_id',p_service_id),jsonb_build_object('blockers',v_blockers),jsonb_build_object('checks',v_checks),jsonb_build_object('verified',true)) returning id into v_run;
 insert into public.os_tasks(workflow_run_id,entity_type,entity_id,task_key,title,description,priority,status,source)
 select v_run,'music_service',p_service_id,'roster:'||p_service_id||':'||(x->>'check_key'),'Roster: '||(x->>'label'),x->>'detail','high','open','roster_agent'
 from jsonb_array_elements(v_checks) x where x->>'status'='fail'
 on conflict (task_key) where task_key is not null do nothing;
 insert into public.os_audit_events(actor_type,actor_user_id,actor_agent_key,action,entity_type,entity_id,evidence) values('human',auth.uid(),'roster_agent','roster_check','music_service',p_service_id,jsonb_build_object('checks',v_checks,'blockers',v_blockers));
 return jsonb_build_object('ok',true,'idempotent',false,'run_id',v_run,'blockers',v_blockers,'checks',v_checks);
end $$;

revoke execute on function public.is_admin() from anon, authenticated, public;
revoke execute on function public.is_music_leader() from anon, authenticated, public;
revoke execute on function public.is_band_leader_of(uuid) from anon, authenticated, public;
revoke execute on function public.is_band_member_of(uuid) from anon, authenticated, public;

comment on function public.os_check_roster(uuid) is 'Authorized roster readiness check for admins, music leaders, and assigned band leaders.';
comment on function public.os_generate_roster_recommendations(uuid) is 'Authorized roster recommendations; never auto-assigns and requires approval.';
comment on function public.os_run_roster_agent(uuid) is 'Authorized roster operational agent; requires admin, music leader, or assigned band leader.';
