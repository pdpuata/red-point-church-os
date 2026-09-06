# Red Point Church OS v10.0.0 — Autonomous Runtime

## What changed
- Enabled Supabase `pg_cron` 1.6.4 and `pg_net` 0.20.4.
- Added a one-minute production runtime scheduler.
- Added `os_autonomous_runtime_tick()` as the fail-closed execution loop.
- Runtime discovers music services in the next 7 days and idempotently queues Sunday Readiness and Worship Roster workflows.
- Runtime claims queued workflow dispatches with bounded concurrency and records workflow runs, verification and escalations.
- Deterministic handlers currently execute `sunday_readiness` and `worship_roster`; unsupported workflows fail closed rather than executing arbitrary mutations.
- Added `os_runtime_ticks` evidence ledger and `os_autonomous_runtime_health` security-invoker view.
- Added Control Tower Autonomous Runtime surface.

## Production evidence
- `pg_cron` active and scheduled job `red-point-os-v10-runtime` runs every minute.
- `pg_net` enabled for future service-to-service execution paths.
- Manual runtime tick verified: 3 services discovered, 6 dispatches claimed, 6 completed, 0 failed.
- Cron run detail verified a successful scheduled tick after deployment.

## Boundaries
- This release does not grant autonomous pastoral or theological authority.
- Unsupported workflow types fail closed.
- Agent action approval and tool permissions remain separate from workflow scheduling.
- A mobile build is not claimed tested merely because the backend runtime is live.
