# Google Cloud — R0 Architecture

Google Cloud is an infrastructure/intelligence layer for Church OS, not a replacement for Supabase.

## V1 boundary

- Supabase remains the operational system of record.
- Cloud Run hosts the AI Gateway.
- The gateway is provider-neutral and must not expose provider credentials to Expo.
- Future event processing can add Pub/Sub.
- Future analytics can add BigQuery.
- Future multi-step orchestration can add Workflows.
- Storage/Speech/Vision are deferred until a concrete workflow justifies them.

## Cost rule

Every service must have a documented free-tier allowance, an expected usage envelope, and a kill switch/alert strategy before production use. The architecture must remain viable at R0 recurring infrastructure cost within the applicable Google Cloud Always Free quotas.

## V1 API contract

`GET /health` — health/readiness probe.

`POST /v1/ai` — provider-neutral AI operation envelope. V1 intentionally returns an acceptance response only; provider adapters will be added separately after the gateway is deployed and verified.
