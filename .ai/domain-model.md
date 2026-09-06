# Domain Model

## Primary entities
People, Teams, Roles, Ministries, Leaders, Events, Services, Songs, Setlists, Assignments, Availability, Tasks, Communications, Announcements, Sermons, Visitors, Training, Media, Production, Notifications, Documents, Knowledge, Workflows, Approvals, Readiness Checks, Incidents, Decisions, Audit Logs, AI Actions, QA Runs, QA Results, Repair Queue.

## Every operational object should converge on
- id
- owner
- status
- created_at / updated_at
- source of truth
- dependencies
- permissions
- history/audit
- automation eligibility
- verification state

## Current Admin surfaces
Events; Announcements; Sermons; Visitors; Ministries; Leaders; Home; Contact; Notifications; Media; Sunday Readiness; Release Check; AI Operations.

## Operational state model
Draft → Ready → Published/Active → Completed/Expired → Archived.

Failures are first-class states, not console logs.
