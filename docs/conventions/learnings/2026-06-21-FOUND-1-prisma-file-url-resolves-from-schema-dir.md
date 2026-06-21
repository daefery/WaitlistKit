---
name: prisma-file-url-resolves-from-schema-dir
type: CORRECTION
ticket: FOUND-1
date: 2026-06-21
seen: 1
---
Prisma resolves a `file:` SQLite `DATABASE_URL` **relative to the directory of `schema.prisma`** (i.e. the `prisma/` folder), not the project root. Writing `DATABASE_URL="file:./prisma/dev.db"` therefore creates `prisma/prisma/dev.db` and breaks the DB path on a clean clone.

Use `DATABASE_URL="file:./dev.db"` so the db lands at `prisma/dev.db` as intended. When scaffolding any SQLite + Prisma project, verify the resolved db path on a fresh clone, not just locally where a stale file may mask the bug.
