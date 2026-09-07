-- Restore client-callable execution for authorization helpers used by the
-- worship admin surface. Authorization remains enforced by each function and
-- by the surrounding RLS/RPC checks; anon stays denied.

grant execute on function public.is_music_leader() to authenticated;
grant execute on function public.is_band_leader_of(uuid) to authenticated;
grant execute on function public.is_band_member_of(uuid) to authenticated;

revoke execute on function public.is_music_leader() from anon;
revoke execute on function public.is_band_leader_of(uuid) from anon;
revoke execute on function public.is_band_member_of(uuid) from anon;
