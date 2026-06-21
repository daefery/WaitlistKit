# PRD: Clerk founder auth + middleware

> Ticket: FOUND-2 · Module: cross-cutting (auth middleware + dashboard/api gating) · Status: awaiting PM gate

## 1. TL;DR

Add Clerk-backed founder authentication and a single root middleware that gates every `/dashboard/*` route (redirect to sign-in) and every `/api/*` route (401 JSON), while leaving public waitlist pages `/[slug]` open to anonymous visitors. This is the foundation every other dashboard, billing, and data ticket depends on.

## 2. Problem & Evidence

Founders need private accounts to manage their waitlists, and the platform needs a reliable, server-enforced identity (`userId`) before any owner-scoped feature (dashboards, CSV export, billing, owner-isolation) can be built safely. Without this, every downstream ticket would either ship insecurely or block.

| claim | source | confidence |
| :---- | :----- | :--------- |
| Every owner-scoped ticket (DASH-1/2/3, STRIPE-1/2, CSV export) requires a server-resolved `userId` to enforce AUTH-2 | requirements REQ-5 + profile §4 (AUTH-2) | validated |
| Waitlist subscribers must never hit an auth screen — public conversion path must stay anonymous | ticket goal + profile §4 (PAGE-1) | validated |
| `fetch` clients calling `/api/*` cannot follow an HTML 302; an unauthenticated API call must return a JSON 401 | resolved decision (API 401 vs 302 split) | validated |
| Auth/access-control is a declared §5 safety surface requiring mandatory `safety-reviewer` veto | profile §5 | validated |

## 3. Primary job (JTBD)

When I sign up to run a waitlist for my product, I want a private account that only I can access, so I can manage my waitlists with confidence that no one else can see or change my data.

Related jobs (context only):
- As the platform, surface a reliable `userId` to every protected handler so owner-isolation (AUTH-2) is enforceable downstream.
- As a waitlist subscriber, reach the public page without ever encountering an auth wall.

## 4. Desired outcomes

- **Maximize the share of protected requests that are correctly gated** when a request reaches `/dashboard/*` or `/api/*` without a valid session — target 100% (no protected handler body executes unauthenticated), measured by the AUTH-1 / REQ-1 / REQ-4 rule tests passing. Links to §3 primary job. Satisfied by AC-1, AC-4.
- **Maximize the share of public requests that stay anonymous** when a visitor reaches `/[slug]` with no cookie — target 100% (no redirect, no auth prompt), measured by the PAGE-1 / REQ-3 rule test. Links to related job (subscriber). Satisfied by AC-3.
- **Maximize reliable identity resolution** when an authenticated founder reaches a protected handler — target: `auth().userId` is non-null and stable in 100% of authenticated handler invocations, measured by REQ-5 rule test. Links to §3 + AUTH-2. Satisfied by AC-5.

## 5. Product Rules & Safety in scope

| Rule | Tied to |
| :--- | :------ |
| AUTH-1 — all founder `/dashboard/*` routes require an active Clerk session | Slice A · AC-1, AC-2 |
| AUTH-2 — founder isolation requires middleware to surface `userId` reliably | Slice A · AC-5 (this PRD enables AUTH-2; the predicate itself is enforced by downstream owner-scoped tickets) |
| PAGE-1 — public waitlist page `/[slug]` accessible without auth | Slice A · AC-3 |

**§5 SAFETY SURFACE: YES** — auth/access control (profile §5). Consequences:
- `safety-reviewer` is a **mandatory veto gate** in `/edbot-harness:implement` (cannot be silently dropped).
- The merge requires the `safety` sign-off recorded (profile §8 DoD).
- No feature flag — foundational auth, not a ramped feature (see §14).

## 6. Appetite

~2 build iterations. This is well-scoped: Clerk provides the middleware primitives, sign-in/sign-up UI, and `auth()` natively. The work is wiring + the matcher policy + rule tests, not custom auth. If it doesn't fit, narrow the slices — do not raise the cap.

## 7. Vertical slices

**Slice A — Root middleware gating policy.** `clerkMiddleware()` + `createRouteMatcher` at repo root enforcing: protect `/dashboard/:path*` (302 to `/sign-in`), protect `/api/:path*` (401 JSON), explicitly pass through `/(auth)/.*`, `/_next/.*`, `/[slug]` and other public routes, and `/api/webhooks/.*`. Module: auth/middleware (cross-cutting). Depends on: none. Pass condition: REQ-1, REQ-3, REQ-4 observable via rule tests.

**Slice B — Founder auth UI + key wiring.** Mount Clerk `<SignIn />` and `<SignUp />` at top-level `/sign-in` and `/sign-up`; set `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`; provide `.env.example` key placeholders. Module: auth UI. Depends on: Slice A (redirect target must exist). Pass condition: REQ-2 (authenticated `/dashboard` renders 200), unauthenticated redirect lands on a real sign-in page.

**Slice C — Server-side identity belt-and-suspenders.** Server-side `auth()` call in the dashboard layout so `userId` is resolved and available to protected handlers (defense in depth behind the middleware). Module: dashboard shell. Depends on: Slice A. Pass condition: REQ-5 — `auth().userId` non-null in authenticated `/dashboard/*` and `/api/*` handlers.

## 8. Acceptance criteria

- **AC-1 (Slice A → Outcome 1 / AUTH-1 / REQ-1):** `GET /dashboard` and `GET /dashboard/waitlists` with no session return 302/307 to `/sign-in`; the handler/body is not rendered.
- **AC-2 (Slice B → REQ-2):** `GET /dashboard` with a valid session returns 200 with no redirect; the response body contains the dashboard shell (confirmed by a `data-testid="dashboard-shell"` element or equivalent landmark — no `Location` header present).
- **AC-3 (Slice A → Outcome 2 / PAGE-1 / REQ-3):** `GET /[slug]` with no cookie returns 200 with no `Location` header; the response body contains the waitlist page content (not the sign-in form).
- **AC-4 (Slice A → Outcome 1 / REQ-4):** `GET /api/*` (all routes except `/api/webhooks/.*`) with no session returns a 401 JSON response; no protected data appears in the body and the handler body is not executed. (In FOUND-2 scope no public `/api/*` routes exist; future public API endpoints such as `/api/subscribe` must be added to the middleware pass-through list at the time they are built.)
- **AC-5 (Slice C → Outcome 3 / AUTH-2 / REQ-5):** `auth().userId` resolves to a non-null, stable identifier inside authenticated `/dashboard/*` and `/api/*` handlers; unauthenticated requests are gated before the handler runs.

## 9. Non-goals & rabbit holes

Non-goals:
- **Clerk Organizations / multi-tenant** — single founder account per session only; out of scope.
- **Subscriber authentication** — waitlist subscribers never log in or see an auth screen.
- **Owner-isolation predicate (AUTH-2 enforcement itself)** — this PRD only surfaces `userId`; the per-resource ownership check is built in downstream owner-scoped tickets.
- **OAuth/social-provider configuration** — use Clerk defaults; provider tuning is not in scope.

Rabbit holes:
- Do not build a custom auth/session layer — Clerk owns sign-in, sign-up, session, and the `auth()` primitive.
- Do not over-engineer the matcher — enumerate the protected and pass-through paths explicitly; avoid clever catch-all regex that accidentally gates `/[slug]` or webhooks.
- Do not gate `/api/webhooks/.*` — Stripe webhooks authenticate by signature, not session (profile §8).

## 10. Solution shape

Resolved decisions (the approach, not tasks):
- Middleware: `clerkMiddleware()` in `middleware.ts` at repo root with `createRouteMatcher`.
- Matcher policy: protect `/dashboard/:path*` (302) AND `/api/:path*` (401 JSON); pass through `/(auth)/.*`, `/_next/.*`, `/[slug]` (+ other public routes), and `/api/webhooks/.*`.
- Auth pages: top-level `/sign-in` and `/sign-up` (Clerk defaults; `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`).
- `/api/*` unauthenticated → 401 JSON (not 302), because fetch clients cannot follow HTML redirects.

## 11. UX & states

Clerk renders sign-in / sign-up / loading / error states natively — no custom UI states authored here. The one explicit product decision: unauthenticated `/dashboard/*` redirects (302 → `/sign-in`, browser-friendly) while unauthenticated `/api/*` returns 401 JSON (fetch-friendly). No design doc dependency (Clerk-hosted components).

## 12. Data / contracts

No new DB tables and no Prisma migration. The only contract is the server identity: `auth().userId` returns a non-null `string` for authenticated requests, consumed by protected handlers as the founder identity for downstream owner-scoping. No new Zod schema required for this slice.

## 13. Telemetry

n/a — metric-free MVP, no telemetry events for this foundational auth work (profile §2: telemetry not configured).

## 14. Rollout

No feature flag — foundational auth ships directly (profile §8 allows direct MVP ship; flags reserved for ramped features). **Mandatory pre-merge gate: `safety-reviewer` veto** (§5 auth/access-control surface) plus rule tests named to Product-Rule IDs (`test-AUTH-1`, `test-PAGE-1`) green and the `safety` sign-off recorded per DoD.
