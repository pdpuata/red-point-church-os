# Red Point Church OS v7.5.16 — Temporal Operations

## Built
- Added a deterministic service timeline from T-21 through T+7.
- Added `os_service_timeline_definitions` as the canonical deadline model.
- Added security-invoker `os_service_timeline` view exposing stage, due time, state and priority.
- Added admin-gated `os_evaluate_service_timeline(uuid)` RPC with stable task keys and idempotent upsert behavior.
- Due/overdue stages become operational tasks; future stages remain visible without flooding the attention queue.
- Added Control Tower `RUN TEMPORAL OPERATIONS` surface and timeline evidence.
- No scheduler was installed. This release proves deterministic time logic before autonomous scheduling.

## Verification
- Live timeline verified against service `4eda8cac-35f8-43e1-8441-a70af3971405` for 2026-09-13.
- As of 2026-09-06, roster planning, confirmation risk and setlist deadline are overdue; media/host, rehearsal, Sunday gate and later stages remain future.
- Direct SQL invocation of the mutation RPC returned `admin_required`, confirming the authorization boundary; authenticated admin E2E still requires the app/device session.
- Full local TypeScript/build remains unverified because dependencies are not installed in the working container.

## Architectural significance
The Church OS is moving from a dashboard that reports state to a temporal operating system that knows when state should change and can surface exceptions before Sunday.
