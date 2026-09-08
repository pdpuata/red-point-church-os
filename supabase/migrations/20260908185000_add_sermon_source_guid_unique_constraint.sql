do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sermons_source_guid_unique'
      and conrelid = 'public.sermons'::regclass
  ) then
    alter table public.sermons
      add constraint sermons_source_guid_unique unique (source_guid);
  end if;
end $$;
