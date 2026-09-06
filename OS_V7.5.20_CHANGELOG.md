# Red Point Church OS v7.5.20

## Operational Data Readiness OS

The Church OS now has a unified, machine-readable readiness plane across the organisational graph.

### Added
- `os_operational_data_readiness` security-invoker view.
- Readiness domains for People, Bands, Services, Content, Visitors, Communications, AI Operations and Institutional Memory.
- Evidence-backed blocker counts rather than synthetic health scores.
- `os_generate_operational_data_tasks()` admin-gated RPC that turns readiness blockers into stable Control Tower tasks.
- Control Tower Operational Data Readiness surface.

### Design rule
Data incompleteness is treated as an operational constraint, not something AI is allowed to hallucinate around.

### Verification
- Migration applied successfully to Supabase project `gvyqluwtzujefernhvfd`.
- Readiness view queried successfully.
- Current production truth: People, Bands, Services and AI Operations require attention; Communications and Visitors have data gaps; Content and Institutional Memory have present data.
- No synthetic church data inserted.
- Full TypeScript/build verification not run because dependencies are not installed in the working environment.
