# Red Point Church OS v7.5.11 — Workload + Fairness Intelligence

## What changed
- Added `os_people_workload` security-invoker view.
- Added client access through `getPeopleWorkload()`.
- Added Workload & Fairness Intelligence surface to People & Capability OS.
- Workload evidence uses service history over 2/4/8 weeks and last service date.
- Preserves human approval for roster decisions.

## Design principle
Fairness is an evidence signal, not an autonomous personnel decision. The system can surface load imbalance and inform recommendations; authorised humans retain final judgement.

## Backend verification
- Migration applied successfully to Supabase project `gvyqluwtzujefernhvfd`.
- `os_people_workload` queried successfully.
- Current dataset has no service assignments, so the workload view currently returns no people with service history. This is a data gap, not fabricated output.
