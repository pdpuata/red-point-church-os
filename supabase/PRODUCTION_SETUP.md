# Supabase Production Setup

## 1. Create/select production project

Record the Supabase project reference. Do not paste secrets into the mobile app.

## 2. Database

Run migrations in the exact order in `DEPLOYMENT_ORDER.md`, preferably through `npm run deploy:backend` after reviewing them.

## 3. Storage

Confirm the `church-media` bucket exists and is public-read as intended by the media migration. Upload/replace/delete operations must remain restricted to authorised staff.

## 4. Edge Functions

Deploy `register-device`, `send-push`, `submit-visitor`, and `sync-youtube-sermons`.

## 5. Server secrets

Configure:

- `VISITOR_EMAIL_TO`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `YOUTUBE_API_KEY`

The Supabase service-role key must remain server-side and must never be bundled into Expo or committed to Git.

## 6. Admin

Create an Auth user and add its UUID to `admin_users`. Confirm admin-only RLS behavior.

## 7. Smoke test

Submit a test visitor form, register a test device, send a test notification, and run YouTube sermon sync. Confirm each result in the relevant Supabase tables/logs.
