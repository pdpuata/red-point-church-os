alter table public.events add column if not exists rsvp_enabled boolean not null default false;
alter table public.events add column if not exists rsvp_closes_at timestamptz;
alter table public.events add column if not exists meal_enabled boolean not null default false;
alter table public.events add column if not exists adult_meal_price numeric(10,2);
alter table public.events add column if not exists child_meal_price numeric(10,2);
alter table public.events add column if not exists guest_meal_price numeric(10,2);

create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  first_name text not null check (length(trim(first_name)) between 1 and 80),
  surname text not null check (length(trim(surname)) between 1 and 80),
  attending boolean not null,
  adults integer not null default 0 check (adults >= 0 and adults <= 20),
  children integer not null default 0 check (children >= 0 and children <= 20),
  guests integer not null default 0 check (guests >= 0 and guests <= 20),
  adult_meals integer not null default 0 check (adult_meals >= 0 and adult_meals <= 20),
  child_meals integer not null default 0 check (child_meals >= 0 and child_meals <= 20),
  guest_meals integer not null default 0 check (guest_meals >= 0 and guest_meals <= 20),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_rsvps_party_check check (attending = false or adults + children + guests > 0),
  constraint event_rsvps_meals_check check (not attending or (adult_meals <= adults and child_meals <= children and guest_meals <= guests)),
  constraint event_rsvps_not_attending_meals check (attending or (adults=0 and children=0 and guests=0 and adult_meals=0 and child_meals=0 and guest_meals=0))
);

create index if not exists event_rsvps_event_id_idx on public.event_rsvps(event_id);
create index if not exists event_rsvps_event_attending_idx on public.event_rsvps(event_id, attending);

alter table public.event_rsvps enable row level security;
revoke all on table public.event_rsvps from anon, authenticated;
grant insert on table public.event_rsvps to anon;
grant select, insert, update, delete on table public.event_rsvps to authenticated;

create policy "Public can submit event RSVP"
on public.event_rsvps for insert to anon
with check (exists (select 1 from public.events e where e.id = event_id and e.rsvp_enabled = true and (e.rsvp_closes_at is null or e.rsvp_closes_at > now())));

create policy "Admins can read event RSVPs"
on public.event_rsvps for select to authenticated using (public.is_admin());
create policy "Admins can update event RSVPs"
on public.event_rsvps for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete event RSVPs"
on public.event_rsvps for delete to authenticated using (public.is_admin());

create or replace function public.get_public_event_rsvp_summary(p_event_id uuid)
returns table (households_attending bigint,total_people bigint,total_meals bigint,not_attending bigint)
language sql security definer set search_path = public
as $$
  select count(*) filter (where r.attending),
    coalesce(sum(r.adults + r.children + r.guests) filter (where r.attending),0),
    coalesce(sum(r.adult_meals + r.child_meals + r.guest_meals) filter (where r.attending),0),
    count(*) filter (where not r.attending)
  from public.event_rsvps r
  where r.event_id = p_event_id
    and exists (select 1 from public.events e where e.id=p_event_id and e.rsvp_enabled=true);
$$;
revoke all on function public.get_public_event_rsvp_summary(uuid) from public, authenticated;
grant execute on function public.get_public_event_rsvp_summary(uuid) to anon;

create or replace function public.get_event_rsvp_summary(p_event_id uuid)
returns table (households_attending bigint,total_people bigint,total_adults bigint,total_children bigint,total_guests bigint,total_meals bigint,adult_meals bigint,child_meals bigint,guest_meals bigint,not_attending bigint)
language sql security invoker set search_path = public
as $$
  select count(*) filter (where attending), coalesce(sum(adults+children+guests) filter (where attending),0), coalesce(sum(adults) filter (where attending),0), coalesce(sum(children) filter (where attending),0), coalesce(sum(guests) filter (where attending),0), coalesce(sum(adult_meals+child_meals+guest_meals) filter (where attending),0), coalesce(sum(adult_meals) filter (where attending),0), coalesce(sum(child_meals) filter (where attending),0), coalesce(sum(guest_meals) filter (where attending),0), count(*) filter (where not attending)
  from public.event_rsvps where event_id=p_event_id;
$$;
revoke all on function public.get_event_rsvp_summary(uuid) from public, anon;
grant execute on function public.get_event_rsvp_summary(uuid) to authenticated;
