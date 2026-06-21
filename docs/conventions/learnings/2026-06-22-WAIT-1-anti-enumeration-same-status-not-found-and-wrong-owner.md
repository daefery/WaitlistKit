---
ticket: WAIT-1
date: 2026-06-22
tag: DECISION
seen: 1
last_seen: 2026-06-22
status: active
---
Repo invariant for mutating, owner-scoped routes: **not-found and wrong-owner return the same response (403)**. Returning 404 for missing and 403 for not-yours leaks existence — a caller can enumerate which ids exist by reading the status difference. On WAIT-1 this was established explicitly and early, which made the TOCTOU/P2025 mappings straightforward to reason about (P2025 on update → 403, matching the wrong-owner path).

Decision: every founder-scoped mutation that could reveal existence collapses "not found" and "not yours" into one indistinguishable 403. Establish this invariant in `/define` so error-path handling has a single rule to follow rather than per-handler judgement calls.

(Owner-isolation is a §5 auth safety surface — changes to this invariant route through safety-reviewer.)
