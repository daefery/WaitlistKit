---
name: pnpm-build-as-headless-scaffold-proxy
type: PATTERN
ticket: FOUND-1
date: 2026-06-21
seen: 1
---
`pnpm dev` is hard to verify headlessly (long-running, no clean exit code). For scaffold/infra verification, use `pnpm build` as the proxy for "the app boots and compiles" — it exits with a definitive status and exercises typecheck, route compilation, and config resolution in one shot.

Pairs well with corepack `packageManager` field pinning (FOUND-1 confirmed corepack auto-downloaded pnpm 9.15.0 from the pin), giving a reproducible, headless smoke check for scaffold tickets.
