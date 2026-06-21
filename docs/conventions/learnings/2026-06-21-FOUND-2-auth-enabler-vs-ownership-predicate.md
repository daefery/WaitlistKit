---
ticket: FOUND-2
date: 2026-06-21
tag: PATTERN
seen: 1
last_seen: 2026-06-21
status: active
---
Owner-isolation rules (AUTH-2: a founder may only access their own waitlists) split cleanly into two layers, and scoping a ticket to just one is correct, not a coverage gap:
- **Enabler layer** — surfacing the authenticated `userId` from the session (middleware / `auth()`). This is what FOUND-2 delivered.
- **Predicate layer** — the actual `where: { ownerId: userId }` ownership check at each data-access site. This is downstream and per-feature.

`spec-rule-check` correctly flagged AUTH-2 as "not blocked, by design" because the enabler was in scope and the predicate was not — and recommended a dedicated E2E (FOUND-E2E) for the full session round-trip + cross-account denial.

Lesson for rule-coverage review: when a rule is an access-control invariant, don't expect a single ticket to "cover" it. Verify the **enabler** is present and that a follow-up (E2E or per-feature predicate task) is named to close the predicate layer. A green enabler ticket is not proof the invariant holds end-to-end.
