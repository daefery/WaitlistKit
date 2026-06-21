---
ticket: FOUND-2
feature: clerk-founder-auth
authored: 2026-06-21
status: validated
---

# Requirements — FOUND-2: Clerk founder auth + middleware

## Validated REQ-N

| REQ   | Statement | Acceptance criteria | Metric |
| :---- | :-------- | :------------------ | :----- |
| REQ-1 | Must redirect unauthenticated UI requests to sign-in. `GET /dashboard` (and any `/dashboard/*`) with no active Clerk session redirects to `/sign-in`. | Request to `/dashboard` and a nested route (e.g. `/dashboard/waitlists`) with no session → 302/307 with `Location` resolving to `/sign-in`; handler/page body is not rendered. | n/a (§5 guardrail: AUTH-1) |
| REQ-2 | Must serve the dashboard to an authenticated founder. `GET /dashboard` with a valid Clerk session returns the dashboard shell. | Request to `/dashboard` with a valid session → 200 and dashboard shell renders; no redirect to `/sign-in`. | n/a (§5 guardrail: AUTH-1) |
| REQ-3 | Must serve the public waitlist page without a session. `GET /[slug]` is reachable with no Clerk session. | Request to `/[slug]` for an existing slug with no session → 200, page renders; no redirect to `/sign-in`. | n/a (§5 guardrail: PAGE-1) |
| REQ-4 | Must protect API routes. `/api/*` requests with no active Clerk session are rejected with 401 JSON (not 200 or a redirect). | Request to a protected `/api/*` endpoint with no session → 401 JSON; handler body does not execute; no protected data leaks. | n/a (§5 guardrail: AUTH-1) |
| REQ-5 | Must expose a reliable `userId` to authenticated dashboard/API handlers (AUTH-2 enabler). Middleware makes the Clerk `userId` resolvable in-handler. | In an authenticated `/dashboard/*` or `/api/*` handler, `auth().userId` resolves to a non-null, stable identifier matching the session's founder; unauthenticated requests are blocked before reaching the handler (gated by REQ-1/REQ-4). | n/a (§5 guardrail: AUTH-2) |

## Resolved decisions

- Middleware gates BOTH `/dashboard/*` (UI) AND `/api/*` (API) routes
- `/dashboard/*` unauthenticated → 302 redirect to `/sign-in`
- `/api/*` unauthenticated → 401 JSON (not a redirect — fetch clients can't follow HTML redirects)
- Auth pages: top-level `/sign-in` and `/sign-up` (Clerk defaults)
- Metric-free MVP — no telemetry events
- Clerk Organizations: out of scope for MVP
