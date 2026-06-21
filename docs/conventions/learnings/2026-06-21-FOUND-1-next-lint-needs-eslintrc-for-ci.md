---
name: next-lint-needs-eslintrc-for-ci
type: CORRECTION
ticket: FOUND-1
date: 2026-06-21
seen: 1
---
`next lint` prompts interactively to create an ESLint config when none exists. In dev that prompt is harmless, but in non-interactive CI the command errors instead of prompting, so a `lint` script with no committed config passes locally and fails in CI.

When scaffolding a Next.js project, ship `.eslintrc.json` (`{ "extends": "next/core-web-vitals" }`) alongside the `lint` script so the gate behaves the same in CI as it does locally.
