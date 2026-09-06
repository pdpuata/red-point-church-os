# Red Point Church OS v7.5.26 — People Ingestion OS

## Why
The People Activation pipeline is correct but depends on obtaining source data. This release adds the source-system boundary so future Planning Center, Google Sheets, CSV, API, and manual inputs can enter the same controlled ingestion architecture without coupling source systems directly to the operational graph.

## Built
- `os_people_sources` registry
- `os_people_import_runs` lifecycle record
- `os_people_import_rows` raw/normalized/matching staging
- `os_people_source_mappings` field mapping contract
- security-invoker `os_people_ingestion_readiness` view
- admin-gated source registration RPC
- admin-gated import-run creation RPC
- initial source definitions for Planning Center, Google Sheets, CSV and manual entry
- Control Tower People Ingestion OS surface

## Safety
No source credentials are stored in the mobile app. No source import automatically mutates church people records. Raw data, normalized proposals and identity matching remain staged until explicit approval.

## Verification status
Migration designed for idempotent application. No real people data imported. Production authenticated E2E remains pending.
