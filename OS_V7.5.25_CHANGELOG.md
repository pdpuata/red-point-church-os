# Red Point Church OS v7.5.25

## AI-Assisted People Import Normalization

### Built
- Added the `os-people-import-ai-v1` Supabase Edge Function.
- Added an explicit admin authorization boundary and JWT verification.
- Added AI-assisted normalization for people import rows with strict structured output.
- AI is prohibited from inventing identity, user IDs, email addresses, bands, roles, capabilities, proficiency, or leadership status.
- Added confidence and row-level warnings to make uncertainty visible.
- Added deterministic normalization fallback when no AI provider key is configured; the UI explicitly labels this fallback.
- Added a 500-row request limit.
- Added `normalizePeopleImport()` to the Church OS client.
- Added `AI NORMALIZE IMPORT` to People Activation before the existing Prepare & Match stage.
- Normalized output is written back into the editable import buffer and must still pass through human review, matching, and explicit Apply.

### Safety boundary
The AI function is proposal-only. It has no database mutation capability. The existing `os_prepare_people_activation` and `os_apply_people_activation` functions remain the only activation path.

### Production verification
- Edge Function deployed: `os-people-import-ai-v1`, v1, JWT verification enabled.
- No church data was created or modified by this release.
- Full app typecheck was not run because the working tree does not contain `node_modules`.
- Live authenticated end-to-end AI invocation remains unverified; provider configuration is not assumed.
