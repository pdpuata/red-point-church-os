# Red Point Church — Store Submission Checklist

## Identity
- [ ] App name: Red Point Church
- [ ] iOS bundle ID: com.redpointchurch.app
- [ ] Android package: com.redpointchurch.app
- [ ] Expo slug: red-point-church
- [ ] Version: 6.4.0

## Required accounts
- [ ] Apple Developer account
- [ ] Google Play Console developer account
- [ ] EAS project linked to the church account
- [ ] Production Supabase project

## Required assets
- [ ] Final logo/icon supplied
- [ ] iOS screenshots supplied
- [ ] Android screenshots supplied
- [ ] Any required promotional artwork supplied

## Required legal/privacy information
- [ ] Privacy policy reviewed by church leadership
- [ ] Public privacy-policy URL exists
- [ ] App Store privacy answers completed accurately
- [ ] Google Play Data Safety answers completed accurately
- [ ] Support/contact details confirmed

## Production backend
- [ ] Supabase schema and migrations applied
- [ ] Admin users configured
- [ ] Edge Functions deployed
- [ ] Resend email configuration tested
- [ ] YouTube sync configured if used
- [ ] Production environment variables configured
- [ ] No service-role or API secrets are bundled into the mobile app

## Device acceptance
- [ ] Real iPhone test passed
- [ ] Real Android test passed
- [ ] Visitor form tested
- [ ] Push notification tested
- [ ] Offline/reconnect tested
- [ ] Directions tested
- [ ] Sermon playback tested
- [ ] Granny Test passed

## Release
- [ ] npm run preflight
- [ ] npm run release-check
- [ ] npm run typecheck
- [ ] npx expo-doctor
- [ ] EAS preview build tested
- [ ] EAS production builds tested
- [ ] Store review notes prepared
- [ ] Church leadership gives final release approval
