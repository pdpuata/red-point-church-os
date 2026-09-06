# Red Point Church OS — Agent Operating Contract

This repository is an AI-native Church Operating System. Do not treat it as a collection of screens.

## Required startup sequence
1. Read `.ai/constitution.md`.
2. Read `.ai/architecture.md`.
3. Read `.ai/domain-model.md`.
4. Read the workflow relevant to the requested task under `.ai/workflows/`.
5. Read `.ai/tests/definition-of-done.md` and `.ai/tests/repository-gates.md`.
6. Inspect the actual code and Supabase migrations before proposing changes.
7. Run `npm run ai:loop` before substantial implementation when the environment permits.

## Operating rule
Use this loop:

Observe → Verify → Diagnose → Propose → Approve → Change → Verify → Record

The agent may inspect, reason, propose, code, test, and document. It must not pretend that a database mutation, production deployment, or physical-device click-through happened when it did not.

## Decision hierarchy
1. Eliminate unnecessary work/process.
2. Redesign the workflow if AI changes its economics.
3. Automate deterministic work.
4. Use AI for bounded judgment, drafting, detection, triage, and coordination.
5. Keep humans responsible for pastoral, theological, sensitive-person, financial, legal, publication, and consequential decisions unless explicitly approved.

## Definition of done
A feature is not done because a screen renders. It is done when the underlying workflow is operational, permissions are correct, errors are handled, verification exists, and evidence is recorded.

## Commands
- `npm run ai:loop` — inspect repository state and generate the next operational task/evidence.
- `npm run admin-surface-check` — verify Admin structural contracts.
- `npm run admin-agent -- plan` — generate the Admin verification plan.
- `npm run verify:admin` — run Admin gates when dependencies are installed.
- `npm run typecheck` — source verification.
- `npm run release-check` — release consistency verification.

When a gate is blocked by the environment, record it as blocked/unproven rather than weakening the gate.

### Controlled runtime E2E

When source/RLS contracts are green, use `npm run admin-workflow-e2e` against a controlled Supabase environment. The runner is mutation-gated and must never be treated as proof of runtime success when it is blocked. Store generated evidence in `artifacts/`.

## Runtime boundary gate

Before any controlled database E2E mutation, run `npm run admin-runtime-readiness`. Runtime tests must use a disposable/local or staging Supabase project and a dedicated Admin test account. Never weaken mutation gates or use a service-role key.
