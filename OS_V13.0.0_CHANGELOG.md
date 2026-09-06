# Red Point Church OS v13.0.0 — Church Experience Layer

## Purpose
Make the product unmistakably a church app for **visitors and members**, while preserving the existing operational OS underneath it.

## Added
- Public-first church experience remains usable without an account.
- `My Red Point` member/visitor experience in the primary navigation.
- Supabase Auth sign-up/sign-in/sign-out flow for church users.
- Persistent React Native auth sessions using AsyncStorage.
- Personal church connection preferences:
  - Exploring
  - New here
  - Connected
  - Life Group interest
  - Serving interest
- `church_member_preferences` table with user-owned RLS policies.
- Automatic basic profile/preferences creation when a new Auth user is created.
- Personalized next-step surface showing upcoming church events and church-life opportunities.
- Clear separation between public church discovery, personal church experience, and Staff/Admin operations.

## Security boundary
- Publishable Supabase key remains client-safe; privileged keys are not added to the app.
- Member preferences are restricted to the authenticated owner with RLS.
- Staff/Admin remains a separate protected surface.
- Connection stage is self-described and explicitly does **not** declare church membership.

## Not claimed
- No claim that member authentication has been device-tested in Expo Go.
- No claim that email confirmation configuration is enabled/disabled.
- No claim that the full member journey is production E2E verified.
