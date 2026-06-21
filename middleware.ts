import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isDashboardRoute = createRouteMatcher(['/dashboard', '/dashboard/(.*)'])
const isApiRoute = createRouteMatcher(['/api/(.*)'])
const isWebhookRoute = createRouteMatcher(['/api/webhooks/(.*)'])

export default clerkMiddleware(async (auth, request) => {
  // Stripe webhooks authenticate via signature — never session-gate them (PRD §9 / DoD)
  if (isWebhookRoute(request)) return

  // API routes: return 401 JSON for unauthenticated (fetch clients can't follow HTML redirects)
  if (isApiRoute(request)) {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return
  }

  // Dashboard UI routes: redirect to sign-in (AUTH-1)
  if (isDashboardRoute(request)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
