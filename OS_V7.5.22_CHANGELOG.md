# Church OS v7.5.22 — Operational Graph Activation

## What changed
- Added `os_operational_activation` security-invoker view.
- Added `os_generate_operational_activation_tasks()` admin-gated workflow evaluator.
- Added the `operational_graph_activation` workflow and stable daily run key.
- Activation is dependency-gated: People → Bands → Services → Sunday Operations → Communication Execution → Safe AI Autonomy.
- Only the first blocked phase creates an actionable stable task; downstream phases remain waiting.
- Added Control Tower activation surface with current phase, next action, unlock, blocker evidence, and run button.
- No synthetic church data was created.

## Verification
- Migration applied to production Supabase.
- View and function existence verified via database queries.
- Admin-gated RPC intentionally requires an authenticated admin session; SQL-tool execution without a user JWT is not treated as E2E success.
- Local TypeScript/build verification remains pending because this working environment has no `node_modules`.
