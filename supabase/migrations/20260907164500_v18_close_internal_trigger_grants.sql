-- Internal trigger functions are invoked by PostgreSQL, never by API clients.
revoke all on function public.os_emit_assignment_event() from public,anon,authenticated;
revoke all on function public.os_emit_service_event() from public,anon,authenticated;

-- The public roster-agent RPC remains authenticated/admin-gated; anonymous callers must never execute it.
revoke all on function public.os_run_setlist_operations_agent(uuid) from public,anon;
grant execute on function public.os_run_setlist_operations_agent(uuid) to authenticated;
