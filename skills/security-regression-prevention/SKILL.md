---
name: security-regression-prevention
description: Security regression contracts and continuous prevention for authentication, authorization, RLS, headers, migrations, dependencies, and release gates. Use in CI and before every production promotion.
---

# Security Regression Prevention

## Purpose
Encode previously fixed security controls as deterministic, non-secret tests that fail closed when a regression appears.

## When to use
Use to create or maintain CI security-hardening contracts, PR quality gates, production probes, and post-deploy regression checks.

## When not to use
Do not use as a full penetration test, fuzzing campaign, or license to probe third-party systems.

## Prerequisites
Threat/control inventory; test fixtures; CI runner; redacted assertions; expected status/error contracts; owner for each control.

## Required inputs
Control IDs, test commands, expected HTTP/DB outcomes, dependency policy, migration checks, and release conditions.

## Inspection workflow
1. Convert each finding/control into a deterministic assertion.
2. Separate local, CI, Preview, and Production checks.
3. Ensure tests cannot leak secrets or mutate shared data.
4. Add coverage for negative and fail-closed paths.

## Remediation / implementation
Add contract tests, CI workflow gates, scheduled smoke/probe jobs, and evidence artifact retention. Pin versions and keep failure messages actionable.

## Verification
Run the suite on PR and main; inspect all assertions and exit codes; verify the same commit is deployed; run bounded post-deploy checks.

## Negative tests
A missing rate limiter, open RLS path, unsafe header, leaked secret pattern, migration drift, or failed dependency gate must fail CI/release.

## Safety guardrails
Do not store real credentials in fixtures. Avoid destructive production tests. Require approval for production workflow dispatch and external changes.

## Production constraints
Use scheduled or manually approved probes with dedicated accounts, bounded rate, redacted artifacts, and alerting.

## Rollback / recovery
Revert the regression-causing change; keep the failing contract until the fix is verified.

## Evidence and provenance
Test files, workflow runs, exit codes, artifact links, control coverage, and deployment SHA.

## PASS / FAIL criteria
PASS requires all mandatory contracts green and no skipped/ignored security control without documented exception.

## Expected output
Security regression catalog, CI workflow design, control coverage matrix, and maintenance plan.

## Example commands
`npm test -- tests/security-hardening-contracts.test.js`; `gh run list`; `gh run watch`; bounded curl probes.

## KROM Forge integration
Map to KROM security-test, QA, release-test, and evidence capabilities; recommend registry metadata linking controls to tests.

## Agent handoff
Return a concise structured result with: `status`, `scope`, `commit`, `environment`, `findings`, `actions`, `evidenceRefs`, `residualRisks`, and `nextStep`. Never claim execution without host evidence.
