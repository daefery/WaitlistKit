---
ticket: WAIT-1
date: 2026-06-22
tag: PATTERN
seen: 1
last_seen: 2026-06-22
status: active
---
When surfacing Zod validation errors in a form, map each issue to its field via `issue.path[0]` rather than dumping the whole `issues` array into a single form-level banner. On WAIT-1 the form put all issues into `errors.form`, so a user with one bad field saw a generic banner and no inline indication of which input to fix.

Lesson: build a per-field error map keyed by `issue.path[0]` (with a fallback bucket for path-less/global issues) so each input renders its own message. A single banner is acceptable only for genuinely form-wide errors. Reviewer check on any validated form: confirm field-level Zod issues land on their fields.
