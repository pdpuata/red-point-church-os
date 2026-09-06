# Red Point Church — Production Build Guide

## 1. Install dependencies

From the project folder:

```bash
npm install
```

## 2. Sign in to Expo/EAS on the Windows computer

```bash
npx expo login
npx eas login
```

## 3. Run the local checks

```bash
npm run preflight
npm run release-check
npm run typecheck
npx expo-doctor
```

Do not continue to store submission if a check fails.

## 4. Build an installable Android test APK

```bash
npx eas build --platform android --profile preview
```

The preview profile creates an APK for practical device testing.

## 5. Build iPhone production candidate

```bash
npx eas build --platform ios --profile production
```

EAS will guide you through Apple credentials/signing when required.

## 6. Build Android production candidate

```bash
npx eas build --platform android --profile production
```

## 7. Final device acceptance

Before store submission, test on at least one real iPhone and one real Android phone:

- Home opens and refreshes.
- Events are current and event details work.
- Sermons search and YouTube links work.
- More → Contact works.
- Directions open correctly.
- Visitor form submits successfully.
- Notifications arrive and tapping one opens the correct screen.
- App behaves clearly when internet is unavailable.
- No placeholder or fake church content is visible.
- An older/non-technical person can find Sunday time, directions and a sermon without help.

## 8. Store submission

Only submit after the real-device checklist passes and the church's production Supabase project is configured.

The app already has stable identifiers:

- iOS: `com.redpointchurch.app`
- Android: `com.redpointchurch.app`
- Expo slug: `red-point-church`

Do not change these identifiers after publishing the first store version.
