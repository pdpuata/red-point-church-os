# Red Point Church — Store Submission Checklist

## Identity
- [ ] App name: Red Point Church
- [ ] iOS bundle ID: com.redpointchurch.app
- [ ] Android package: com.redpointchurch.app
- [ ] Expo slug: red-point-church
- [ ] Version: 17.0.0

## Required accounts
- [ ] Apple Developer account
- [ ] Google Play Console developer account
- [ ] EAS project linked to the church account
- [ ] Existing Google Cloud project `red-point-church-app` has Firebase enabled
- [ ] Firebase Android app registered as `com.redpointchurch.app`
- [ ] Production Supabase project

## Current platform requirements
- [x] Android target API: Expo SDK 57 targets Android API 36, matching Google Play's requirement for new apps/updates from 31 August 2026.
- [x] Apple build toolchain compatibility: Expo SDK 57 supports Xcode 26.4+, satisfying the current App Store Connect requirement for Xcode 26 / iOS 26 SDK builds.
- [ ] If the Google Play developer account is a personal account created after 13 November 2023, complete the required closed test with at least 12 continuously opted-in testers for 14 days before applying for production access.
- [ ] If applicable to a new personal Play developer account, complete Google's real-Android-device developer verification.

## Required assets
- [ ] Final logo/icon supplied
- [ ] iOS screenshots supplied
- [ ] Android screenshots supplied
- [ ] Any required promotional artwork supplied

## Required legal/privacy information
- [ ] Privacy policy reviewed by church leadership
- [x] Public privacy-policy URL exists: https://gvyqluwtzujefernhvfd.supabase.co/functions/v1/privacy-policy
- [x] Privacy policy is accessible from Church information inside the app
- [ ] App Store privacy answers completed accurately
- [ ] Google Play Data Safety answers completed accurately
- [ ] Support/contact details confirmed

## Production backend
- [ ] Supabase schema and migrations applied
- [ ] Admin users configured
- [ ] Edge Functions deployed
- [ ] Resend email configuration tested
- [ ] YouTube sync configured if used
- [ ] `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` configured
- [ ] Correct Church `google-services.json` is present and referenced by `expo.android.googleServicesFile`
- [ ] Matching FCM V1 service-account key uploaded to EAS (never committed)
- [ ] A scoped Church v17 device token appears in `device_tokens` with `app_id = red-point-church`
- [ ] No service-role, Resend, YouTube, or Firebase service-account secrets are bundled into the mobile app

## Device acceptance
- [ ] Real iPhone test passed
- [ ] Real Android test passed
- [ ] Visitor form tested
- [ ] Push notification physically received on Android and iPhone
- [ ] Notification tap tested from foreground, background and terminated app
- [ ] Offline/reconnect tested
- [ ] Directions tested
- [ ] Sermon playback, scrubbing, ±15s, background audio and lock-screen controls tested
- [ ] Granny Test passed

## Release
- [ ] npm run preflight
- [ ] npm run release-check
- [ ] npm run typecheck
- [ ] npm run doctor
- [ ] npm run check:production-config
- [ ] EAS preview build tested
- [ ] EAS production builds tested
- [ ] Store review notes prepared
- [ ] Church leadership gives final release approval
