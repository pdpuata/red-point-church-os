# Red Point Church — Native Release Acceptance

Automated CI verifies code and configuration. It does **not** prove that a native release is ready.

Before calling v17 production-ready, complete these checks on the current release binary and record the result.

## Android
- Install a fresh v17 build on a physical Android phone.
- Confirm Home, Events, Sermons, More, Sunday and Get Involved load real production data.
- Confirm notification registration reaches the backend with `app_id = red-point-church` and `app_version = 17.0.0`.
- Send one authorised test notification and confirm foreground, background and cold-start/deep-link behaviour.
- Play a sermon; verify play/pause, ±15 seconds and scrubbing.
- Minimise and lock the phone; verify background audio and lock-screen controls/metadata.
- Run a TalkBack pass through the main public navigation.

## iPhone
- Install the current standalone/TestFlight release build when Apple distribution is available.
- Repeat the public-data, notification, sermon-player, background/lock-screen and VoiceOver checks above.
- A successful Expo Go session is not a substitute for standalone notification/background-audio verification.

## Content sign-off
- Resolve any Sunday Check issues using verified church information only.
- Confirm the next event location and current update are correct.
- Confirm the latest sermon title/date/media are correct.
- Publish leaders only from approved church information.

## Release rule
Do not describe v17 as fully production-verified until the applicable physical-device checks above have passed. CI success means the source/configuration checks passed; it is not native-device sign-off.
