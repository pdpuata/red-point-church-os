# Admin Runtime E2E Contract

## Purpose

The repository-side verifier proves source wiring and database policy contracts. This runtime verifier proves the same contract against a **controlled Supabase database** using a normal authenticated Admin account plus an unauthenticated public client.

## Safety gates

Runtime mutation is deliberately opt-in. The runner requires:

- `SUPABASE_E2E_URL`
- `SUPABASE_E2E_ANON_KEY`
- `SUPABASE_E2E_ADMIN_EMAIL`
- `SUPABASE_E2E_ADMIN_PASSWORD`
- `SUPABASE_E2E_ALLOW_MUTATIONS=true`
- `SUPABASE_E2E_CONFIRM=REDPOINT_TEST_DB`

Never put credentials in source control. Do not point this runner at production unless the operator has explicitly intended a controlled test there. Prefer a disposable/staging Supabase project.

## Events vertical slice

1. Authenticate as Admin.
2. Prove the account exists in `public.admin_users`.
3. Create a uniquely named unpublished event.
4. Read the draft back as Admin.
5. Edit the title and verify the returned state.
6. Publish and verify `published=true`.
7. Read the event through a public/unauthenticated client and verify visibility.
8. Unpublish and verify `published=false`.
9. Read through the public client and verify the row is hidden by RLS.
10. Delete the test event.
11. Read back as Admin and verify the row no longer exists.
12. Record every step in `artifacts/admin-workflow-e2e-*.json`.

## Commands

Contract-only:

`npm run admin-workflow-check`

Controlled runtime:

`npm run admin-workflow-e2e`

The runtime command intentionally blocks rather than mutating when the explicit safety gates are absent.
