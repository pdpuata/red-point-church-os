# Red Point Church OS v8.0.0 — Universal Agent Runtime

## What changed

Version 8 turns the existing AI control plane into an explicit, enforceable agent execution system.

### Agent execution contract
`Agent → Permission → Context → Tool → Action → Verification → Outcome → Audit → Learning`

### New production primitives
- `os_agent_tools` — explicit tool registry with risk, execution mode, handler, input and verification contracts.
- `os_agent_permissions` — per-agent permission level and entity scope.
- `os_agent_actions` — idempotent action queue with approval state, execution state, attempts and verification result.
- `os_agent_outcomes` — durable success/failure/escalation/no-op evidence.
- `os_agent_learning` — structured lessons from outcomes, overrides and human feedback.
- `os_agent_runtime_health` — operational health surface for every registered agent.
- `os_enqueue_agent_action` — validates agent, tool and permission before queuing work.
- `os_claim_agent_actions` — concurrency-safe worker claim with `SKIP LOCKED`.
- `os_approve_agent_action` — human approval gate for governed execution.
- `os_complete_agent_action` — closes the loop with verification and outcome evidence.

### Control Tower
Added **Universal Agent Runtime · v8** to expose agent health, pending approvals and safe work claiming.

## Safety model
- No generic arbitrary-data mutation tool exists.
- Execution requires a registered tool plus an explicit agent permission.
- High-risk and human-only tools cannot be silently executed.
- Idempotency keys prevent duplicate actions.
- Every completed action produces an outcome and audit event.

## Current limitation
The database runtime is now execution-ready, but a hosted scheduler/worker is not automatically enabled. Supabase currently supports scheduled Edge Function execution through `pg_cron` + `pg_net`; this project has neither extension enabled yet, so v8 does not pretend that autonomous background execution is live.
