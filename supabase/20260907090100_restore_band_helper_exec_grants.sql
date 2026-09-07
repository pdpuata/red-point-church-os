-- v17 hardened these helpers by revoking PUBLIC execution. The client-side
-- worship admin surfaces call them directly, so authenticated execution must
-- be restored while anonymous execution remains denied.

grant execute on function public.is_band_leader_of(uuid) to authenticated;
grant execute on function public.is_band_member_of(uuid) to authenticated;
revoke execute on function public.is_band_leader_of(uuid) from anon;
revoke execute on function public.is_band_member_of(uuid) from anon;
