-- v17: materialize the authoritative Sunday leader roster into music_services.
-- This is intentionally idempotent and preserves the pasted source label in notes.
with roster(service_date, assigned) as (values
('2026-05-10'::date,'Mikey (Peter)'),('2026-05-17'::date,'Erin'),('2026-05-24'::date,'Manon'),('2026-05-31'::date,'Peter; Mikey – PM'),('2026-06-07'::date,'Kelsey'),('2026-06-14'::date,'Alexa'),('2026-06-21'::date,'Peter'),('2026-06-28'::date,'Mikey (Bryce); Erin – PM'),('2026-07-05'::date,'Manon'),('2026-07-12'::date,'Peter'),('2026-07-19'::date,'Mikey'),('2026-07-26'::date,'Kelsey; Manon – PM'),('2026-08-02'::date,'Peter'),('2026-08-09'::date,'Mikey (Bryce)'),('2026-08-16'::date,'Erin'),('2026-08-23'::date,'Alexa'),('2026-08-30'::date,'Peter; Mikey – PM'),('2026-09-06'::date,'Kelsey')),
parsed as (select r.service_date,r.assigned,trim(split_part(r.assigned,';',1)) as primary_label from roster r),
normalized as (select service_date,assigned,trim(regexp_replace(primary_label,'\s*\([^)]*\)','')) as leader_name from parsed)
insert into public.music_services(title,service_date,starts_at,service_type,status,notes,created_at,updated_at,band_id)
select 'Sunday Service', n.service_date, (n.service_date::timestamp at time zone 'Africa/Johannesburg') + interval '9 hours', 'sunday_service','scheduled','Imported from RED POINT CHURCH BAND ROSTER MAY - SEPTEMBER 2026: '||n.assigned,now(),now(),b.id
from normalized n join public.bands b on lower(b.name)=lower(n.leader_name) and b.active
where not exists (select 1 from public.music_services s where s.service_date=n.service_date and s.service_type='sunday_service');
