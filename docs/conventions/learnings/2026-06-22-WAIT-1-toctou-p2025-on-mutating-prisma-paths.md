---
ticket: WAIT-1
date: 2026-06-22
tag: PATTERN
seen: 1
last_seen: 2026-06-22
status: active
---
Any mutating Prisma path that does an ownership/existence check and then a separate update/delete has a TOCTOU window: the row can disappear between the two operations, and Prisma raises P2025 (record not found) which, if unhandled, surfaces as a raw 500. On WAIT-1 both DELETE and PUT had this gap.

Lesson: catch P2025 on every mutating Prisma call and map it to a deliberate status, not a leaked 500:
- **DELETE → 204** (the row is gone either way; deletion is idempotent).
- **PUT/PATCH → 403** (preserves the anti-enumeration invariant — never confirm existence to a possible non-owner; see the anti-enumeration fragment).

The chosen status is a contract decision, not an incidental catch — pick it to keep the route's security invariant intact. Use a shared `isPrismaNotFoundError` helper so the check is consistent across routes.
