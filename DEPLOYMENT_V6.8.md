# Red Point Church V6.8 — Deployment Assistant

V6.8 turns the production process into a guarded sequence. It checks configuration before starting an EAS build and never prints secret values.

## Windows — first production APK

Open PowerShell in the project folder:

```powershell
npm install
npx expo login
npx eas login
npm run deploy:assistant -- android-preview
```

If the assistant stops at `.env`, copy `.env.example` to `.env` and enter the real Red Point Church production values. Never commit `.env`.

## Production Android

```powershell
npm run deploy:assistant -- android-production
```

## Production iPhone / TestFlight path

```powershell
npm run deploy:assistant -- ios-production
```

The iOS build requires the appropriate Apple Developer access and signing setup in EAS.

## What V6.8 verifies before building

- Required production environment keys exist.
- Placeholder configuration is rejected.
- `.env` is git-ignored.
- Stable iOS/Android identifiers are present.
- Project preflight passes.
- Release configuration passes.
- Production configuration passes.

## Important

A successful local verification does **not** mean the app has been successfully built. EAS must return a completed build. Likewise, a completed build does not mean the app has passed human device acceptance testing.
