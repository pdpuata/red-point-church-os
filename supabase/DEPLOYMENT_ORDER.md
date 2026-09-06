# Supabase Production Deployment Order

Run these migrations against the same production Supabase project, in this order. Review each migration in Supabase SQL Editor and confirm success before continuing.

1. `schema.sql`
2. `v2.6_media_upload.sql`
3. `v3.2_ministries.sql`
4. `v3.4_communication.sql`
5. `v3.9_content_health.sql`
6. `v4.0_production_readiness.sql`
7. `v4.1_qa_ux.sql`
8. `v4.7_sermon_library.sql`
9. `v4.8_leadership.sql`
10. `v4.9_contact.sql`
11. `v6.2_security_hardening.sql`
12. `migrations/20260903_v69_production_backend.sql`

## Storage

Confirm the `church-media` bucket exists and follows the policies in `v2.6_media_upload.sql`. Public users should be able to read published media URLs; only authorised staff should be able to upload, replace or delete media.

## Admin bootstrap

1. Create the staff member in Supabase Authentication.
2. Copy that user's Auth UUID.
3. Insert the UUID into `admin_users` using the project's existing admin policy/schema.
4. Sign into the app with that account.
5. Confirm that a non-admin account cannot access admin management actions.

## Edge Functions

Deploy:

- `register-device`
- `send-push`
- `submit-visitor`
- `sync-youtube-sermons`

Configure their required server-side secrets before testing production behavior.

### 20260905 — Admin AI operational loop
Apply `migrations/20260905_admin_ai_operational_loop.sql` after the existing Admin hardening migration. It creates persistent QA run/result/repair records and the admin operational snapshot RPC.
