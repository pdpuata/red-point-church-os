# Architecture — Red Point Church OS

```text
Public / Staff Apps
        │
        ▼
Operational Domain Layer
        │
        ├── People / Teams / Roles
        ├── Events / Services / Worship
        ├── Content / Sermons / Announcements
        ├── Visitors / Follow-up
        ├── Ministries / Leaders / Training
        └── Production / Media / Notifications
        │
        ▼
Workflow + Readiness Engine
        │
        ├── triggers
        ├── rules
        ├── approvals
        ├── verification
        └── escalation
        │
        ▼
AI Operations Layer
        │
        ├── observe
        ├── diagnose
        ├── propose
        ├── execute bounded actions
        └── learn from outcomes
        │
        ▼
Control Tower + Audit / Evidence
        │
        ▼
Supabase system of record
```

## Architectural rule
No AI agent should write directly to arbitrary tables. It operates through bounded tools/workflows with explicit permissions and verification.

## Current implementation constraint
The existing app is a React Native / Expo application with Supabase. Preserve the working public app while progressively extracting operational logic from a monolithic App.tsx into domain services and workflows.

## Migration strategy
1. Stabilise current Admin paths.
2. Introduce typed domain operations.
3. Introduce workflow definitions and machine-readable evidence.
4. Introduce control-tower read models.
5. Introduce bounded AI tools.
6. Introduce event-driven/cron execution only after deterministic verification is reliable.
