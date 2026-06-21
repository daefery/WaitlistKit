---
ticket: FOUND-3
date: 2026-06-21
tag: DISCOVERY
seen: 1
last_seen: 2026-06-21
status: active
---
Prisma emits `JSONB` (not `TEXT`) for `Json` fields in SQLite migration SQL, and the migration applies cleanly only because SQLite ignores unknown column types via type affinity — older SQLite treats `JSONB` as `TEXT` affinity, 3.45+ has it as a distinct binary type. This is a latent provider-portability seam, not a bug today: it works on the MVP SQLite store but the declared Postgres migration path (Prisma provider swap to Supabase) will bind `JSONB` to Postgres's native type with different semantics (binary, no key-order preservation, distinct operators). Lesson for any ticket adding `Json` columns on the SQLite→Postgres path: flag `Json` fields for db-architect review at provider-swap time, and don't assume SQLite migration success implies Postgres-equivalent storage. Worth a checklist line on the eventual Supabase migration ticket.
