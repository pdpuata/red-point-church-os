# Red Point Church OS

The project is no longer governed as a collection of app screens. It is governed as an AI-native operational system.

## Three questions every workflow must answer
1. If AI changes the economics of this task, should this process exist in its current form?
2. What expensive, painful, repetitive problem can AI fundamentally change?
3. How do we build a system in which AI can repeatedly do the task?

## Current control plane
See `.ai/` for the constitution, architecture, domain model, workflows, agents, prompts and verification contracts.

## Current operational Admin
The 7.5.7 baseline contains an Admin AI Operations loop that reads the live Supabase surfaces and records QA runs/results. The repository also contains static contract checks. These are complementary: static checks protect the code contract; runtime checks prove the real backend path.

## Important distinction
The existing repository has meaningful operational scaffolding, but a packaged source tree is not proof that every Admin button works in production. Runtime and physical-device evidence must remain explicit.
