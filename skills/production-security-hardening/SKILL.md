---
name: production-security-hardening
description: Evidence-bound application security hardening for deployed web projects. Use for threat-model-driven fixes, headers/CSP, secrets review, fail-open analysis, and security control verification before release.
---

# Production Security Hardening

## Purpose
Harden the application without weakening availability or hiding findings. Treat every consequential security claim as unproven until a repeatable check produces evidence.

## When to use
Use for a security baseline, exposed secret review, security-header/CSP hardening, fail-open versus fail-closed decisions, or a KROM Forge security assessment.

## When not to use
Do not use as a substitute for a penetration test, incident response, or a production change approval.

## Prerequisites
Repository instructions; clean or explicitly scoped worktree; test environment; authorized read access to deployment configuration; threat model or asset inventory.

## Required inputs
Source tree, package manifests, deployment URL, security headers, auth/data boundaries, existing findings, and approved change scope.

## Inspection workflow
1. Inventory entry points, trust boundaries, secrets, headers, cookies, CORS, CSP, error handling, and third-party scripts.
2. Classify each finding by exploitability, asset, evidence, and remediation.
3. Check whether controls fail open or fail closed and document the user-impact tradeoff.
4. Never print secret values; use names, locations, and redacted fingerprints.

## Remediation / implementation
Apply least-privilege defaults, secure headers, CSP compatible with the app, safe error responses, bounded inputs, and explicit authorization checks. Prefer reversible configuration changes and tests over broad rewrites.

## Verification
Run static checks, targeted HTTP probes, header assertions, secret scanners, authorization tests, and the project test/build gates. Re-run the exact finding checks after the fix.

## Negative tests
Assert missing/invalid auth is rejected; forbidden origins are rejected; unsafe headers are absent; malformed inputs do not cause 5xx; fail-closed paths deny access when dependencies fail.

## Safety guardrails
Never expose credentials. Do not disable lint/security rules to obtain a pass. Do not mutate production without explicit approval. Record uncertainty as PARTIAL or UNKNOWN.

## Production constraints
Use Preview/staging first. Production probes must be read-only or use a dedicated test account. Rate-limit probes and redact response bodies.

## Rollback / recovery
Revert only the approved application/configuration change; preserve audit evidence and verify health, auth, and headers after rollback.

## Evidence and provenance
Finding IDs, redacted command output, test URLs, commit SHA, deployment ID, header snapshots, and KROM Forge assessment references.

## PASS / FAIL criteria
PASS only when all consequential controls have evidence, no open critical/high finding remains, and no required control is missing.

## Expected output
A remediation plan, changed-file list, residual-risk register, verification matrix, and evidence-backed KROM Forge payload.

## Example commands
`npm audit --json`; `npx eslint . -f json`; `curl -sSI https://host`; `git diff --check`.

## KROM Forge integration
Map to existing KROM capabilities `krom_v53_security_harden`, `krom_v53_security_rollback`, and `krom_evaluate_security_assessment`; add this as the Manus execution adapter, not a duplicate registry primitive.

## Agent handoff
Return a concise structured result with: `status`, `scope`, `commit`, `environment`, `findings`, `actions`, `evidenceRefs`, `residualRisks`, and `nextStep`. Never claim execution without host evidence.
