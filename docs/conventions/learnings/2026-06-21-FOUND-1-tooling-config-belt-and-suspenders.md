---
name: tooling-config-belt-and-suspenders
type: ANTI-PATTERN
ticket: FOUND-1
date: 2026-06-21
seen: 1
---
Relying on a tool's implicit/default behavior instead of declaring config explicitly produces "works now, breaks later" scaffolds that pass the build but fail under different tooling. Two cases hit on FOUND-1:

- `tsconfig.json` had `paths` but no `"baseUrl": "."`. Next.js bundler mode tolerates this at build time, but raw `tsc` and IDE tooling can mis-resolve `@/` imports. Always pair `paths` with an explicit `baseUrl`.
- No root `"postinstall": "prisma generate"`. Prisma 6 generates via `@prisma/client`'s own postinstall, but pnpm hook ordering can change; the explicit root hook is the safe form.

Scaffold checklist: declare `baseUrl` with `paths`, and add an explicit `postinstall: prisma generate` rather than trusting a dependency's internal hook.
