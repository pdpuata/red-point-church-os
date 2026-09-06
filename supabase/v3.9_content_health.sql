-- Red Point Church V3.9 content reliability helpers.
-- No new tables are required. The app computes content health from existing records.
-- This migration is intentionally safe and exists as a versioned database checkpoint.

create index if not exists events_updated_at_idx on public.events (updated_at desc);
create index if not exists announcements_updated_at_idx on public.announcements (updated_at desc);
create index if not exists sermons_updated_at_idx on public.sermons (updated_at desc);
create index if not exists ministries_updated_at_idx on public.ministries (updated_at desc);
