---
ticket: FOUND-3
date: 2026-06-21
tag: CORRECTION
seen: 1
last_seen: 2026-06-21
status: active
---
Prisma 6 ships an AI-safety guard that blocks destructive CLI commands (`prisma db push --force-reset` and similar) when it detects invocation from an AI agent, so test setup that relies on a force-reset push will fail under the harness. The fix — and the better pattern regardless — is to reset the test DB by manually deleting the SQLite file (`fs.unlinkSync(testDbPath)`) in `beforeAll`, then run `prisma migrate deploy`, which replays the *committed* migration files (non-destructive, no guard trigger) instead of pushing the in-memory schema. This applies to any future ticket whose integration tests need a clean DB: prefer `migrate deploy` over `db push --force-reset` in agent-run test harnesses — it both dodges the guard and tests the real migration rather than a schema diff.
