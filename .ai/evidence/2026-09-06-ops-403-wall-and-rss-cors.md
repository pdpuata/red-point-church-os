# Evidence — Ops surface 403/400 wall + RSS CORS (2026-09-06)

Loop: Observe → Verify → Diagnose → Propose → Approve → Change → Verify → Record

## Observed (user-provided runtime console, Expo web on localhost:8081)

- CORS: `fetch https://www.redpointchurch.com/pinetown-podcast-feed?format=rss` blocked (no `Access-Control-Allow-Origin` on Squarespace).
- HTTP 403: `admin_qa_runs` insert; `os_people_directory`, `os_agent_runtime_health`, `os_workflow_runtime_health`, `os_operational_data_readiness`, `os_system_integrity_live`, `os_communication_queue`, `os_staff_control_tower`, `os_control_tower_attention`, `os_operational_activation`; `rpc/os_claim_workflow_dispatches`.
- HTTP 400: `rpc/os_register_people_source`, `rpc/os_publish_event`.

## Verified (repository)

- All failing calls originate from Admin → Ops (`src/os/ChurchOSControlTower.tsx` + sub-panels) and `runOperationalLoop` (App.tsx) — both render only behind a signed-in session, so requests ran as `authenticated`.
- Repo policy on `admin_qa_runs`: `for all to authenticated using (is_admin()) with check (is_admin())` → insert 403 means production evaluated `is_admin()` = false for the account.
- Repo grant pattern (`grant select to authenticated` + `is_admin()` RLS) would yield `200` empty rows for non-admins, not 403 → production grants/RLS on the `os_*` views differ from repo copies.
- v8–v14 migration files are parity markers ("Production DDL was applied through the Supabase migration API"); `supabase/remote_schema.sql` is empty → production truth for these objects is not inspectable from the repo.
- Repo `os_register_people_source` returns `{ok:false, reason:'admin_required'}` (HTTP 200) for non-admins → observed 400 implies production function differs (raised exception or signature drift).

## Diagnosis

1. Primary hypothesis: the signed-in account is not bootstrapped in `admin_users` (DEPLOYMENT_ORDER.md → Admin bootstrap), possibly compounded by production schema drift on v8–v14 objects.
2. RSS CORS is web-only; native fetches are unaffected. Root cause: no CORS headers on the upstream feed.

## Changed (approved)

- `supabase/ops_authorization_diagnostic.sql` — read-only diagnostic to run in the Supabase SQL editor (admin bootstrap, object existence, grants, security_invoker, RLS, RPC signatures/grants).
- `supabase/functions/sermon-rss/index.ts` + `[functions.sermon-rss] verify_jwt = false` in `supabase/config.toml` — public RSS proxy for web clients. NOT yet deployed (deploy step is human/CI).
- `App.tsx` — `fetchSermonRssXml()`: on web, fetch via `supabase.functions.invoke('sermon-rss')`; native unchanged (direct fetch + AsyncStorage cache fallback).
- `supabase/20260906_os_ops_grants_repair.sql` — DRAFT, NOT APPLIED, existence-guarded/idempotent; contingent on diagnostic output. If `admin_users` is empty, bootstrap is the fix, not grants.

## Verification results

- `npm run typecheck` — FAILED, pre-existing: App.tsx TS2322 (line 65, `source: 'rss'` widening in `extractRssItems`) and 4× TS18047 `supabase` possibly null (Admin lines 452–464). None implicate this change; no new errors introduced.
- `npm run admin-surface-check` — FAILED (crash): script requires `supabase/migrations/` which no longer exists (renamed to `migrations.backup` / `migrations.incomplete` after the 11:50 passing run today). Gate blocked by repo structure, not weakened.
- Live DB verification — BLOCKED: `admin-runtime-readiness` artifact shows missing SUPABASE_URL / keys / admin credentials; mutation gate closed (correct). The diagnostic SQL must be run manually in the Supabase dashboard.

## Unresolved

- Run `supabase/ops_authorization_diagnostic.sql` against production; record output here.
- Confirm admin bootstrap for the app account; only then consider applying `20260906_os_ops_grants_repair.sql`.
- Deploy `sermon-rss` edge function and re-test web RSS loading.
- Decide whether to restore `supabase/migrations/` or update `scripts/admin-surface-check.mjs` to point at the new layout (owner decision; gate must not be silently weakened).
- Pre-existing typecheck failures remain for a future task.
