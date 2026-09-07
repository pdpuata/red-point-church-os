# Red Point Church OS v17.0.0 — Operational Integrity & Release Hardening

## Purpose
Move the Church OS from an AI-enabled prototype toward a verifiable operating system: the system must protect consequential operations, preserve human approval, keep Supabase and GitHub contracts aligned, and fail visibly when readiness is not proven.

## Built in v17
- Hardened roster operational RPCs so roster checks, recommendations, and the roster agent require an administrator, music leader, or the assigned band leader.
- Removed direct client execution of internal authorization helper functions.
- Preserved human approval for roster recommendations; the recommendation engine does not auto-assign people.
- Synchronized application release metadata to v17.0.0 in package and Expo configuration.
- Added a one-shot dependency normalization workflow so Expo SDK 57 packages are aligned with the currently supported patch versions before release verification.

## Production verification target
- Supabase project is active and migrations are tracked through `v17_harden_roster_operational_rpcs`.
- GitHub CI must pass Expo Doctor, release-check, TypeScript, and the AI operational loop before v17 is considered release-ready.
- A real-device EAS build remains a separate proof requirement; source code and CI success are not substitutes for native-device verification.

## Known Supabase advisories
The remaining Supabase advisor output contains a mixture of intentional admin-gated SECURITY DEFINER functions, informational unused/duplicate indexes, RLS policy performance recommendations, and a disabled leaked-password-protection setting. These are tracked separately rather than being blindly changed in production because several are coupled to existing authorization and public-content behavior.
