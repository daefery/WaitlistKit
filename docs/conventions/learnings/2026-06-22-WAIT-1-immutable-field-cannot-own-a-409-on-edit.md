---
ticket: WAIT-1
date: 2026-06-22
tag: CORRECTION
seen: 1
last_seen: 2026-06-22
status: active
---
Error-to-field attribution must account for which fields are actually editable in the current mode. On WAIT-1 the edit form always attributed a 409 to the slug field — but slug is immutable on edit, so a 409 can never originate from it. The error pointed the user at a disabled input, an impossible-to-resolve dead end.

Lesson: when a field is immutable in a given mode (create vs edit), it cannot be the source of a conflict/validation error in that mode — route the error elsewhere (a general banner or the field that genuinely caused it). Reviewer check: for any form reused across create/edit, verify error attribution respects per-mode field mutability.
