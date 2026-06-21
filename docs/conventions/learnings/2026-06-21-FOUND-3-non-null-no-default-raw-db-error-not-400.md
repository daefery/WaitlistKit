---
ticket: FOUND-3
date: 2026-06-21
tag: ANTI-PATTERN
seen: 1
last_seen: 2026-06-21
status: active
---
A non-null column with no DB default (e.g. `Signup.position`) is a deferred-failure footgun: an insert that omits the field fails with a raw database error surfaced as a 500-class fault, not a clean 400 validation response. On FOUND-3 this was correctly accepted as out-of-scope (the data-model ticket can't own request validation; the referral-engine ticket must always supply `position`), but the obligation now lives implicitly in a downstream ticket. Lesson: when a schema makes a field non-null without a default, the reviewer must name the consuming ticket that owns supplying it AND ensure that ticket gets Zod/input validation so the failure mode is a 400, not a leaked DB error. Track the contract; don't let "by design" become an unguarded insert path.
