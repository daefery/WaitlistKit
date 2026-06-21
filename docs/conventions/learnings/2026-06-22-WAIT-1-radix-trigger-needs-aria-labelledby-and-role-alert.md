---
ticket: WAIT-1
date: 2026-06-22
tag: DISCOVERY
seen: 1
last_seen: 2026-06-22
status: active
---
Two recurring accessibility defects in shadcn/Radix forms, both WCAG AA blockers (profile §6):

1. **`<Label htmlFor>` does not bind to a Radix `SelectTrigger`.** The trigger is not a native labelable element, so `htmlFor` silently no-ops and screen readers announce the select unlabelled. Fix: give the label an `id` and put `aria-labelledby` on the `SelectTrigger`. Any Radix component that isn't a real `<input>/<select>/<textarea>` needs `aria-labelledby`, not `htmlFor`.

2. **Error paragraphs need `role="alert"`.** Validation/server error text rendered without `role="alert"` (or an `aria-live` region) is never announced — a sighted user sees the error, a screen-reader user gets silence. Add `role="alert"` to every error message node.

Reviewer/ui-ux check on any form: confirm non-native control labels use `aria-labelledby` and every error node is in a live region.
