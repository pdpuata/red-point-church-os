# Admin Runtime E2E Plan

## Current state

The Events vertical slice is source/RLS-contract verified. Runtime execution is a separate evidence class and must be proven against a controlled Supabase boundary.

## Evidence standard

A runtime pass requires all of the following:

- authenticated Admin session succeeds;
- Admin membership is verified from `admin_users`;
- create mutation succeeds;
- read-after-create succeeds;
- edit mutation is observed;
- publish mutation is observed;
- public client can read the published row;
- unpublish mutation is observed;
- public client cannot read the unpublished row;
- delete mutation succeeds;
- read-after-delete proves removal;
- artifact records every step and any cleanup.

A missing credential, missing controlled database, or missing device is **blocked**, not passed.

## Next expansion

Once Events passes at runtime, reuse the same runner contract for Announcements and Sermons before expanding to the remaining Admin surfaces.
