# Google Cloud — R0 Architecture

Google Cloud is an infrastructure/intelligence layer for Church OS, not a replacement for Supabase.

## V1 boundary

- Supabase remains the operational system of record.
- Cloud Run hosts the AI Gateway.
- The gateway must not expose provider credentials to Expo.
- V1's real AI capability is Google Cloud Natural Language entity analysis.
- Future event processing can add Pub/Sub.
- Future analytics can add BigQuery.
- Future multi-step orchestration can add Workflows.
- Storage/Speech/Vision are deferred until a concrete workflow justifies them.

## Cost rule — R0 means R0

Google Cloud Free Tier usage does not expire, but usage beyond the published limits is billed. The gateway therefore has to remain inside its quotas; we do not treat the temporary $300 trial credit as part of the architecture.

Current relevant free limits:

- Cloud Run: 2 million requests/month plus free compute allocation under the applicable billing model.
- Natural Language API: 5,000 units/month.
- Artifact Registry: 0.5 GB storage/month.
- Cloud Build: 2,500 build-minutes/month on the listed free machine type.

Before production deployment, create a billing-budget/usage alert and keep the service scaled to zero when idle. Never configure a minimum instance. Delete stale container images so Artifact Registry remains under 0.5 GB.

## V1 API contract

`GET /health` — public health/readiness probe.

`POST /v1/text/entities` — authenticated server-to-server Natural Language entity analysis. Requires `Authorization: Bearer <AI_GATEWAY_TOKEN>`.

`POST /v1/ai` — authenticated provider-neutral envelope. Generic model execution is intentionally disabled in V1 so that the gateway cannot accidentally become an uncontrolled paid-AI proxy.

## Security boundary

The Expo client must never receive `AI_GATEWAY_TOKEN`. The intended caller is a trusted server-side component, such as a Supabase Edge Function. AI operations remain bounded and auditable rather than giving an agent arbitrary database access.

## Deployment shape

Use Cloud Run with request-based billing, minimum instances `0`, and a single service instance maximum during the pilot. Keep the container and Artifact Registry repository in the same region. Johannesburg (`africa-south1`) is supported by Cloud Run's free-tier pricing table; verify the current pricing page before deployment.

Do not deploy until the Google Cloud project, billing account, API enablement, service account permissions, token secret, and budget/usage guardrails have been configured.
