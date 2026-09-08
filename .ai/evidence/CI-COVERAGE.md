# CI Verification Coverage

## Purpose

CI is the repository's regression gate. It verifies deterministic source, build, Admin-surface, and Admin-workflow contracts on every push and pull request.

## Automatic gates

Every push and pull request runs:

1. `npm ci` — reproducible dependency installation.
2. `npx expo-doctor` — Expo/project health.
3. `npm run release-check` — release/version consistency.
4. `npm run typecheck` — TypeScript correctness.
5. `npm run ai:loop` — operational-loop integrity and canonical-source checks.
6. `npm run admin-surface-check` — declared Admin routes and operational hooks remain wired.
7. `npm run admin-workflow-check` — mapped Admin actions retain their source-operation-RLS contracts.
8. `npm run verify:admin` — aggregate Admin contract gate.

## Controlled runtime gate

`workflow_dispatch` exposes a separate `admin-e2e` job. It requires staging GitHub Actions secrets and runs:

- `npm run admin-runtime-readiness`
- `npm run admin-workflow-e2e`

This separation is deliberate: ordinary pushes and pull requests must never mutate a Supabase project. The E2E runner is mutation-gated and must use a controlled staging/local environment, never a service-role credential.

## What CI proves

- The checked-in TypeScript compiles.
- Expo project health passes.
- Release consistency passes.
- The operational AI loop passes its repository checks.
- The expected Admin surface exists.
- Mapped Admin CRUD/publish workflows retain their source and RLS contracts.
- When the manual staging gate is run successfully, the real Admin → Auth → RLS → Supabase lifecycle is exercised by the controlled E2E suite.

## What CI does not claim automatically

A green automatic CI run is not proof that every possible UI interaction on a physical device has been pressed and observed. Native-device behavior, visual layout, accessibility perception, and every possible user path require dedicated UI/device testing.

The correct standard is therefore **critical workflow coverage with explicit evidence boundaries**, not the false claim that a static CI run has tested literally every possible interaction.
