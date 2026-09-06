create or replace function public.os_plan_roster(p_service_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare svc public.music_services%rowtype; result jsonb;
begin
  select * into svc from public.music_services where id = p_service_id;
  if not found then return jsonb_build_object('ok',false,'reason','service_not_found','service_id',p_service_id); end if;
  if svc.band_id is null then return jsonb_build_object('ok',true,'service_id',p_service_id,'band_id',null,'candidate_count',0,'candidates',jsonb_build_array(),'human_approval_required',true,'data_gaps',jsonb_build_array('band_not_assigned')); end if;
  with candidate_base as (
    select p.user_id,p.display_name,bm.is_leader,coalesce(sa.status,'available') availability,
      coalesce(rc.recent_service_count,0) recent_service_count,
      max(c.proficiency) filter (where c.is_primary) primary_capability_level,
      case when bm.is_leader then 20 else 0 end + case when coalesce(sa.status,'available')='unavailable' then -100 when coalesce(sa.status,'available')='tentative' then -10 else 0 end + (coalesce(rc.recent_service_count,0)*-3) + (coalesce(max(c.proficiency) filter (where c.is_primary),0)*2) score,
      array_remove(array[case when bm.is_leader then 'Band leader' end,case when coalesce(sa.status,'available')='unavailable' then 'Marked unavailable' when coalesce(sa.status,'available')='tentative' then 'Marked tentative' end,case when coalesce(rc.recent_service_count,0)>0 then 'Served recently' end,case when max(c.proficiency) filter (where c.is_primary) is not null then 'Primary capability recorded' end],null) reason_array
    from public.band_memberships bm join public.profiles p on p.user_id=bm.user_id
    left join public.music_service_availability sa on sa.service_id=p_service_id and sa.user_id=bm.user_id
    left join lateral (select count(*)::int recent_service_count from public.service_assignments x join public.music_services ms on ms.id=x.service_id where x.user_id=bm.user_id and ms.service_date>=svc.service_date-interval '8 weeks' and ms.service_date<svc.service_date) rc on true
    left join public.music_member_capabilities c on c.user_id=bm.user_id where bm.band_id=svc.band_id
    group by p.user_id,p.display_name,bm.is_leader,sa.status,rc.recent_service_count
  )
  select jsonb_build_object('ok',true,'service_id',p_service_id,'band_id',svc.band_id,'candidate_count',count(*),'candidates',coalesce(jsonb_agg(jsonb_build_object('user_id',user_id,'display_name',display_name,'score',score,'availability',availability,'recent_service_count',recent_service_count,'primary_capability_level',primary_capability_level,'reasons',to_jsonb(reason_array)) order by score desc),'[]'::jsonb),'human_approval_required',true,'data_gaps',case when count(*)=0 then jsonb_build_array('band_has_no_members') else jsonb_build_array() end) into result from candidate_base;
  return result;
end; $$;
grant execute on function public.os_plan_roster(uuid) to authenticated;
