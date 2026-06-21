---
ticket: FOUND-3
date: 2026-06-21
tag: PATTERN
seen: 1
last_seen: 2026-06-21
status: active
---
Always declare `onDelete` (and `onUpdate`) explicitly on every Prisma relation, even when the implicit default already matches intent. On FOUND-3 the self-referential `referredBy Signup? @relation("Referral", ...)` relied on Prisma's implicit optional-relation default (`SetNull`); the emitted migration SQL was already `ON DELETE SET NULL`, so it worked — but an implicit default is silent contract: a future Prisma version default change or a schema regeneration could drift the referential behavior with no diff to review. Making it explicit (`onDelete: SetNull`) pins the contract and, when the schema is already in sync, costs nothing (no new migration). For db-architect and be-reviewer: treat any relation lacking an explicit `onDelete` as a finding on referential-integrity-bearing models, independent of whether current behavior is correct.
