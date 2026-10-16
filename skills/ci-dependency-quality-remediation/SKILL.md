---
name: ci-dependency-quality-remediation
description: Safe dependency vulnerability remediation and CI quality gates for Node/React projects. Use for npm audit, TypeScript, ESLint, tests, build, SBOM, and PR gates.
---

# Ci Dependency Quality Remediation

## Purpose
Reduce reachable risk without force upgrades or warning suppression. Treat dependency and quality changes as coupled release work.

## When to use
Use for npm audit findings, CI quality-gate failures, ESLint warnings, build failures, or security regression contract setup.

## When not to use
Do not use `npm audit fix --force`, arbitrary major upgrades, or rule disabling as an automatic repair.

## Prerequisites
Lockfile; supported Node version; package scripts; CI config; vulnerability report; test/build baseline; dependency ownership.

## Required inputs
Audit JSON, direct/transitive dependency graph, affected code paths, package release notes, compatibility constraints, and required thresholds.

## Inspection workflow
1. Separate production and development vulnerabilities.
2. Identify reachable paths and fixed versions.
3. Baseline typecheck/tests/lint/build and warning counts.
4. Review lockfile diff and CI gate behavior.

## Remediation / implementation
Prefer targeted upgrades, replacements, patches, and code remediation. Keep lockfile deterministic. Add regression tests and fail CI on new warnings/findings.

## Verification
Run audit, typecheck, tests, lint with JSON output, build, diff check, and security contracts on the exact branch/commit.

## Negative tests
CI fails on warning regression, unsafe lockfile drift, failed build, newly reachable vulnerability, or missing security test.

## Safety guardrails
Never suppress warnings or expose audit credentials. Do not accept force-upgrade trees without an explicit approval and compatibility report.

## Production constraints
Only deploy after all gates pass on the same commit. Retain audit reports and package-lock diff.

## Rollback / recovery
Revert the dependency/quality commit and restore the prior lockfile if compatibility or security regresses; rerun all gates.

## Evidence and provenance
Audit JSON, lockfile diff, CI URLs, lint counts, test/build output, SBOM, and remediation rationale.

## PASS / FAIL criteria
PASS requires zero reachable blocker, zero lint warnings/errors where policy requires, passing tests/build, and reviewable lockfile.

## Expected output
Dependency remediation matrix, quality baseline, changed packages, regression proof, and CI gate configuration.

## Example commands
`npm audit --json`; `npm audit fix`; `npm run typecheck`; `npm run test`; `npm run lint`; `npm run build`.

## KROM Forge integration
Map to KROM vulnerability-management, QA, supply-chain, and release-test capabilities; retain this as the project execution adapter.

## Agent handoff
Return a concise structured result with: `status`, `scope`, `commit`, `environment`, `findings`, `actions`, `evidenceRefs`, `residualRisks`, and `nextStep`. Never claim execution without host evidence.
