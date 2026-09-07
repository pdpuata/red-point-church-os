-- Elder dashboard readiness is about the next service, not the size of the global task backlog.
create or replace function public.os_get_elder_dashboard()
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_service record; v_assignments int:=0; v_confirmed int:=0; v_setlist_items int:=0; v_open_tasks int:=0; v_new_visitors int:=0; v_communications int:=0; v_attention jsonb:='[]'::jsonb; v_status text:='ready'; v_readiness int:=100; v_service_tasks int:=0;
begin
 if not public.is_admin() then return jsonb_build_object('ok',false,'reason','admin_required'); end if;
 select ms.id,ms.title,ms.service_date,ms.status,ms.band_id,b.name band_name into v_service from public.music_services ms left join public.bands b on b.id=ms.band_id where ms.service_date>=current_date order by ms.service_date asc,ms.starts_at asc limit 1;
 if v_service.id is not null then
  select count(*)::int,count(*) filter(where confirmation_status='confirmed')::int into v_assignments,v_confirmed from public.service_assignments where service_id=v_service.id and assignment_status='active';
  select count(*)::int into v_setlist_items from public.music_setlist_items i join public.music_setlists s on s.id=i.setlist_id where s.service_id=v_service.id and s.status='published';
  select count(*)::int into v_service_tasks from public.os_tasks where entity_id=v_service.id and status in ('open','in_progress','blocked');
  if v_assignments=0 then v_status:='needs_attention'; v_readiness:=v_readiness-35; v_attention:=v_attention||jsonb_build_array(jsonb_build_object('key','roster_missing','severity','high','title','People still need to be assigned','detail',format('%s has no active service assignments.',to_char(v_service.service_date,'FMDD FMMonth YYYY')),'action','Review the roster')); end if;
  if v_confirmed<v_assignments and v_assignments>0 then v_status:='needs_attention'; v_readiness:=v_readiness-least(30,greatest(5,(v_assignments-v_confirmed)*4)); v_attention:=v_attention||jsonb_build_array(jsonb_build_object('key','roster_confirmation','severity','medium','title','Some people still need to confirm','detail',format('%s of %s assigned people have confirmed.',v_confirmed,v_assignments),'action','Review confirmations')); end if;
  if v_setlist_items=0 then v_status:='needs_attention'; v_readiness:=v_readiness-25; v_attention:=v_attention||jsonb_build_array(jsonb_build_object('key','setlist_missing','severity','high','title','The service setlist is not ready','detail','Songs have not yet been published for the upcoming service.','action','Review the service plan')); end if;
  if v_service_tasks>0 then v_status:='needs_attention'; v_readiness:=v_readiness-least(20,v_service_tasks*5); v_attention:=v_attention||jsonb_build_array(jsonb_build_object('key','service_tasks','severity','medium','title','The system has open Sunday work','detail',format('%s service task%s still need attention.',v_service_tasks,case when v_service_tasks=1 then '' else 's' end),'action','Review Sunday')); end if;
 else v_status:='needs_attention'; v_readiness:=0; v_attention:=v_attention||jsonb_build_array(jsonb_build_object('key','service_missing','severity','high','title','No upcoming service is scheduled','detail','The operating system cannot prepare a service that has not been scheduled.','action','Schedule the next service')); end if;
 select count(*)::int into v_new_visitors from public.visitor_submissions where status='new';
 select count(*)::int into v_communications from public.os_communications where status in ('draft','approved','queued','sending','failed');
 if v_new_visitors>0 then v_status:='needs_attention'; v_readiness:=v_readiness-least(20,v_new_visitors*5); v_attention:=v_attention||jsonb_build_array(jsonb_build_object('key','visitor_followup','severity','medium','title','People are waiting for a response','detail',format('%s new visitor request%s need follow-up.',v_new_visitors,case when v_new_visitors=1 then '' else 's' end),'action','Follow up with visitors')); end if;
 v_readiness:=greatest(0,least(100,v_readiness));
 return jsonb_build_object('ok',true,'status',v_status,'readiness_percent',v_readiness,'service',case when v_service.id is null then null else jsonb_build_object('id',v_service.id,'title',v_service.title,'service_date',v_service.service_date,'status',v_service.status,'band_name',v_service.band_name,'assignments',v_assignments,'confirmed',v_confirmed,'setlist_items',v_setlist_items) end,'attention',v_attention,'counts',jsonb_build_object('open_tasks',v_open_tasks,'new_visitors',v_new_visitors,'communication_items',v_communications,'service_tasks',v_service_tasks),'generated_at',now());
end $$;
revoke execute on function public.os_get_elder_dashboard() from public,anon;
grant execute on function public.os_get_elder_dashboard() to authenticated;
