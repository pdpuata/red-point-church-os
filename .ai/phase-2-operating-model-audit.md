# Phase 2 — Whole-Church Operating Model Audit

Date: 2026-09-07

## Design test
For every recurring church workflow, ask:

1. Can the work be eliminated?
2. If not, can AI observe it?
3. Can AI decide the routine portion?
4. Can AI execute it safely?
5. What must remain human?
6. How is the outcome verified?
7. What should the system learn from the outcome?

## Current workflow map

| Workflow | Domain | Target mode | Current implementation |
|---|---|---|---|
| People Graph | People | Autonomous | Operational |
| People & Care | Pastoral | AI + approval | Designed |
| Visitor Follow-up | Pastoral | AI + approval | Partial |
| Worship Roster | Worship | AI + approval | Operational |
| Setlist Operations | Worship | AI + approval | Operational |
| Sunday Operating System | Operations | AI + approval | Operational |
| Sunday Readiness | Worship | Autonomous | Operational |
| Production Readiness | Production | AI + approval | Partial |
| Media Readiness | Production | Autonomous | Operational |
| Communication Routing | Communications | Autonomous | Operational |
| Events Operations | Events | AI + approval | Designed |
| Sermon Intelligence | Content | AI + approval | Designed |
| Discipleship Formation | Formation | AI + approval | Designed |
| Training | Development | AI + approval | Partial |
| Institutional Memory | Knowledge | AI + approval | Partial |
| Knowledge Memory | Knowledge | AI + approval | Designed |
| Equipment Stewardship | Assets | AI + approval | Designed |
| Financial Intelligence | Finance | AI + approval | Designed |
| Administration | Administration | Autonomous | Designed |
| Leadership Decision Support | Governance | Autonomous preparation | Designed |
| Risk Management | Risk | Autonomous | Designed |
| Operations Risk | Operations | Autonomous | Operational |
| Temporal Operations | Operations | Approval-gated | Partial |

## Human-only boundaries
- Pastoral judgement
- Elder-level decisions
- Doctrinal decisions
- Financial commitments/payments
- Consequential people decisions
- Sensitive communications
- Final approval of consequential roster changes

## Immediate build order
1. Make Event Fabric trigger real workflows automatically.
2. Complete People → capability → training loop.
3. Complete Sunday orchestration across worship, production and communications.
4. Activate pastoral follow-up with explicit human boundaries.
5. Close finance, equipment and administration loops.

## Current live snapshot
- 23 enabled workflows mapped.
- 7 have an operational automation path.
- 5 are partially operational.
- 11 are designed but not yet fully operational.
- 0 operational data-readiness blockers are currently reported by the operating-model RPC.
- The system already has a scheduled runtime and a scheduled setlist-analysis worker.

## Standard
Do not add an AI button where the correct design is for the system to perform the work automatically. Every new autonomous action must have an explicit permission boundary, idempotency, verification evidence and an escalation path.
