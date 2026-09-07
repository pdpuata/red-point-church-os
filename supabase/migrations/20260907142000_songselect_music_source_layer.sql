alter table public.music_songs
  add column if not exists songselect_url text,
  add column if not exists songselect_song_id text,
  add column if not exists songselect_synced_at timestamptz,
  add column if not exists copyright_status text not null default 'unknown',
  add column if not exists lyrics_available boolean not null default false,
  add column if not exists chord_sheet_available boolean not null default false,
  add column if not exists lead_sheet_available boolean not null default false,
  add column if not exists vocal_sheet_available boolean not null default false,
  add column if not exists chordpro_available boolean not null default false;

create unique index if not exists music_songs_songselect_song_id_uidx on public.music_songs(songselect_song_id) where songselect_song_id is not null;
create index if not exists music_songs_songselect_url_idx on public.music_songs(songselect_url) where songselect_url is not null;

create or replace function public.os_upsert_songselect_song(
  p_title text,
  p_artist text default null,
  p_ccli_reference text default null,
  p_songselect_song_id text default null,
  p_songselect_url text default null,
  p_default_key text default null,
  p_bpm integer default null,
  p_lyrics_available boolean default false,
  p_chord_sheet_available boolean default false,
  p_lead_sheet_available boolean default false,
  p_vocal_sheet_available boolean default false,
  p_chordpro_available boolean default false,
  p_copyright_status text default 'licensed'
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_title text := nullif(trim(p_title), '');
  v_existing public.music_songs%rowtype;
begin
  if not public.is_admin() then return jsonb_build_object('ok', false, 'reason', 'admin_required'); end if;
  if v_title is null then return jsonb_build_object('ok', false, 'reason', 'title_required'); end if;
  if p_copyright_status not in ('unknown','licensed','public_domain') then return jsonb_build_object('ok', false, 'reason', 'invalid_copyright_status'); end if;

  if p_songselect_song_id is not null then select * into v_existing from public.music_songs where songselect_song_id = p_songselect_song_id limit 1; end if;
  if v_existing.id is null and p_ccli_reference is not null then select * into v_existing from public.music_songs where ccli_reference = p_ccli_reference limit 1; end if;
  if v_existing.id is null then select * into v_existing from public.music_songs where lower(title) = lower(v_title) limit 1; end if;

  if v_existing.id is null then
    insert into public.music_songs(title, artist, active, default_key, bpm, ccli_reference, notes, songselect_url, songselect_song_id, songselect_synced_at, copyright_status, lyrics_available, chord_sheet_available, lead_sheet_available, vocal_sheet_available, chordpro_available)
    values (v_title, nullif(trim(p_artist), ''), true, nullif(trim(p_default_key), ''), p_bpm, nullif(trim(p_ccli_reference), ''), 'SongSelect/CCLI metadata source', nullif(trim(p_songselect_url), ''), nullif(trim(p_songselect_song_id), ''), now(), p_copyright_status, coalesce(p_lyrics_available,false), coalesce(p_chord_sheet_available,false), coalesce(p_lead_sheet_available,false), coalesce(p_vocal_sheet_available,false), coalesce(p_chordpro_available,false))
    returning id into v_id;
  else
    update public.music_songs set title=v_title, artist=coalesce(nullif(trim(p_artist), ''),artist), default_key=coalesce(nullif(trim(p_default_key), ''),default_key), bpm=coalesce(p_bpm,bpm), ccli_reference=coalesce(nullif(trim(p_ccli_reference), ''),ccli_reference), songselect_url=coalesce(nullif(trim(p_songselect_url), ''),songselect_url), songselect_song_id=coalesce(nullif(trim(p_songselect_song_id), ''),songselect_song_id), songselect_synced_at=now(), copyright_status=p_copyright_status, lyrics_available=coalesce(p_lyrics_available,lyrics_available), chord_sheet_available=coalesce(p_chord_sheet_available,chord_sheet_available), lead_sheet_available=coalesce(p_lead_sheet_available,lead_sheet_available), vocal_sheet_available=coalesce(p_vocal_sheet_available,vocal_sheet_available), chordpro_available=coalesce(p_chordpro_available,chordpro_available), updated_at=now() where id=v_existing.id returning id into v_id;
  end if;

  if p_songselect_url is not null and length(trim(p_songselect_url)) > 0 then
    insert into public.music_resources(title, resource_type, url, song_id, active)
    select v_title || ' · SongSelect', 'link', trim(p_songselect_url), v_id, true
    where not exists (select 1 from public.music_resources where song_id=v_id and resource_type='link' and url=trim(p_songselect_url));
  end if;

  return jsonb_build_object('ok', true, 'song_id', v_id, 'action', case when v_existing.id is null then 'created' else 'updated' end);
end;
$$;

revoke all on function public.os_upsert_songselect_song(text,text,text,text,text,text,integer,boolean,boolean,boolean,boolean,boolean,text) from public, anon;
grant execute on function public.os_upsert_songselect_song(text,text,text,text,text,text,integer,boolean,boolean,boolean,boolean,boolean,text) to authenticated;
revoke all on table public.music_songs from anon;
grant select on table public.music_songs to authenticated;
revoke all on table public.music_resources from anon;
grant select on table public.music_resources to authenticated;
