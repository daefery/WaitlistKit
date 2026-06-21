---
ticket: FOUND-2
date: 2026-06-21
tag: DISCOVERY
seen: 1
last_seen: 2026-06-21
status: active
---
Clerk 7.x (this repo: 7.5.7) changed the middleware surface significantly from v4 — code samples and StackOverflow answers for `authMiddleware` / `getAuth` are wrong here and will not type-check or behave as expected.

The Clerk 7.x forms used on FOUND-2:
- `auth.protect()` — redirects an unauthenticated request on a **UI** route to sign-in. Use inside `clerkMiddleware` for protected page routes.
- `auth()` is **async** and returns `{ userId }` — `await` it to read the session / surface `userId`.
- These replace v4's `authMiddleware()` and `getAuth(req)`.

When working a Clerk ticket, confirm the installed major version first (`clerk` / `@clerk/nextjs` in package.json) and match the API to that major. Treat any sample using `authMiddleware` or synchronous `getAuth` as pre-v5 and do not port it directly.
