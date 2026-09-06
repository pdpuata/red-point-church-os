# Repository Gates

Minimum gates before release:

1. `node --check scripts/admin-agent.mjs`
2. `node --check scripts/admin-surface-check.mjs`
3. `npm run release-check`
4. `npm run typecheck`
5. Admin database verification loop against the configured Supabase project
6. Physical Expo/device click-through for consequential paths
7. Evidence artifact committed/stored

If a gate cannot run, status is **unproven**, not passed.
