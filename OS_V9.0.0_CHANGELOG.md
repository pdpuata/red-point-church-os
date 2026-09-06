# Red Point Church OS v9.0.0 — Event & State Fabric

## Architectural shift
The Church OS now has a durable event layer between organisational state and workflow execution.

## Added
- `os_events` durable, idempotent event ledger
- `os_event_subscriptions` workflow/consumer routing
- `os_event_deliveries` delivery state and linkage to dispatches
- `os_publish_event(...)` admin-gated event publisher
- `os_event_fabric_health` operational health view
- seeded service/readiness/roster event subscriptions
- `EventFabricOS` Control Tower surface
- client methods for event health and publication

## Safety
Events do not grant permissions. Workflow dispatch and Universal Agent Runtime permissions remain separate enforcement boundaries.

## Verification
Production migration applied and schema queried successfully. Runtime event publication remains admin-authenticated and should be E2E tested from the app/device.
