---
ticket: WAIT-1
date: 2026-06-22
tag: CORRECTION
seen: 1
last_seen: 2026-06-22
status: active
---
At the ownership-check boundary there are two distinct identifiers and conflating them is a latent AUTH-2 bug: the **Clerk `clerkId`** (external session identity) and the **internal Prisma `User.id` CUID** (foreign key on owned rows). On WAIT-1 an `authorize()` parameter was named `userId` but actually carried the internal CUID, not the Clerk id — a name that invites a future caller to pass the wrong one and silently break owner isolation.

Lesson: never name an identifier parameter ambiguously `userId` at an auth/ownership seam. Name it for what it is (`clerkId` vs `internalUserId`) and add a doc comment pinning which side of the boundary it lives on. Prefer scoping queries by the relation (`where: { user: { clerkId } }`) so the translation is explicit and the wrong id can't be smuggled in.

(The ownership-isolation logic itself is a §5 auth safety surface — any change to the predicate or the id-translation goes through safety-reviewer; this fragment records only the naming/documentation convention.)
