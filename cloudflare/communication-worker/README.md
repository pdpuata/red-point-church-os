# Red Point Church Communication Worker

This is the Cloudflare-ready public web layer for the WhatsApp communication flow.

## Target URL

`https://redpointchurch.com/go/sunday/`

The Worker is configured for `redpointchurch.com/go/*`, so the existing church website can continue serving other paths.

## What it does

- Serves a mobile-first, elderly-friendly Sunday action page.
- Requires no app installation.
- Requires no member account or password.
- Leaves the Quicket meal destination disabled until the current live Quicket URL is supplied.
- Keeps the page static and cheap to operate.

## Deploy

From this directory:

```powershell
npx wrangler login
npx wrangler deploy
```

Wrangler will publish the Worker and the files under `public/`.

## Cloudflare requirement

The `redpointchurch.com` DNS zone must be active in the Cloudflare account used for deployment, and the deploying account needs permission to manage Workers/routes for that zone.

The route in `wrangler.jsonc` is intentionally limited to:

`redpointchurch.com/go/*`

Do not attach this Worker as a whole-domain Custom Domain, because the church's existing website should remain responsible for the rest of `redpointchurch.com`.

## Before publishing the meal button

Do not guess a Quicket URL. Update:

`public/go/sunday/index.html`

with the current Quicket event URL once the church provides it.

The page can then be committed and redeployed.

## Local preview

From this directory:

```powershell
npx wrangler dev
```

Then open the local URL Wrangler provides.
