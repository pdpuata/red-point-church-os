# Red Point Church OS v14.0.0 — Church Journey

## Purpose
Turn the public/member experience from content consumption into a guided church journey, while keeping pastoral decisions human-owned.

## Added
- Authenticated `Your next step?` journey surface.
- Six explicit next-step requests: Sunday, Life Group, serving, prayer, baptism, pastoral help.
- Optional member note to provide context.
- Idempotent open-request behavior per person/next-step.
- Member-owned RLS on requests; admin visibility/update remains protected.
- Cancel request flow for the member.
- Upcoming events and Church Life discovery integrated into the journey.
- Staff-facing data foundation for follow-through without automating pastoral judgment.

## Architectural rule
The app is now explicitly three products in one coherent system:
1. Public front door for visitors.
2. Personal church companion for members/connected people.
3. Protected operational OS for staff, with AI underneath.
