create or replace view public.os_people_workload with (security_invoker=true) as
with service_history as (
  select sa.user_id,
         count(*) filter(where ms.service_date >= current_date - interval '8 weeks')::int services_8w,
         count(*) filter(where ms.service_date >= current_date - interval '4 weeks')::int services_4w,
         count(*) filter(where ms.service_date >= current_date - interval '2 weeks')::int services_2w,
         max(ms.service_date) last_service_date
  from public.service_assignments sa
  join public.music_services ms on ms.id=sa.service_id
  group by sa.user_id
), role_counts as (
  select user_id,string_agg(role,', ' order by role) roles from public.music_roles group by user_id
), band_counts as (
  select user_id,count(*)::int band_count from public.band_memberships group by user_id
)
select p.user_id,p.display_name,p.email,
       coalesce(sh.services_8w,0) services_8w,
       coalesce(sh.services_4w,0) services_4w,
       coalesce(sh.services_2w,0) services_2w,
       sh.last_service_date,
       coalesce(rc.roles,'') roles,
       coalesce(bc.band_count,0) band_count,
       case when coalesce(sh.services_8w,0)>=6 then 'high'
            when coalesce(sh.services_8w,0)>=4 then 'medium'
            else 'low' end workload_band
from public.profiles p
left join service_history sh on sh.user_id=p.user_id
left join role_counts rc on rc.user_id=p.user_id
left join band_counts bc on bc.user_id=p.user_id;

grant select on public.os_people_workload to authenticated;
