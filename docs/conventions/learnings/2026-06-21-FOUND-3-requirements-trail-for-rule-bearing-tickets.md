---
ticket: FOUND-3
date: 2026-06-21
tag: PATTERN
seen: 1
last_seen: 2026-06-21
status: active
---
Rule-bearing tickets whose PRD references internal REQ-IDs (REQ-1..n) need an upstream requirements doc (`docs/requirements/<ticket>-<slug>.md`) sourcing those REQs, or prd-reviewer flags the missing trail as a WARN. On FOUND-3 the PRD cited REQ-1..4 with no upstream doc; the fix was trivial (author the requirements file) but reactive. The durable lesson: for any ticket that maps Product Rules to internal REQs, the `/define` flow should produce the requirements doc by default, so the trail exists before prd-review rather than being backfilled after a WARN. Treat "PRD references a REQ-ID" as the trigger that the requirements doc must already exist.
