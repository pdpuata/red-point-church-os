# Red Point Church OS v18.0.0 — AI-Native Operating Model

## Purpose
Phase 2 moves the system from a collection of AI-enabled features toward an explicit church operating model.

## Operating principle
> The system should manage the workflow; humans should manage judgement, relationships and consequential decisions.

## Added
- 23 enabled organisational workflows mapped across people, pastoral care, worship, production, communications, events, content, formation, development, knowledge, assets, finance, administration, governance, operations and risk.
- Each workflow now declares trigger type, automation level, human-approval boundary, AI responsibilities, execution responsibilities and success metric.
- `os_get_ai_operating_model()` provides an admin-only operating-model read model.
- `AIOperatingModelOS` surfaces the operating model in the existing Church OS capability surface.
- Scheduled setlist operations worker runs every 5 minutes and evaluates upcoming services without requiring a human to press an AI button.
- Scheduled setlist analysis is idempotent over a 30-minute window and records agent run/action verification evidence.

## Current maturity snapshot
- 7 workflows have an operational automation path.
- 5 workflows are partially operational.
- 11 workflows are designed but still require implementation work.
- The model intentionally does not claim whole-church autonomy yet.

## Safety boundaries
- Elder-level decisions remain human.
- Pastoral judgement remains human.
- Financial commitments remain human.
- Doctrinal decisions remain human.
- Consequential roster changes remain approval-gated.
- Autonomous operations are restricted to low-risk, verifiable work.

## Verification
- Live operating-model RPC tested under the admin identity.
- Live scheduled AI operation executed successfully against the upcoming service and recorded a verified agent run/action.
- Anonymous/client execution of internal scheduled worker remains revoked.
