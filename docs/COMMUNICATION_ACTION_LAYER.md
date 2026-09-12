# Red Point Communication Action Layer — V1

## Purpose

Keep WhatsApp as the church communication channel and Quicket as the payment/ticket system, while Red Point becomes the simple action layer between them.

Flow:

`WhatsApp → Red Point action page → Quicket / RSVP / information → confirmation`

The public action page intentionally requires no Red Point account.

## First vertical slice

The first slice is the Sunday action page. It supports:

- very large, plain-language action buttons
- meal → external Quicket URL
- RSVP → yes/no confirmation
- Sunday information
- explicit completion feedback
- a non-technical “Need help?” message so assistance is possible without making assistance a requirement

## Existing database constraints

The current production-oriented schema has `events` with `title`, `description`, `starts_at`, `ends_at`, `location`, and `published`. The public app already reads published events. No new database columns are required for this first UI slice.

Do not invent a Quicket column in `events`. The Quicket destination is currently kept in `src/communication/config.ts` until the church decides where event-level action configuration belongs in the backend.

## Installation

From the repository root:

```powershell
node scripts/install-communication-action-layer.mjs
npm run typecheck
```

The installer is intentionally fail-fast. It checks the current App.tsx structure before changing it.

## Quicket configuration

Edit:

`src/communication/config.ts`

Set:

```ts
sundayMeal.quicketUrl
```

Do not publish the action page with an empty Quicket URL. The installer leaves the URL empty because the correct live Quicket event was not present in the repository and should not be guessed.

## WhatsApp message pattern

The eventual WhatsApp message should normally contain one Red Point action link rather than separate links for every task.

Example:

> THIS SUNDAY — 9:00 AM
>
> We look forward to worshipping together this Sunday.
>
> Meals will be available after the service. You can also support the relief programme.
>
> VIEW SUNDAY INFORMATION
>
> [Red Point action link]

The Red Point page then presents the relevant actions.

## Next vertical slice

After the Sunday action page is tested on an iPhone, add the elder/admin communication composer:

1. Elder describes the communication.
2. System identifies information / RSVP / meal / donation actions.
3. Elder reviews the generated public action page.
4. System generates the WhatsApp copy.
5. Elder approves and sends it.
6. Action results become operational data for staff.

AI must not silently publish or send anything. The elder remains the approval point for church communications.
