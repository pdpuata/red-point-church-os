# Red Point Church OS v7.5.9

## What changed
- Integrated the Church OS Control Tower into Admin → AI Operations.
- Added service selection and real-time workflow health from `os_staff_control_tower`.
- Added deterministic roster-agent execution and roster planning from the app.
- Added a human-approval roster reasoning surface; the app never invents people or assignments.
- Added `os-roster-ai-v1` Edge Function. It uses the deterministic planner as the only context and, when `OPENAI_API_KEY` is configured, asks an LLM for structured operational reasoning. The LLM cannot write church data.
- Fixed roster planner reason-array generation and explicit data-gap reporting.

## Honest status
- Church OS backend is live.
- Control Tower UI is integrated into the source pack.
- Roster AI function is deployed and JWT-protected.
- The AI provider is only live if `OPENAI_API_KEY` exists in Supabase Edge Function secrets.
- The current database has no `band_memberships`, so roster planning correctly returns zero candidates rather than inventing assignments.
- No scheduler is claimed or included.
- Physical iPhone/Android E2E has not been executed from this environment.
