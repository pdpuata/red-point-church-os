# Red Point Church OS v7.5.18

## People data readiness

- Added explicit primary-capability capture to People & Capability OS.
- Added explicit band-leader capture when assigning a person to a band.
- Preserves the existing human approval boundary; no roster assignment is automated by this change.
- This closes a previously identified UI gap: the backend supported `is_primary` and `is_leader`, but the UI always wrote `false`.

## Verification truth

- Live database remains data-poor: 1 profile, 0 roles, 0 capabilities, 0 band memberships, 0 service assignments.
- No synthetic church people were created.
- Full npm typecheck/build was not run because dependencies are not installed in the working environment.
