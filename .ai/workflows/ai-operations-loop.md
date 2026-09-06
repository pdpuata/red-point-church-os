# Workflow: AI Operations Loop

**Observe → Verify → Diagnose → Propose → Approve → Change → Verify → Record → Repeat**

## Default mode
Read-only verification.

## Mutation mode
Only bounded, explicitly approved operations. Each mutation must have:
- target
- reason
- expected result
- rollback/recovery
- actor
- timestamp
- post-change verification

## Failure handling
Create/update a repair-queue item. Do not hide the failure with fallback UI.
