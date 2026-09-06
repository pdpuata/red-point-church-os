# Red Point Church OS — GitHub Copilot Instructions

Treat this repository as an AI-native operational system, not a UI feature project.

Before changing code, read `AGENTS.md` and the relevant `.ai/` files. Follow the repository's canonical loop:

**Observe → Verify → Diagnose → Propose → Approve → Change → Verify → Record**

Always ask, when appropriate: **If AI changes the economics of this task, should this process exist in its current form at all?** Prefer eliminating or redesigning unnecessary work before automating it.

Do not invent backend state. Inspect Supabase migrations and actual code. For Supabase work, follow the repository's Supabase guidance, preserve RLS, never expose service-role secrets, and verify changes with a real test query when live access is available.

Do not claim that runtime, database, production, or physical-device verification happened unless it actually happened. Mark blocked/unproven evidence explicitly.

For operational work, prefer a closed loop:
1. detect the state/problem;
2. explain why it matters;
3. propose the smallest safe action;
4. require approval for consequential actions;
5. execute only the approved bounded action;
6. re-verify;
7. record evidence and unresolved work.

Use `npm run ai:loop` to refresh repository state and produce `artifacts/AI-NEXT-TASK.md` before choosing the next substantial task.
