---
name: scaffold-must-pass-clean-clone-setup
type: PATTERN
ticket: FOUND-1
date: 2026-06-21
seen: 1
---
A scaffold ticket is only "done" when a fresh clone can be brought up by following the README alone. Shipping `.env.example` is not enough if `.gitignore` ignores `.env` and no doc tells the next person to copy it — the clean clone has no env and fails to start.

For scaffold/infra tickets, the build artifact must include a "Local development" README section with the explicit bootstrap steps (e.g. `cp .env.example .env`, install, migrate, build). Treat "clones clean and runs from README" as the real acceptance check, not "runs on my machine."
