# Admin Workflow Map

Generated: 2026-09-06T11:50:31.624Z

## Status

- Actions mapped: **26**
- Passed locally: **26**
- Failed locally: **0**
- Events vertical slice: **locally_verified**
- Live Supabase: **unproven**
- Physical device: **unproven**

## Contract

Each action maps UI handler → Supabase operation → RLS policy → expected mutation → observable verification.

| Surface | Action | Handler | Operation | RLS | Verification |
|---|---|---|---|---|---|
| Events | create | saveEvent | insert | admins manage events | read-after-mutation |
| Events | read | refresh | select | admins manage events | read-after-mutation |
| Events | edit | saveEvent | update | admins manage events | read-after-mutation |
| Events | publish | toggleEvent | update({published:true}) | admins manage events | public read/RLS visibility |
| Events | unpublish | toggleEvent | update({published:false}) | admins manage events | public read/RLS visibility |
| Events | delete | remove | delete | admins manage events | read-after-mutation |
| Announcements | create | saveAnnouncement | insert | admins manage announcements | read-after-mutation |
| Announcements | read | refresh | select | admins manage announcements | read-after-mutation |
| Announcements | edit | saveAnnouncement | update | admins manage announcements | read-after-mutation |
| Announcements | publish | toggleAnnouncement | update({published:true}) | admins manage announcements | public read/RLS visibility |
| Announcements | unpublish | toggleAnnouncement | update({published:false}) | admins manage announcements | public read/RLS visibility |
| Announcements | delete | remove | delete | admins manage announcements | read-after-mutation |
| Sermons | create | saveSermon | insert | admins manage sermons | read-after-mutation |
| Sermons | read | refresh | select | admins manage sermons | read-after-mutation |
| Sermons | edit | saveSermon | update | admins manage sermons | read-after-mutation |
| Sermons | publish | toggleSermon | update({published:true}) | admins manage sermons | public read/RLS visibility |
| Sermons | unpublish | toggleSermon | update({published:false}) | admins manage sermons | public read/RLS visibility |
| Sermons | delete | remove | delete | admins manage sermons | read-after-mutation |
| Visitors | read | refresh | select | admins read visitors | read-after-query |
| Visitors | update-status | updateVisitorStatus | update | admins update visitors | read-after-mutation |
| Ministries | create/edit | saveMinistry | insert/update | Admins manage ministries | read-after-mutation |
| Ministries | publish/unpublish | toggleMinistry | update({published}) | Admins manage ministries | public read/RLS visibility |
| Ministries | delete | remove | delete | Admins manage ministries | read-after-mutation |
| Leaders | create/edit | saveLeader | insert/update | Admins manage leaders | read-after-mutation |
| Leaders | publish/unpublish | toggleLeader | update({published}) | Admins manage leaders | public read/RLS visibility |
| Leaders | read | refresh | select | Admins manage leaders | read-after-query |

## Evidence rule

Local contract verification is not runtime proof. Runtime success requires a controlled Supabase boundary and explicit evidence.
