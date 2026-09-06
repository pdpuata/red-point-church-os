# Red Point Church App V7.1 — Live Production Verification

V7.1 is the live-environment verification checkpoint. It adds an automated smoke test for the real Supabase REST API and the four production Edge Function endpoints.

## Run it

After the real production `.env` has been configured:

```bash
npm run check:live
```

The check never prints secret values.

## What it verifies

- Supabase REST API is reachable.
- Published events can be read using the public mobile key.
- Published announcements can be read.
- Published sermons can be read.
- Published leaders can be read.
- Visitor submission Edge Function is reachable.
- Device registration Edge Function is reachable.
- Push notification Edge Function is reachable.
- YouTube sync Edge Function is reachable.

## What it does NOT prove

A successful smoke test does not prove that:

- an admin can log in;
- an image can actually upload;
- a visitor email is delivered;
- YouTube sync imports a real sermon;
- push notifications arrive on a physical phone;
- notification taps route correctly;
- Android or iOS builds work;
- App Store or Google Play review will pass.

Those require controlled real-world tests.

## V7.1 release gate

Do not call the app production-ready until the following have all been demonstrated:

- [ ] Live smoke test passes.
- [ ] Admin login works.
- [ ] Admin can publish an event.
- [ ] Admin can publish an announcement.
- [ ] Admin can publish a sermon.
- [ ] Admin can upload an image.
- [ ] Visitor form creates a real submission.
- [ ] Visitor notification email is received.
- [ ] YouTube sync imports a real public sermon.
- [ ] Device registration works on iPhone and Android.
- [ ] Push notification is received and opens the correct screen.
- [ ] Offline/recovery behavior works.
- [ ] Android preview APK passes device testing.
- [ ] iOS TestFlight build passes device testing.

V7.1 is therefore a **verification release**, not a claim that these real-world tests have already happened.
