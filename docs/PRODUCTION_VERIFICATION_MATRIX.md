# Red Point Church OS — Production Verification Matrix

Updated: 2026-09-06

This document is the release truth for v14. A feature is **GREEN** only when its expected operation has been exercised at the appropriate boundary and the resulting state is observable. Static code presence is not runtime proof.

## Status definitions

- **GREEN** — verified at the relevant runtime/database boundary.
- **AMBER** — implemented and partially verified, but missing a required runtime, device, or end-to-end proof.
- **RED** — known failure or security defect.
- **BLOCKED** — cannot be fairly tested because prerequisite operational data/environment is absent.

## Current matrix

| Surface | Read | Mutation | Security | Verification | AI/autonomy | Status |
|---|---|---|---|---|---|---|
| Authentication / admin gate | verified structurally | n/a | admin_users + RLS present | live DB admin row exists | n/a | AMBER |
| Control Tower | live DB read verified | RPCs present | authenticated SELECT verified; anon denied | integrity view exposes evidence | runtime loop present | AMBER |
| People & capability | live schema | RPCs present | RLS verified | data graph incomplete | blocked by data | BLOCKED |
| Worship roster | live services/read model | roster RPCs present | RLS verified | `os_check_roster` executed for a real service and correctly reported missing assignments | AI reasoning function deployed | BLOCKED |
| Sunday operations | derived data present | operating-loop RPC present | RLS verified | not yet exercised end-to-end | AI-ready by integrity model | AMBER |
| Events | schema + public/admin policies present | controlled E2E verifier exists | RLS present | controlled E2E not yet executed against a dedicated migrated test DB | not primary | AMBER |
| Announcements | schema + policies present | CRUD surface exists | RLS present | runtime mutation proof missing | partial | AMBER |
| Sermons | 100 DB rows + RSS path | sync functions deployed | RLS present | RSS path exists; full device/runtime proof missing | partial | AMBER |
| Ministries | schema present, zero rows | CRUD surface exists | RLS present | no mutation proof | partial | BLOCKED |
| Leaders | schema present, zero rows | CRUD surface exists | RLS present | no mutation proof | partial | BLOCKED |
| Visitors | schema present, zero submissions | status workflow exists | RLS present | no real submission/status E2E | blocked by data | BLOCKED |
| Communications | queue exists | communication RPCs + push function | RLS present; push function JWT protected | no delivery proof; zero active device tokens | automation present | BLOCKED |
| Notifications | history schema present | send-push deployed | JWT protected | no real-device delivery proof | partial | AMBER |
| Institutional memory | knowledge schema + data present | refresh RPC exists | RLS present | no runtime learning verification | blocked by missing workflow | AMBER |
| Agent runtime | 10 agents / tools / permissions present | action lifecycle RPCs present | RLS present | 0 agent runs currently observed | architecture ready | AMBER |
| Autonomous runtime | runtime ticks exist (264 observed) | tick RPC is internal-only | authenticated execution boundary | dispatch completion path needs controlled E2E proof | intended autonomy | AMBER |
| Adaptive learning | learning tables + 4 cycles present | learning-cycle RPC exists | RLS present | no new verified agent outcome yet | intended learning | AMBER |
| AI roster reasoning | Edge Function active, v6 | read-only reasoning path | JWT + admin authorization | live invocation with a real user token not yet evidenced in this audit | LLM reasoning only; no direct mutation | AMBER |
| Release/runtime | CI exists | n/a | n/a | historical repository loop blocked by missing node_modules in its captured environment | n/a | AMBER |

## Live database evidence captured 2026-09-06

- Supabase project is `ACTIVE_HEALTHY`.
- `os_staff_control_tower` now grants SELECT to `authenticated` and denies `anon`.
- All 46 public `os_*` functions were audited for execution privileges: 44 are executable by `authenticated`; none are executable by `anon` after the production hardening migration. Two are internal-only and not executable by authenticated users.
- `admin_users` contains one administrator row.
- There are 3 music services, 3 active bands, 1 profile, 1 music role, 1 capability, 0 band memberships and 0 service assignments.
- There are 10 agents, 6 tools, 32 agent permissions, 0 agent runs, 7 workflow runs, 16 open operational tasks, 264 runtime ticks, 1 event, 23 knowledge nodes and 6 knowledge edges.
- The system-integrity view currently classifies People, Worship Roster, Visitors, Communications and Knowledge as blocked by missing operational prerequisites; Sunday Operations, Content and AI Operations still have unverified runtime/mutation boundaries.
- `os_check_roster` was executed as the authenticated administrator for service `3f617ebe-dd88-46cd-a0ef-735ec0b00320`. It correctly returned `band_assigned = pass`, `roster_exists = fail`, and `roster_confirmation = fail` because there are zero assignments.
- Edge Functions `os-roster-ai-v1` and `os-people-import-ai-v1` are active and JWT-protected. `send-push`, `sync-youtube-sermons`, `sync-squarespace-sermons`, `sync-podcast-sermons`, and the two Sunday-readiness functions are also active and JWT-protected.

## Security findings remaining

1. Supabase security advisor reports `admin_users`, `os_service_timeline_definitions`, and `visitor_rate_limits` have RLS enabled without policies. These may be intentionally deny-all tables, but this should be explicitly documented or reviewed.
2. Supabase reports several SECURITY DEFINER functions executable by `authenticated`. This is acceptable only where the function itself performs authorization. The OS RPCs must retain explicit authorization checks; do not remove security-definer status blindly.
3. `pg_net` is installed in `public`; review whether it should be moved to a private extension schema.
4. Supabase reports several RLS init-plan performance warnings and duplicate/unused indexes. These are optimization work, not blockers for the first functional release, but should be cleaned up before scale.

## Release gate

Do **not** call v14 fully production-ready until all of the following are true:

1. `npm ci` succeeds in a clean environment.
2. `npx expo-doctor` passes.
3. `npm run release-check` passes.
4. `npm run typecheck` passes.
5. `npm run ai:loop` passes after dependency installation.
6. A dedicated test/staging Supabase project is migrated from the repository migrations.
7. Controlled Admin E2E passes for Events and is expanded to the other consequential Admin surfaces.
8. At least one complete AI operational loop is evidenced as: **detect → understand → decide → propose/execute → mutate → verify → record → learn/retry**.
9. Real Expo-device testing verifies every consequential button/path, including authentication, admin operations, notifications and the AI Operations surface.
10. Production evidence is recorded in this matrix and in machine-readable artifacts.

## Strategic principle

The goal is not to prove that the app has many screens. The goal is to prove that the church has an operating system that can repeatedly observe reality, take bounded action, verify outcomes and improve — with humans retaining authority over consequential decisions.
