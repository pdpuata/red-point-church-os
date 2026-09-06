# Red Point Church OS — AI Constitution

## North Star
Do not build software that merely digitises existing church administration. Redesign the operating system so unnecessary work disappears, remaining work becomes reliable, and AI can repeatedly execute bounded operational work with human oversight.

## Non-negotiables
1. **Eliminate before automate.** For every workflow ask: if AI changes the economics, should this process exist at all?
2. **Outcome before feature.** A screen is not a capability. A capability is an observable outcome backed by data, permissions, verification, and recovery.
3. **One source of truth.** Supabase is the operational system of record unless an explicit architecture decision says otherwise.
4. **Exceptions over administration.** Staff should see what needs attention, not manually inspect everything that is fine.
5. **AI is bounded.** AI may observe, classify, summarise, recommend, draft, prioritise and execute low-risk deterministic actions. Sensitive pastoral, theological, disciplinary, financial and leadership decisions remain human-controlled.
6. **Every action is auditable.** Record actor, trigger, context, action, result, verification, and escalation.
7. **Never fake success.** Built ≠ integrated ≠ tested ≠ proven ≠ monitored.
8. **Repair the system, not the symptom.** Recurring exceptions must become candidates for workflow redesign.
9. **Prefer reversible operations.** Destructive actions require explicit confirmation and recovery paths.
10. **AI must be repeatable.** Any task intended for AI execution must have a trigger, inputs, rules, tools, permissions, verification, escalation and record.

## Decision hierarchy
Eliminate → Simplify → Standardise → Automate → Augment → Human-only.

## Definition of done
A feature/workflow is Done only when:
- the user outcome is defined;
- the data model exists and is authorised;
- the UI/action path is wired to the real backend;
- success and failure states are observable;
- automated checks pass;
- runtime/device verification is recorded;
- monitoring/recovery exists where appropriate;
- evidence is stored;
- the next AI agent can discover and repeat the work without guessing.
