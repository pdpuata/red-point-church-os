# Red Point Church OS — AI Start Here

Open this repository in VS Code. The repository is configured so the AI operating contract is available to coding agents and the deterministic operational loop runs as a VS Code folder-open task.

## What happens behind the scenes

1. VS Code/Copilot reads `.github/copilot-instructions.md`.
2. Agent-specific instructions are available in `AGENTS.md`.
3. The `.ai/` directory supplies the constitution, architecture, domain model, workflows, tests, decisions and agent roles.
4. The `AI OS: Operational Loop` task runs `npm run ai:loop` when the folder opens.
5. The loop writes:
   - `artifacts/ai-operational-loop.json` — machine-readable repository state.
   - `artifacts/AI-NEXT-TASK.md` — the highest-priority bounded next task.
6. The AI agent uses that evidence to choose work instead of guessing.
7. After changes, rerun the loop and repository gates. Never declare unverified runtime/database/device work complete.

## First command

```bash
npm install
npm run ai:loop
```

Then open `artifacts/AI-NEXT-TASK.md` and give the task to your AI coding agent, or simply tell it to continue from the repository operating contract.

## The intended loop

Observe → Verify → Diagnose → Propose → Approve → Change → Verify → Record → Repeat

## The strategic rule

If AI changes the economics of a process, first ask whether the process should exist in its current form. Prefer elimination and redesign before automation.

## Controlled runtime verification

The repository distinguishes **local contract verification** from **real database verification**.

Run the non-mutating readiness check first:

`npm run admin-runtime-readiness`

Then, with a disposable/local or staging Supabase project and a dedicated Admin test account, configure the variables documented in `.env.e2e.example` and run:

`npm run admin-workflow-e2e`

The runner is mutation-gated and uses only a normal authenticated client. It creates uniquely labelled test data and cleans it up after failure where possible. Never point the runner at production.

For a no-mutation gate inspection:

`npm run admin-workflow-e2e:check`
