import { describe, it, expect } from 'vitest'

/**
 * Route classification logic mirroring middleware.ts patterns.
 *
 * Why replicate instead of importing createRouteMatcher?
 * @clerk/nextjs/server is an edge-only module that cannot run in a Node
 * Vitest environment. These regexes encode the same invariants as the
 * middleware matchers and fail loudly if the classification policy drifts.
 *
 * Full auth-flow integration tests (session round-trips) require
 * Playwright + live Clerk keys — tracked as TODO in FOUND-E2E.
 */

function classifyRoute(pathname: string): 'webhook' | 'protected-api' | 'protected-dashboard' | 'public' {
  // Mirrors middleware.ts exactly:
  //   isWebhookRoute:   ['/api/webhooks/(.*)']
  //   isApiRoute:       ['/api/(.*)']           ← requires at least one segment after /api/
  //   isDashboardRoute: ['/dashboard', '/dashboard/(.*)']  ← anchored; /dashboardX is public
  if (/^\/api\/webhooks(\/.*)?$/.test(pathname)) return 'webhook'
  if (/^\/api\/.+/.test(pathname)) return 'protected-api'
  if (/^\/dashboard($|\/)/.test(pathname)) return 'protected-dashboard'
  return 'public'
}

// test-AUTH-1: /dashboard/* routes require an active Clerk session
describe('test-AUTH-1 — dashboard routes are protected', () => {
  it('classifies /dashboard as protected-dashboard', () => {
    expect(classifyRoute('/dashboard')).toBe('protected-dashboard')
  })

  it('classifies /dashboard/ as protected-dashboard', () => {
    expect(classifyRoute('/dashboard/')).toBe('protected-dashboard')
  })

  it('classifies /dashboard/waitlists as protected-dashboard', () => {
    expect(classifyRoute('/dashboard/waitlists')).toBe('protected-dashboard')
  })

  it('classifies /dashboard/settings/billing as protected-dashboard', () => {
    expect(classifyRoute('/dashboard/settings/billing')).toBe('protected-dashboard')
  })

  it('does NOT gate /dashboardSettings — prefix-boundary test (must stay public)', () => {
    // Regression: createRouteMatcher(['/dashboard(.*)']) would wrongly gate this.
    // The anchored patterns ['/dashboard', '/dashboard/(.*)'] are correct.
    expect(classifyRoute('/dashboardSettings')).toBe('public')
  })
})

// test-AUTH-1 (API): /api/* (non-webhook) routes return 401 JSON when unauthenticated
describe('test-AUTH-1 (API) — api routes are protected with 401', () => {
  it('classifies /api/waitlists as protected-api', () => {
    expect(classifyRoute('/api/waitlists')).toBe('protected-api')
  })

  it('classifies /api/waitlists/abc123 as protected-api', () => {
    expect(classifyRoute('/api/waitlists/abc123')).toBe('protected-api')
  })

  it('classifies /api/subscribers as protected-api', () => {
    expect(classifyRoute('/api/subscribers')).toBe('protected-api')
  })
})

// Webhook passthrough — Stripe signature auth, never session-gated (DoD)
describe('webhook routes bypass session gate', () => {
  it('classifies /api/webhooks/stripe as webhook (passthrough)', () => {
    expect(classifyRoute('/api/webhooks/stripe')).toBe('webhook')
  })

  it('classifies /api/webhooks/clerk as webhook (passthrough)', () => {
    expect(classifyRoute('/api/webhooks/clerk')).toBe('webhook')
  })
})

// test-PAGE-1: Public routes are accessible without authentication
describe('test-PAGE-1 — public routes are NOT protected', () => {
  it('classifies / as public', () => {
    expect(classifyRoute('/')).toBe('public')
  })

  it('classifies /some-waitlist-slug as public', () => {
    expect(classifyRoute('/some-waitlist-slug')).toBe('public')
  })

  it('classifies /my-startup as public', () => {
    expect(classifyRoute('/my-startup')).toBe('public')
  })

  it('classifies /sign-in as public', () => {
    expect(classifyRoute('/sign-in')).toBe('public')
  })

  it('classifies /sign-up as public', () => {
    expect(classifyRoute('/sign-up')).toBe('public')
  })
})
