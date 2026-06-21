---
ticket: WAIT-1
date: 2026-06-22
tag: PATTERN
seen: 1
last_seen: 2026-06-22
status: active
---
A PATCH-style partial Zod schema (every field `.optional()`) accepts `{}` as valid — an empty body then drives a no-op update that returns 200 with nothing changed, masking a client bug as success. On WAIT-1 `UpdateWaitlistSchema` had this gap.

Lesson: every partial/optional-fields update schema must carry a non-empty guard, e.g. `.refine(obj => Object.keys(obj).length > 0, 'at least one field required')`, so an empty or unrecognized body is a clean 400, not a silent 200. Reviewer check on any partial-update route: confirm the schema rejects `{}`.
