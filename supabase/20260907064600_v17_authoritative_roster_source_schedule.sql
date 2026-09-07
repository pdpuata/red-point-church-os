create table if not exists public.music_roster_source_schedule (
  id uuid primary key default gen_random_uuid(),
  roster_date date not null unique,
  day_label text not null check (day_label in ('Thu','Sun')),
  assigned_label text not null default '',
  primary_leader text,
  secondary_label text,
  source_name text not null default 'RED POINT CHURCH BAND ROSTER MAY - SEPTEMBER 2026',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.music_roster_source_schedule enable row level security;
drop policy if exists "admins manage roster source schedule" on public.music_roster_source_schedule;
create policy "admins manage roster source schedule" on public.music_roster_source_schedule for all to authenticated using (public.is_admin()) with check (public.is_admin());
revoke all on public.music_roster_source_schedule from anon;
grant select,insert,update,delete on public.music_roster_source_schedule to authenticated;

with roster(roster_date,day_label,assigned_label,primary_leader,secondary_label) as (values
('2026-05-07'::date,'Thu','Peter','Peter',null),('2026-05-10'::date,'Sun','Mikey (Peter)','Mikey','Peter'),('2026-05-14'::date,'Thu','Mikey & Tristan','Mikey','Tristan'),('2026-05-17'::date,'Sun','Erin','Erin',null),('2026-05-21'::date,'Thu','Kelsey & Bryce','Kelsey','Bryce'),('2026-05-24'::date,'Sun','Manon','Manon',null),('2026-05-28'::date,'Thu','Mervin & Ruth','Mervin','Ruth'),('2026-05-31'::date,'Sun','Peter; Mikey – PM','Peter','Mikey – PM'),('2026-06-04'::date,'Thu','Peter','Peter',null),('2026-06-07'::date,'Sun','Kelsey','Kelsey',null),('2026-06-11'::date,'Thu','Mervin & Ruth','Mervin','Ruth'),('2026-06-14'::date,'Sun','Alexa','Alexa',null),('2026-06-18'::date,'Thu','Peter','Peter',null),('2026-06-21'::date,'Sun','Peter','Peter',null),('2026-06-25'::date,'Thu','Mervin & Ruth','Mervin','Ruth'),('2026-06-28'::date,'Sun','Mikey (Bryce); Erin – PM','Mikey','Bryce; Erin – PM'),('2026-07-02'::date,'Thu','Kelsey & Bryce','Kelsey','Bryce'),('2026-07-05'::date,'Sun','Manon','Manon',null),('2026-07-09'::date,'Thu','Mikey','Mikey',null),('2026-07-12'::date,'Sun','Peter','Peter',null),('2026-07-16'::date,'Thu','Alexa','Alexa',null),('2026-07-19'::date,'Sun','Mikey','Mikey',null),('2026-07-23'::date,'Thu','Mervin & Ruth','Mervin','Ruth'),('2026-07-26'::date,'Sun','Kelsey; Manon – PM','Kelsey','Manon – PM'),('2026-07-30'::date,'Thu','Peter','Peter',null),('2026-08-02'::date,'Sun','Peter','Peter',null),('2026-08-06'::date,'Thu','','',null),('2026-08-09'::date,'Sun','Mikey (Bryce)','Mikey','Bryce'),('2026-08-13'::date,'Thu','Mikey','Mikey',null),('2026-08-16'::date,'Sun','Erin','Erin',null),('2026-08-20'::date,'Thu','Kelsey & Bryce','Kelsey','Bryce'),('2026-08-23'::date,'Sun','Alexa','Alexa',null),('2026-08-27'::date,'Thu','Mervin & Ruth','Mervin','Ruth'),('2026-08-30'::date,'Sun','Peter; Mikey – PM','Peter','Mikey – PM'),('2026-09-03'::date,'Thu','Peter','Peter',null),('2026-09-06'::date,'Sun','Kelsey','Kelsey',null))
insert into public.music_roster_source_schedule(roster_date,day_label,assigned_label,primary_leader,secondary_label)
select roster_date,day_label,assigned_label,nullif(primary_leader,''),secondary_label from roster
on conflict (roster_date) do update set day_label=excluded.day_label,assigned_label=excluded.assigned_label,primary_leader=excluded.primary_leader,secondary_label=excluded.secondary_label,updated_at=now();
