# Red Point Church — Release Checklist

Use this checklist before installing a release candidate on real phones or submitting a store build.

## 1. Project preflight
- Run `npm install`.
- Run `npm run release-check`.
- Run `npm run typecheck`.
- Run `npx expo-doctor`.
- Confirm `.env` contains the production Supabase and function URLs.
- Confirm the Supabase migrations have been applied to the production project.

## 2. iPhone test
- Install the release candidate.
- Open Home, Events, Sermons and More.
- Search for an event and sermon.
- Open directions, website and YouTube.
- Submit a test visitor form.
- Allow notifications and tap a test notification.
- Disable internet and verify the retry/error state is understandable.

## 3. Android test
Repeat the same flow on a physical Android device.

## 4. Granny Test
Ask someone who did not build the app to do these without help:
1. Find Sunday service time.
2. Find the church location/directions.
3. Find a sermon and play it.
4. Find how to contact the church.
5. Find out what is happening next.

If any task takes more than two taps after opening the relevant area, or the person asks what a button means, simplify it before release.

## 5. Content readiness
- Next Sunday/event is correct.
- Current announcements are correct and not expired.
- Latest sermon is correct.
- Leadership and contact information are correct.
- No placeholder content is visible.
- No outdated event is presented as upcoming.

## 6. Release decision
Only mark the build ready when both the automated checks and physical-device tests pass.
