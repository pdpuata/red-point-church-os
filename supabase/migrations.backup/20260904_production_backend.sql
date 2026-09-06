-- Red Point Church V6.9 — Production backend reliability
-- Safe to run on an existing Red Point Church Supabase project.

-- Prevent duplicate sermon imports when YouTube sync is run repeatedly.
create unique index if not exists sermons_youtube_url_unique_idx
  on public.sermons (youtube_url)
  where youtube_url is not null;

-- Speed up public leadership reads and admin ordering.
create index if not exists leaders_public_order_idx
  on public.leaders (published, sort_order, name);

-- Speed up ministry listing and publishing checks.
create index if not exists ministries_public_order_idx
  on public.ministries (published, sort_order, title);

-- Keep common updated_at fields accurate where the column exists.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- site_settings is small, but the key lookup is already protected by its PK.
-- No additional public write policies are introduced here.
