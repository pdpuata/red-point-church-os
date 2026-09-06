# Red Point Church — AI Admin Operating Protocol v1

## Purpose
Make Admin work repeatably as an operational system rather than a collection of screens.

## Canonical loop
**Observe → Verify → Diagnose → Propose → Approve → Change → Verify → Record**

AI must never infer that a button works because its UI exists. A path is green only when its expected database operation succeeds and the result is observable.

## Surface contract
The repeatable surface registry covers:

- Events — read/create/edit/publish/unpublish/delete
- Announcements — read/create/edit/publish/unpublish/delete
- Sermons — read/create/edit/publish/unpublish/delete
- Visitors — read/update status
- Ministries — read/create/edit/publish/unpublish/delete
- Leaders — read/create/edit/publish/unpublish/delete
- Home/Contact — read/upsert site settings
- Notifications — read history/count devices
- Sunday Readiness — derived readiness checks
- Release Check — release-gate checks
- QA Runs / QA Results / Repair Queue — machine-readable operational memory

## Safety model
1. Verification is read-only by default.
2. AI proposes repairs from observed failures; it does not invent fixes.
3. Consequential actions require explicit human approval.
4. Every repair is followed by the same verification suite.
5. Failed verification creates an actionable repair item rather than a silent fallback.
6. The system never treats empty content as a database failure; zero rows can be a valid state.

## App
Admin now contains **AI Operations**. Running the loop checks the live Supabase surfaces and records the run/results in `admin_qa_runs` and `admin_qa_results`.

## CLI agent protocol
Run:

```bash
npm run admin-agent
npm run admin-agent -- plan
```

The script emits machine-readable JSON under `artifacts/` so another AI/tooling layer can consume the state deterministically.

## Release rule
Do not declare Admin operational until:

- database migration is applied;
- `npm run release-check` passes;
- `npm run typecheck` passes in an environment with dependencies installed;
- Admin AI Operations passes against the live database;
- every consequential button/path has been physically exercised on a real Expo device/build.

## Control plane

The durable AI instructions live in `.ai/`. The repository is the source of truth for agent behaviour, workflows, domain boundaries and evidence expectations.

## Next automation level
A future agent runner can consume `admin_qa_results`, turn failures into `admin_repair_queue` entries, request approval for bounded mutations, execute one repair at a time, and rerun the identical verification contract.
