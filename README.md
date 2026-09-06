# Red Point Church App — V6.4

This is a substantially more complete V1 foundation for the Red Point Church iOS + Android app.

## What is now included

### Public app
- Home / current church noticeboard
- Events loaded from Supabase when configured, with safe fallback content for development
- Announcements loaded from Supabase
- Searchable sermon library with individual sermon detail pages
- YouTube sermon sync: staff can import new videos from the church YouTube channel without typing them in manually
- I'm New flow using current Red Point Church information
- Visitor form routed through a Supabase Edge Function
- Visitor submissions are persisted in Supabase before notification email is sent
- Life Groups and church information link to the official church website
- Large controls, readable typography and accessibility roles on primary controls
- Four simple primary destinations: Home, Events, Sermons, More
- Push-notification registration is opt-in from More (not requested on first launch)

### Staff/admin
- Secure Supabase email/password sign-in
- Admin allow-list using `admin_users`
- Create/publish events, announcements and sermons
- Delete published content
- Send push notifications to registered devices with a destination (Home, Events, Announcements, or Sermons)
- Tapping a notification opens the relevant app section
- Visitor submissions are stored with a simple new/contacted/closed workflow for staff follow-up

### Backend
- Supabase Postgres schema
- Row Level Security
- Admin content policies
- Visitor submission persistence
- Device-token registry
- `submit-visitor` Edge Function
- `register-device` Edge Function
- `send-push` Edge Function
- `sync-youtube-sermons` Edge Function

## Important honesty

This source is **not yet a published production app**. It is a production-oriented source foundation. Actual production still requires:

1. A real Supabase project
2. Supabase Auth admin account(s)
3. Resend sender/domain setup
4. EAS project and push credentials
5. Final logo/app icon/splash assets
6. Privacy policy and app-store metadata
7. Apple Developer and Google Play developer accounts
8. A Google Cloud project with the YouTube Data API v3 enabled and a YouTube API key stored as the Supabase secret `YOUTUBE_API_KEY`
9. The `sync-youtube-sermons` function deployed and `EXPO_PUBLIC_SYNC_YOUTUBE_FUNCTION_URL` added to `.env`
10. A real-device QA pass and release build

The source has been structurally inspected, but a full runtime/native build could not be completed in this environment because npm dependency installation timed out. Do not treat the ZIP as proof of a successful native build until `npm install`, `npm run typecheck`, and an EAS development/preview build succeed.

## Setup

Use Node.js 22.13+ for Expo SDK 57.

```bash
npm install
npm run typecheck
npx expo start
```

Expo Router is not required for this V1.4 build; the app deliberately keeps navigation simple while the product is being validated. Expo currently recommends Expo Router for larger multi-screen Expo apps, so a later V1.4 refactor can move to file-based routes without changing the database contract.

## Supabase

1. Create a Supabase project.
2. Run `supabase/schema.sql` in SQL Editor.
3. Create an admin user under Authentication > Users.
4. Copy the user's UUID and insert it into `public.admin_users`.
5. Deploy all three functions.
6. Set function secrets for `submit-visitor`: `VISITOR_EMAIL_TO`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
7. Ensure the functions have access to Supabase's service role secret through the platform environment.
8. Put the public Supabase URL/key and function URLs in `.env`.

Never put a Supabase service-role key, Resend API key, or other secret in the mobile app.

## Current Red Point Church sources

- Website: https://www.redpointchurch.com
- YouTube: https://www.youtube.com/@redpointchurch
- Sunday: 9:00 AM
- Thursday Prayer: 5:30 PM
- Red Riot Youth: Friday 7:00 PM
- Address: 80A Caversham Road / 90 Seventh Avenue, Ashley, Pinetown, KwaZulu-Natal

## Push notifications

Push registration is intentionally opt-in through the operating system. Expo's push system requires a development/release build for remote push testing; Expo Go is not sufficient for Android remote push testing on SDK 53+.

Set `EXPO_PUBLIC_EAS_PROJECT_ID` after creating/linking the EAS project. Then build a development or preview binary and test notification permission + delivery on real devices.


## YouTube sermon sync (V1.6)

The staff dashboard now has **SYNC YOUTUBE NOW**. The backend resolves the `@redpointchurch` handle with YouTube's `channels.list`, gets the channel uploads playlist, then reads the uploads with `playlistItems.list`. This is preferable to repeatedly using YouTube `search.list` because Google's documentation notes that `search.list` is much more quota-expensive and specifically recommends the uploads playlist for reliably retrieving a channel's recent uploads.

Setup:
1. In Google Cloud, enable YouTube Data API v3 and create an API key.
2. In Supabase Edge Function secrets, add `YOUTUBE_API_KEY`. Never put this key in the Expo app.
3. Deploy `supabase/functions/sync-youtube-sermons`.
4. Add `EXPO_PUBLIC_SYNC_YOUTUBE_FUNCTION_URL` to `.env`.
5. Open Staff / Admin in the app and tap **SYNC YOUTUBE NOW**.

Newly imported videos are deliberately **hidden until a staff member publishes them**. This prevents unrelated uploads, livestreams or Shorts from automatically becoming public sermons. The importer checks the channel's uploads playlist and skips videos already present in the sermon library.


## V1.7 notification routing

Staff can now choose where a push notification should open when tapped. The push payload carries a simple screen target, and the app routes the user directly to Home, Events, Announcements, or Sermons. This keeps notifications useful rather than merely opening the app.

## V1.8 — Church Admin Control Centre
- Added admin dashboard summary counts for events, announcements, sermons and new visitors.
- Added a private visitor inbox with contact, mark contacted, close and reopen actions.
- Added attention indicators for new visitor submissions and unpublished sermon drafts.
- Added registered notification-device count.


## V2.4 — Simple Staff Workflow
The admin area is now organised around a simple workflow: **Choose task → Create/Review → Save Draft or Publish → Done**.

- Quick actions open the actual task screen instead of telling staff to scroll.
- Events, announcements and sermons can be saved as drafts or published immediately.
- The dashboard shows content and visitor items that need attention.
- YouTube sermon imports remain drafts until staff review and publish them.
- Staff can return to the dashboard at any time and still access edit, publish/unpublish and delete controls.
- The public app remains unchanged and continues to prioritise large controls and simple navigation.


## V2.4 — Content Preview
Staff can preview an event, announcement, or sermon before publishing. Preview actions clearly distinguish edit, save draft, and publish. Publishing still requires confirmation.

## V2.6 — Church Media Upload
Admins can choose a photo from an iPhone/Android photo library and upload it to the public `church-media` Supabase Storage bucket. Events, announcements and sermons can each have an image. Run `supabase/v2.6_media_upload.sql` in Supabase SQL Editor after the previous media migration.


## V2.8 — Home & Content Intelligence
The Home screen now prioritizes the next upcoming event, highlights events happening today/tomorrow, shows the next three upcoming items, surfaces the latest live announcement, and surfaces the latest sermon. Content is derived automatically from the existing database, so staff do not need to maintain a separate Home feed.

## V3.0 — Event Search & Discovery
The Events section now supports simple search across event title, description and location, plus filters for all upcoming events or the next 30 days. The existing event detail, photo and sharing experience remains.


## V3.0
Universal Search provides one search entry point for published sermons, events, and announcements.

## V3.5 — Church Life & Ministries
- Public Church Life / Ministries section with involvement pathways.
- Admin can create, edit, draft, publish, unpublish and delete ministries.
- Optional ministry photo using the existing `church-media` storage bucket.
- Migration: `supabase/v3.2_ministries.sql`.


## V3.5
Adds a communication centre with notification history for staff, plus a clearer Contact the Church pathway. Notification sends are logged server-side for accountability. No prayer-request feature is included.


## V3.5 — Church Calendar
Adds a dedicated public Church Calendar with month navigation, grouped event dates, Today badges, event details, and a shortcut to the full Events list.

## V3.9 — Content Health & Reliability
The admin dashboard now includes a Content Health check that identifies published events in the past, incomplete public event details, expired announcements, incomplete published sermons, and incomplete published ministries. Staff can review or unpublish flagged content. Expired announcements are also filtered from the public app automatically.

Run `supabase/v3.9_content_health.sql` after the existing schema/migrations. No new table is required.

## V4.2 — Production Readiness

V4.0 is a hardening milestone. It adds an application error boundary, a visible retry path when public church data cannot refresh, synchronized app versioning, and a production-readiness migration marker. No prayer-request feature is included.


## V4.2 — QA & UX Refinement
- Adds an app-wide manual refresh control.
- Correctly handles genuinely empty published content without leaving placeholder fallback records visible.
- Improves header action accessibility labels and refresh state.
- No database schema changes are required.


## V4.3 — Accessibility & Granny Test
This release prioritises older and less smartphone-confident users: larger touch targets, clearer typography and labels, stronger contrast, clearer back navigation, and accessible controls. No new dependency is required.


## V4.4
- First-time visitor / New Here experience
- Clear four-step first Sunday guide
- Stronger visitor CTA and simpler language
- No prayer request feature


## V4.5 — Church Information Architecture
- Simplified the More section into four clear groups: Plan Your Visit, Church Life, Find Us & Stay Connected, and App.
- Prioritised Sunday, I’m New, and Church Calendar.
- Replaced the direct Life Groups web link with the Church Life / Ministries screen so users can explore involvement in one place.
- Kept Staff / Admin available but visually unobtrusive.
- No prayer request feature added.


## V4.6 — Home Screen Intelligence
- Redesigned Home around the question: what do I need to know right now?
- Shows the next church event prominently.
- Adds one-tap Sunday and Calendar shortcuts.
- Surfaces events happening today or tomorrow when relevant.
- Keeps important announcements, latest sermon and New Here visible without clutter.
- No prayer request feature added.


## V4.7 — Sermon Library Experience
- Latest message feature card
- Search sermon titles and descriptions
- Browse sermon archive by year
- Clear result counts and empty states
- YouTube fallback when no sermon library exists


## V4.8 — Leadership & Church Life
- Added a simple public Our Leaders directory.
- Added a Supabase leaders table migration with public published-read/admin-management policies.
- Added an Our Leaders entry under Church Life in More.
- Kept the experience simple and public; no private member directory.

## V4.9 — Church Contact & Connection
- Added a simple Contact the Church hub.
- One place for directions, first-time visitor connection, website and YouTube.
- Added Contact the Church to More → Find Us & Stay Connected.
- No new dependencies and no required database migration.
- No prayer request feature.

## V5.0 — One-Tap Church
- Simplified the Home experience around the most common visitor/member needs.
- Added a prominent I NEED quick-access grid for Events, Sermons, I'm New and Contact.
- Kept the four-tab navigation: Home, Events, Sermons, More.
- No new dependencies or database changes.
- No prayer request feature.

## V5.1 — Real Content Management
- Expanded Admin into a practical day-to-day content centre.
- Added public Leadership management: create, edit, draft/publish and order leaders.
- Added editable public Contact details: phone, email, WhatsApp and office availability.
- Contact details are stored in `site_settings` and require no schema migration.
- Leadership uses the existing `supabase/v4.8_leadership.sql` migration.
- No new dependencies.


## V5.2 — Notifications that actually help
- Clear notification type selection
- Character counters and concise-message guidance
- Six-hour send check to reduce notification overload
- Clear destination labels and send-to-all confirmation
- No new dependencies or schema changes


## V5.3 — Safe Content Publishing
- Added publish-readiness checks for events, announcements and sermons.
- Incomplete content can still be saved as draft but is blocked from public publishing until required information is present.
- Prevented publishing past events and already-expired announcements.
- Added a publishing status panel showing drafts, live items and content needing attention.


## V5.4 — Admin Dashboard 2.0
- Added a What needs my attention today? admin-first view.
- Prioritises visitor follow-up, content health issues, and drafts.
- Added a calm zero-urgent-work state.
- Fixed duplicate Contact Details state and published-events status calculation in the inherited source.


## V5.5 — Sunday Readiness
- Added an Admin Sunday Readiness checklist covering upcoming service/event, current announcement, latest sermon, leadership and public contact details.
- Each check links directly to the relevant admin area.
- No new dependencies or database changes.

## V5.6 — App Data & Content Reliability
- Removed misleading fallback content from the initial public data state.
- Public data refresh now tolerates partial Supabase failures instead of treating every failed query as a total outage.
- The app keeps successfully loaded content visible when one data source fails.
- Added a clear stale-data banner with the last successful refresh time and a retry action.
- If the app cannot load any public content, it shows a transparent connection state instead of invented content.
- No new dependencies and no new database schema required.


## V5.7 — Release Candidate & Mobile QA
- Added an Admin Release Check screen with automatic content/configuration checks.
- Added a human device-test checklist for iPhone, Android, links, offline behavior, notifications, and the Granny Test.
- Version synchronized to 5.7.0 in App.tsx, package.json and app.json.
- No new dependencies or database changes.


## V5.8 — Release Candidate Hardening
- Added `npm run release-check` to verify required files and version/config consistency before a build.
- Added a repeatable release checklist in `RELEASE.md`.
- Version synchronized to 5.8.0.
- No new runtime dependencies and no database schema changes.

## V5.9 — Production Build & Device Test
- Added production preflight validation.
- Added a complete Windows/iPhone/Android build and acceptance-test guide.
- Added release-gate checks before store submission.
- Version synchronized to 5.9.0.

## V6.0 — Production Build
- Production EAS profiles hardened for preview APK and production iOS/Android builds.
- Added `PRODUCTION.md` with Windows, EAS, device-testing and store-release steps.
- Version synchronized to 6.0.0.


## V6.0 — Production Build
- Production EAS profiles hardened for preview APK and production iOS/Android builds.
- Added `PRODUCTION.md` with Windows, EAS, device-testing and store-release steps.
- Version synchronized to 6.0.0.


## V6.1 — App Help & Diagnostics

Adds an in-app App Help screen for real-device troubleshooting. It shows non-sensitive device/app/data status and can share a diagnostic summary with church staff.


## V6.4 Store Readiness
- Added STORE_LISTING.md with store copy and asset requirements.
- Added PRIVACY_POLICY_DRAFT.md for church leadership review.
- Added STORE_SUBMISSION_CHECKLIST.md.
- Added explicit iOS photo-library permission wording for authorised staff media uploads.
- Version 6.4.0.

## V6.7 — Production Environment Gate
- Added `scripts/production-config-check.mjs` to prevent production builds with missing or placeholder environment configuration.
- Production verification now includes the configuration gate.
- Version 6.7.0.

## V6.9 — Deployment Assistant
- Added a guarded production deployment assistant for Android preview, Android production, and iOS production builds.
- Production secrets are validated without printing their values.
- Added `DEPLOYMENT_V6.8.md` with the Windows deployment sequence.


## V6.9
Backend production setup: controlled Supabase migration, Edge Function deployment, server-only secrets template, backend configuration validation, and duplicate-safe YouTube sermon imports.

## v7.5.9 Church OS integration
Admin → AI Operations now includes the live Church OS Control Tower, roster-agent execution, deterministic roster planning, and an optional JWT-protected AI reasoning layer (`os-roster-ai-v1`). The LLM receives only structured planner context and cannot directly mutate church data.
