---
name: frontend-regression-repair
description: React/TypeScript/ESLint, Tailwind CSS 4, RTL/dark-mode/print, and asset regression repair. Use for frontend quality hardening and visual compatibility after framework/style changes.
---

# Frontend Regression Repair

## Purpose
Repair frontend correctness without silencing lint rules or hiding visual regressions. Verify behavior across themes, directions, responsive layouts, and print.

## When to use
Use for React Hooks purity/set-state-in-effect/exhaustive-deps, Tailwind migrations, asset/logo/print issues, or visual regression risk.

## When not to use
Do not use to blanket-disable ESLint rules, rewrite components without tests, or accept visual changes without a baseline.

## Prerequisites
Frontend baseline; screenshots/fixtures; lint config; Tailwind/PostCSS/Vite config; supported browsers; print/RTL requirements.

## Required inputs
Lint JSON, affected components, CSS entry, package versions, visual baselines, routes, and accessibility expectations.

## Inspection workflow
1. Classify warnings by purity, state timing, dependency correctness, and unused code.
2. Inspect Tailwind v3/v4 config, CSS-first imports, plugins, and generated styles.
3. Trace assets and print-only paths.
4. Capture dark/RTL/responsive/print baselines.

## Remediation / implementation
Use stable snapshots/callbacks and complete dependencies; migrate to official Tailwind v4 Vite integration; keep CSS-first entry; preserve asset fallbacks and print-safe rendering.

## Verification
Run lint JSON with zero warnings, typecheck, tests, build, visual snapshots, keyboard/accessibility checks, and print/PDF smoke where applicable.

## Negative tests
No render-time nondeterminism; no stale effect; no missing dependency; RTL does not mirror incorrectly; dark mode contrast remains valid; print has required logo/assets.

## Safety guardrails
Do not add eslint-disable without a documented exception. Keep generated assets out of source unless intended. Do not change user data to make visual tests pass.

## Production constraints
Validate on a deployed Preview before Production. Use stable fixtures and redact user content from screenshots.

## Rollback / recovery
Revert frontend/config changes as a unit; re-run lint/build and visual baselines before re-promoting.

## Evidence and provenance
Lint JSON, typecheck/test/build logs, before/after screenshots, CSS/config diff, asset checks, and commit SHA.

## PASS / FAIL criteria
PASS requires zero policy warnings, successful build, and no regression in RTL, dark mode, responsive, print, or required assets.

## Expected output
Repair plan, component/config diff, regression matrix, screenshots, and release recommendation.

## Example commands
`npx eslint . -f json`; `npm run typecheck`; `npm run build`; Playwright visual/print smoke.

## KROM Forge integration
Map to KROM QA, frontend, and release-test domains; recommend a Tailwind/React adapter rather than a generic duplicate.

## Agent handoff
Return a concise structured result with: `status`, `scope`, `commit`, `environment`, `findings`, `actions`, `evidenceRefs`, `residualRisks`, and `nextStep`. Never claim execution without host evidence.
