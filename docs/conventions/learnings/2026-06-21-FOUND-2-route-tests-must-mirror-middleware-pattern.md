---
ticket: FOUND-2
date: 2026-06-21
tag: CORRECTION
seen: 1
last_seen: 2026-06-21
status: active
---
A route-classification unit test gives **false confidence** when its matcher is written differently from the production matcher. On FOUND-2 the `classifyRoute` test used `/^\/dashboard(\/.*)?$/` (anchored, slash-delimited) while the middleware shipped `/dashboard(.*)` (unanchored). The test classified `/dashboardSettings` as *not* dashboard; the middleware classified it as dashboard. The tests were green and still hid the exact boundary the middleware was violating.

When you unit-test a route guard, the test must exercise the **same pattern the middleware uses** — ideally import the actual matcher/pattern array rather than re-deriving an equivalent regex. Two independently-authored regexes that "should" be equivalent are a divergence waiting to happen, precisely on the edge cases that matter.

Reviewer check: when a PR touches both a route matcher and its tests, diff the two patterns against each other and confirm there is at least one **boundary regression case** (e.g. `/dashboardSettings` and `/dashboard/x`) that pins the exact prefix boundary. (FOUND-2 added this case after the fix.)
