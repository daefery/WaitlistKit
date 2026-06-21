---
ticket: FOUND-2
date: 2026-06-21
tag: DECISION
seen: 1
last_seen: 2026-06-21
status: active
---
Auth handling must split by route type: **UI routes redirect (302) to sign-in; `/api/*` routes must return 401 JSON.** A `fetch` client cannot follow an HTML sign-in redirect — it transparently follows the 302, receives the sign-in **page** as a 200 HTML body, and the caller sees a "successful" response containing markup instead of an auth error. The failure is silent and looks like a data-shape bug far from its cause.

Decision for this repo: in `clerkMiddleware`, branch on the path — `auth.protect()` (redirect) for page routes, and an explicit `401` JSON response for `/api/*`. Decided upfront in `/define`, not patched in review.

Reviewer/implementer check on any new protected API route: confirm the unauthenticated path yields a JSON `401`, never a redirect. Add this to the API-auth test matrix.
