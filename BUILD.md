# Red Point Church · V5.9 Build & Device Test Guide

V5.9 is a production-readiness package. The goal is to get the same release candidate onto real iPhone and Android devices and test the complete user journey before store submission.

## 1. Install on Windows

```powershell
npm install
npm run preflight
npm run typecheck
npx expo-doctor
```

## 2. Start a development build

```powershell
npx expo start
```

For Expo Go testing, scan the QR code from the terminal with the iPhone camera/Expo Go. If Expo CLI asks you to sign in, run:

```powershell
npx expo login
```

## 3. Device acceptance test

Test on one recent iPhone and one Android phone.

- Home opens without errors.
- Next event is correct.
- Sunday information is correct.
- Calendar opens and dates are correct.
- Sermon search works.
- Sermon opens and YouTube link works.
- Events search/filter works.
- Announcements display and expired announcements do not.
- I’m New journey can be completed without help.
- Contact hub opens directions, website and YouTube.
- Visitor form submits successfully.
- More menu is understandable to a first-time user.
- Push notification arrives and opens the intended screen.
- Refresh works.
- Airplane mode produces a clear message and retry path.
- Text is readable and controls are easy to tap.

## 4. Release gate

Do not submit to the App Store or Google Play until:

1. `npm run preflight` passes.
2. `npm run release-check` passes.
3. `npm run typecheck` passes.
4. `npx expo-doctor` reports no blocking issue.
5. iPhone acceptance test passes.
6. Android acceptance test passes.
7. Church staff verify the live content.

## 5. Production build

Once the release gate passes, configure the real EAS project ID and run the production build from the project directory:

```powershell
eas login
eas build:configure
eas build --platform all --profile production
```

Do not put Supabase secrets, YouTube API keys, or service-role keys into the mobile app. Server secrets belong in Supabase Edge Function secrets.
