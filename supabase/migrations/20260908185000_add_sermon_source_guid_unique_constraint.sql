alter table public.sermons
  add constraint sermons_source_guid_unique unique (source_guid);
