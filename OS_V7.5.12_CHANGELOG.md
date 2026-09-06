# Red Point Church OS v7.5.12

## Closed-loop roster approval

This release closes the first consequential Church OS loop:

**plan → propose → human approve/reject → assignment → pending confirmation → audit**

### Backend
- Added `os_save_roster_recommendations(uuid,jsonb)`.
- Added `os_approve_roster_recommendation(uuid,text)`.
- Added `os_reject_roster_recommendation(uuid,text)`.
- Roster planner now emits an explicit `responsibility` derived from primary capability / capability evidence, with `musician` only as a fallback.
- Approval is admin-gated and idempotent against the existing service/user/responsibility unique constraint.
- Approval creates `service_assignments` with `active` + `pending` confirmation.
- Approval/rejection creates decision and audit records.

### UI
- Added Roster Approval Loop to the Control Tower.
- Proposed recommendations can be approved or rejected by a human.
- Created assignments and confirmation status are visible immediately.

### Safety
- AI/deterministic planning cannot directly assign people.
- Human approval remains mandatory.
- No assignment is marked confirmed by the system.
- Backend mutations use `security invoker` and explicit authenticated grants, with admin authorization through `is_admin()`.

### Verification
- `os_plan_roster` executes successfully for the current service.
- New RPCs exist in production.
- Current data still contains no band memberships/service assignments, so the planner correctly returns zero candidates rather than inventing roster data.
