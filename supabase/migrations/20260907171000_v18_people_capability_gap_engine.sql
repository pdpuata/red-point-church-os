create or replace function public.os_scan_people_capability_gaps_internal() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare b record; role_name text; gap_count int:=0; created_count int:=0; task_id uuid; v_task_key text; roles text[]:=array['drums','bass','acoustic_guitar','electric_guitar','piano_keys','vocals','sound_engineer'];
begin
 for b in select id,name from public.bands where active loop foreach role_name in array roles loop
  if not exists(select 1 from public.music_person_band_roles r join public.music_people p on p.id=r.person_id where r.band_id=b.id and r.role=role_name and p.status='active') then
   gap_count:=gap_count+1; v_task_key:='capability-gap:'||b.id::text||':'||role_name;
   if not exists(select 1 from public.os_tasks t where t.task_key=v_task_key and t.status not in ('completed','cancelled')) then
    insert into public.os_tasks(entity_type,entity_id,title,description,priority,status,source,task_key) values('band',b.id,'Capability gap: '||replace(role_name,'_',' '),format('%s has no confirmed active person covering %s. The system has identified a capability gap that needs a human staffing decision.',b.name,replace(role_name,'_',' ')),'high','open','autonomous_capability_scan',v_task_key) returning id into task_id; created_count:=created_count+1;
   end if;
  end if;
 end loop; end loop;
 return jsonb_build_object('ok',true,'gaps',gap_count,'created_tasks',created_count,'scanned_roles',array_length(roles,1));
end $$;
revoke all on function public.os_scan_people_capability_gaps_internal() from public,anon,authenticated;

-- The autonomous runtime calls this internal scanner each tick after service dispatch.
-- The runtime itself remains inaccessible to API clients.
