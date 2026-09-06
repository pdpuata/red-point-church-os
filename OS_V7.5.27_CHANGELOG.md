# Red Point Church OS v7.5.27 — Import Mapping & Reconciliation Engine

## Why
People data cannot safely enter the operating graph until Church OS can compare source schemas, resolve identity, detect duplicates/conflicts, and show exactly what changed. This release adds that staging-only reconciliation layer.

## Built
- deterministic identity resolution by user_id, normalized email, and normalized display name
- import fingerprints for idempotent comparison
- current-vs-previous import comparison
- NEW / UNCHANGED / UPDATE / CONFLICT / UNMATCHED / POSSIBLE_DUPLICATE classifications
- field-level diff preview for core identity fields
- reconciliation run and item history
- human exception-resolution queue
- source-field mapping proposal table for future AI-assisted mapping
- security-invoker reconciliation readiness view
- admin-gated reconciliation and resolution RPCs
- Control Tower Import Mapping & Reconciliation surface

## Safety
Reconciliation has no authority to mutate profiles, roles, capabilities, memberships, or assignments. Approved data must still pass through the existing People Activation prepare/apply boundary.

## Verification status
Production migration applied separately. No real people import exists yet, so live reconciliation remains data-path unproven.
