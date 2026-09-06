# Red Point Church OS v7.5.29 — Workflow Runtime & Dispatch

## Why
The Church OS needs a reusable execution substrate beneath Sunday Operations, People, Communications, Training, Content, Visitors and future AI agents. Workflow definitions should not themselves be responsible for scheduling, claiming or repeating work.

## Built
- workflow schedule registry
- idempotent workflow dispatch queue
- explicit queued/claimed/completed/failed/cancelled lifecycle
- safe dispatch claiming with row locking
- runtime health view
- admin-only queue/claim boundaries
- Control Tower Workflow Runtime surface
- reusable client methods for runtime health, dispatch and claiming

## Safety
The runtime does not grant arbitrary database mutation authority to AI. It only creates and claims operational work. Existing workflow-specific RPCs and human approval boundaries remain authoritative.
