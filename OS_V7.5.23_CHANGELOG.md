# Red Point Church OS v7.5.23

## People Activation Pipeline

- Added `os_people_activation_batches` and `os_people_activation_items` staging tables with RLS and admin-only policies.
- Added security-invoker `os_people_activation_preview` view.
- Added `os_prepare_people_activation(jsonb,text)` for deterministic matching against existing authenticated profiles.
- Added `os_apply_people_activation(uuid)` for explicit, audited admin application of matched role/capability/band changes.
- Added People Activation Pipeline UI with JSON staging, match preview, and explicit apply boundary.
- No unmatched people are silently created; the pipeline requires an existing authenticated profile.
- Live verification confirmed empty staging state and `admin_required` authorization boundary when invoked without an authenticated admin JWT.

## Verification

- Database objects created successfully in production Supabase project.
- Staging counts: 0 batches, 0 items, 0 preview rows.
- Prepare RPC correctly rejects unauthenticated/non-admin SQL execution.
- Full TypeScript build not run because the working tree has no installed `node_modules`.
