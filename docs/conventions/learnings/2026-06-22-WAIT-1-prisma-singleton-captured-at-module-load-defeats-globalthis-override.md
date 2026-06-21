---
ticket: WAIT-1
date: 2026-06-22
tag: DISCOVERY
seen: 1
last_seen: 2026-06-22
status: active
---
The repository layer (`lib/db/waitlists.ts`) imports and binds the `prisma` singleton at **module load time**. The common test-isolation trick of overriding `globalThis.prisma` runs too late — by the time a test sets it, the repo module has already captured the original binding, so DB calls hit the wrong client (on WAIT-1 this produced a foreign-key error until diagnosed).

Lesson: a module-load-time singleton import cannot be swapped via a later `globalThis` override. Tests that need DB isolation must either (a) inject a `PrismaClient` instance explicitly into the repo functions, or (b) construct and use their own client directly rather than relying on the global override. When designing a repo for testability, prefer dependency-injection of the client over reaching through a global. Subtle and easy to mis-debug as a data bug.
