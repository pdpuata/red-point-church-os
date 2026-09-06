# AI Next Task

Generated: 2026-09-06T16:18:52.760Z

## CRITICAL — Restore the reproducible dependency environment

**Why:** The repository cannot prove TypeScript/runtime integrity without installed pinned dependencies.

**Action:** Install dependencies from the repository lockfile/package manifest, then run npm run typecheck and npm run ai:loop again.

**Blocked by:** dependency installation/environment

## Loop

Observe → Verify → Diagnose → Propose → Approve → Change → Verify → Record

## Rule

Do not declare success from static structure alone. Runtime/database/device verification must be evidenced when required.
