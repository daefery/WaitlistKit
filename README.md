# WaitlistKit — Viral Waitlist & Coming-Soon Pages

Launch a beautiful "coming soon" page in minutes, capture emails, and let referrals do the marketing. Every signup gets a unique referral link and climbs the list by inviting friends — Robinhood/Superhuman-style viral growth, without the engineering.

---

## 1. Product Summary

**What it is:** A SaaS that lets founders create a hosted waitlist / coming-soon landing page where each subscriber receives a personal referral link and a queue position. Inviting friends moves them up the list, unlocks rewards, and turns every signup into a growth loop.

**Who it's for:** Indie hackers, startup founders, and product teams launching something new who want pre-launch buzz and a list of warm leads on day one.

**Core promise:** Go from "I have an idea" to a live, viral waitlist page collecting emails in under 15 minutes — no code, no Zapier spaghetti.

**Why people pay:** A waitlist with referral mechanics measurably grows an email list faster than a plain form. Founders happily pay $9–29/mo for the months around a launch because the ROI (a bigger launch-day audience) is obvious and time-bound.

---

## 2. Monetization

| Tier | Price | Limits & Features |
|------|-------|-------------------|
| **Free** | $0 | 1 waitlist, up to 100 signups, WaitlistKit branding, basic referral links |
| **Starter** | **$9/mo** | 1 waitlist, up to 2,000 signups, remove branding, custom rewards, CSV export |
| **Pro** | **$29/mo** | Unlimited waitlists, 25,000 signups, custom domain, email automations, analytics, integrations (Mailchimp/Zapier/webhooks), API access |
| **Annual** | 2 months free | Annual billing on Starter/Pro |

**Pricing logic:** Founders need this most intensely for a short window (pre-launch). Monthly billing fits that, and the free tier captures them early so they upgrade the moment they cross 100 signups or want to remove branding. **Removing branding + custom domain are the top two upgrade triggers** — gate them deliberately.

**Payments:** [Stripe](https://stripe.com) Billing with subscriptions, or [Lemon Squeezy](https://lemonsqueezy.com) as merchant-of-record (handles global tax/VAT, easier for solo founders).

---

## 3. Core Features (MVP)

These are required for the first launchable version:

1. **Page builder**
   - Headline, subheadline, logo, hero image/video
   - Email capture form
   - Background/color/theme presets
   - Mobile-responsive hosted page at `yourproject.waitlistkit.app`

2. **Referral engine (the core differentiator)**
   - Every signup gets a unique referral link (`?ref=abc123`)
   - Queue position shown after signup ("You're #482")
   - Position improves as referred friends join
   - Referral count + current position on a personal status page

3. **Rewards / milestones**
   - Define rewards by referral count (e.g., "Refer 3 → skip the line", "Refer 10 → free month at launch")
   - Visual progress bar toward the next reward

4. **Anti-fraud basics**
   - Email verification (double opt-in) so positions can't be gamed with fake emails
   - Duplicate-email and self-referral prevention

5. **Founder dashboard**
   - Total signups, referral conversion rate, top referrers leaderboard
   - Signup list with source/referrer
   - CSV export

6. **Confirmation + share flow**
   - Post-signup screen with the referral link and one-click share to X, WhatsApp, LinkedIn, email, copy link

---

## 4. Nice-to-Have Features (v2+)

- Custom domains (`waitlist.yourproduct.com`)
- Email automations (welcome email, "you moved up", launch-day blast)
- Integrations: Mailchimp, ConvertKit, Zapier, Slack, webhooks
- A/B testing headlines
- Embeddable form widget (drop the waitlist into an existing site)
- Multiple reward tiers + automatic reward fulfillment (coupon codes)
- Team seats
- Analytics: UTM tracking, referral-source breakdown, geographic data
- "Powered by" viral footer that itself drives signups to WaitlistKit

---

## 5. Tech Stack

**Framework:** **Next.js (App Router)** — SSR for fast public waitlist pages and good SEO, API routes for signup/referral logic, server actions for the dashboard.

**Styling:** Tailwind CSS + shadcn/ui.

**Database:** [Supabase](https://supabase.com) (Postgres) or [Neon](https://neon.tech) + Prisma. You need relational data: users → signups → referrals.

**Auth (founders' accounts):** [Clerk](https://clerk.com) or Supabase Auth. Note: *waitlist subscribers* don't log in — only the founders building the lists do.

**Email:** [Resend](https://resend.com) (great Next.js DX) or Postmark — for double opt-in and automations.

**Payments:** Stripe Billing or Lemon Squeezy.

**Background jobs / cron:** Vercel Cron or [Inngest](https://www.inngest.com) for sending "you moved up" emails and scheduled launch blasts.

**Hosting:** [Vercel](https://vercel.com) (native Next.js home, cron + edge included).

---

## 6. Data Model (core tables)

```
users (founders)
  id, email, name, plan, stripe_customer_id, created_at

waitlists
  id, user_id, name, slug, custom_domain, theme_json,
  headline, subheadline, logo_url, rewards_json, created_at

signups
  id, waitlist_id, email, verified (bool), referral_code (unique),
  referred_by (signup_id, nullable), position, referral_count,
  source, created_at

events (optional analytics)
  id, signup_id, type (signup|verify|referral|share), metadata, created_at
```

**Position logic:** A subscriber's effective position is derived from `created_at` adjusted by `referral_count` (each verified referral bumps them up N spots, or sorts a computed score). Recompute on each new verified referral. Keep it simple at MVP: `score = base_signup_order - (referral_count * boost)`, sort ascending.

---

## 7. Architecture Overview

```
Visitor ──▶ Public waitlist page (Next.js SSR, ?ref=code captured)
                    │  submits email
                    ▼
            API route: create signup
                    │  generate unique referral_code
                    │  link referred_by if ?ref present
                    ▼
            Send double opt-in email (Resend)
                    │  user clicks verify
                    ▼
            Mark verified ──▶ recompute referrer's position
                    │              + maybe trigger reward
                    ▼
        Show personal status page (#position, referral link, progress)

Founder ──▶ Dashboard (auth) ──▶ stats, leaderboard, export, settings
Billing ──▶ Stripe webhook ──▶ update plan/limits
```

---

## 8. Build Order (ship a v1 in ~1 week)

**Phase 1 — Foundation (Days 1–2)**
1. Scaffold Next.js + Tailwind + shadcn + Prisma + Supabase.
2. Founder auth (Clerk/Supabase).
3. Data model + migrations.

**Phase 2 — Core waitlist (Days 3–4)**
4. Page builder form (headline, logo, theme) → saves a waitlist.
5. Public hosted page at `/[slug]` (SSR), email capture API route.
6. Referral-code generation + `?ref=` capture + `referred_by` linking.
7. Double opt-in via Resend; on verify, recompute position.

**Phase 3 — Loop + dashboard (Days 5–6)**
8. Post-signup status page: position, referral link, share buttons, progress bar.
9. Rewards/milestones config + display.
10. Founder dashboard: counts, leaderboard, CSV export.

**Phase 4 — Money (Day 7)**
11. Stripe subscriptions + plan gating (signup caps, branding removal).
12. Landing/marketing page + pricing.

**Post-launch:** custom domains, integrations, email automations, embeddable widget.

---

## 9. Go-to-Market

- **Dogfood it:** launch WaitlistKit *with a WaitlistKit waitlist* — instant proof + demo.
- Launch on **Product Hunt**, **Show HN**, **r/SideProject**, **r/Entrepreneur**, **Indie Hackers**.
- The **"Powered by WaitlistKit" footer** on free pages is your built-in viral loop — every free user markets you.
- Content angle: "How to get 1,000 signups before launch" + teardown threads of famous viral waitlists (Robinhood, Superhuman, Clubhouse).
- Target communities where founders gather pre-launch; offer a free tier generous enough to start but capped where it hurts (100 signups, branding).

---

## 10. Competitive Landscape

Existing players: ViralLoops, Waitlist.email, GetWaitlist, Prefinery, LaunchList. Demand is proven. Differentiate by:
- **Simplicity + speed** — live in 15 minutes vs. clunky setup.
- **Better free tier** to win indie hackers, then upsell.
- **Clean modern design** (most competitors look dated).
- A niche wedge if needed (e.g., "viral waitlists for Shopify app makers").

---

## 11. Success Metrics

- Free → paid conversion (target 3–6%)
- **Viral coefficient (K-factor)** of waitlists created — your product's value *is* virality, so measure avg referrals per signup
- Waitlists created per week
- Signups processed (platform-wide) — drives word of mouth
- Churn (expect some post-launch churn since it's launch-window software — counter with multi-product founders and annual plans)

---

## License

Proprietary — © You, 2026. All rights reserved.
