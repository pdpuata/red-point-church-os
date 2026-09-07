create or replace function public.os_run_setlist_operations_agent_internal(p_service_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_agent_id uuid; v_tool_id uuid; v_run_id uuid; v_action_id uuid; v_service_date date; v_service_title text; v_song_count int:=0; v_distinct_count int:=0; v_repeat_count int:=0; v_recent_repeat_count int:=0; v_result jsonb; v_context jsonb; v_risks text[]:=array[]::text[];
begin
 select id into v_agent_id from os_agents where key='setlist_agent' and enabled limit 1;
 select id into v_tool_id from os_agent_tools where key='read_operational_state' and enabled limit 1;
 if v_agent_id is null then return jsonb_build_object('ok',false,'reason','setlist_agent_disabled'); end if;
 if v_tool_id is null then return jsonb_build_object('ok',false,'reason','read_operational_state_tool_disabled'); end if;
 if exists(select 1 from os_agent_runs where agent_id=v_agent_id and input_context->>'service_id'=p_service_id::text and started_at>now()-interval '30 minutes') then
   select id into v_run_id from os_agent_runs where agent_id=v_agent_id and input_context->>'service_id'=p_service_id::text and started_at>now()-interval '30 minutes' order by started_at desc limit 1;
   return jsonb_build_object('ok',true,'idempotent',true,'run_id',v_run_id,'reason','agent_run_idempotent');
 end if;
 select service_date,title into v_service_date,v_service_title from music_services where id=p_service_id;
 if v_service_date is null then return jsonb_build_object('ok',false,'reason','service_not_found'); end if;
 select count(*),count(distinct sli.song_id) into v_song_count,v_distinct_count from music_setlists sl join music_setlist_items sli on sli.setlist_id=sl.id where sl.service_id=p_service_id;
 select count(*) into v_repeat_count from (select sli.song_id from music_setlists sl join music_setlist_items sli on sli.setlist_id=sl.id where sl.service_id=p_service_id group by sli.song_id having count(*)>1)x;
 select count(*) into v_recent_repeat_count from (select sli.song_id from music_setlists sl join music_setlist_items sli on sli.setlist_id=sl.id join music_services ms on ms.id=sl.service_id where ms.service_date<v_service_date and ms.service_date>=v_service_date-interval '42 days' group by sli.song_id having count(distinct ms.service_date)>1)x;
 if v_song_count=0 then v_risks:=array_append(v_risks,'missing_setlist'); end if; if v_repeat_count>0 then v_risks:=array_append(v_risks,'duplicate_song_within_setlist'); end if; if v_recent_repeat_count>0 then v_risks:=array_append(v_risks,'recent_song_repetition'); end if;
 v_context:=jsonb_build_object('service_id',p_service_id,'service_date',v_service_date,'service_title',v_service_title,'songs',v_song_count,'distinct_songs',v_distinct_count,'duplicate_songs_in_service',v_repeat_count,'songs_repeated_in_prior_42_days',v_recent_repeat_count,'source','scheduled_autonomous_runtime');
 v_result:=jsonb_build_object('summary',case when v_song_count=0 then 'No setlist is published for this service; setlist planning is required.' else format('%s songs across %s distinct songs.',v_song_count,v_distinct_count) end,'risks',to_jsonb(v_risks),'next_action',case when v_song_count=0 then 'Create and review a setlist before the service timeline deadline.' when v_recent_repeat_count>0 then 'Review recent repetition and consider less-used songs from the active catalogue.' else 'Setlist passes deterministic operational checks; continue theological and pastoral review.' end,'analysis_type','deterministic_setlist_operations');
 insert into os_agent_runs(agent_id,status,input_context,actions_taken,result,verification,started_at,finished_at) values(v_agent_id,'completed',v_context,'[]'::jsonb,v_result,jsonb_build_object('verified',true,'method','database_requery','service_id',p_service_id),now(),now()) returning id into v_run_id;
 insert into os_agent_actions(agent_id,tool_id,workflow_run_id,entity_type,entity_id,idempotency_key,requested_mode,approval_status,status,input_context,proposed_action,execution_result,verification_result,attempts,available_at,started_at,finished_at) values(v_agent_id,v_tool_id,null,'music_service',p_service_id,'scheduled-setlist-analysis:'||p_service_id::text||':'||to_char(now(),'YYYYMMDDHH24MI'),'recommend','not_required','completed',v_context,v_result,jsonb_build_object('analysis_recorded',true,'scheduled',true),jsonb_build_object('verified',true,'method','database_requery'),1,now(),now(),now()) returning id into v_action_id;
 update os_agent_runs set actions_taken=jsonb_build_array(v_action_id),verification=jsonb_build_object('verified',true,'action_id',v_action_id,'method','database_requery') where id=v_run_id;
 return jsonb_build_object('ok',true,'run_id',v_run_id,'action_id',v_action_id,'result',v_result);
end $$;
revoke all on function public.os_run_setlist_operations_agent_internal(uuid) from public,anon,authenticated;
