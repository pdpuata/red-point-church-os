# Operational Definition of Done

For every Admin surface test all relevant paths:

| Surface | Read | Create | Edit | Publish | Unpublish | Delete | Verify |
|---|---:|---:|---:|---:|---:|---:|---:|
| Events | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Announcements | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Sermons | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Visitors | ✓ | — | status | — | — | — | ✓ |
| Ministries | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Leaders | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Home | ✓ | — | — | — | — | — | ✓ |
| Contact | ✓ | — | — | — | — | — | ✓ |
| Notifications | ✓ | send | — | — | — | — | ✓ |
| Sunday Readiness | ✓ | run | — | — | — | — | ✓ |
| Release Check | ✓ | run | — | — | — | — | ✓ |
| AI Operations | ✓ | run | bounded | — | — | — | ✓ |

A check is green only when the expected database state changes and the UI can observe it.
