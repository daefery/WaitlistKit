---
ticket: FOUND-2
date: 2026-06-21
tag: ANTI-PATTERN
seen: 1
last_seen: 2026-06-21
status: active
---
`createRouteMatcher(['/dashboard(.*)'])` matches **prefix-sharing siblings**, not just the route subtree. `/dashboardSettings`, `/dashboard-public`, `/dashboardX` all match `/dashboard(.*)` because there is no boundary after `dashboard`. For an auth matcher this is a privilege/scope bug: routes you never meant to protect (or never meant to exist) get swept in, and conversely an attacker-shaped sibling path can land in the protected branch unexpectedly.

Anchor the matcher to the route **and** its children explicitly: `['/dashboard', '/dashboard/(.*)']`. The leading-listed exact path plus the slash-delimited subtree pattern is the safe form — the `/` after `dashboard` is what enforces the boundary.

Reviewer check for any Clerk middleware change: every `createRouteMatcher` glob that protects a route prefix must have a path boundary (`/`) after the segment, or be listed as an exact path. Bare `(.*)` immediately after a word is the smell. (FOUND-2, caught as a round-1 HIGH.)
