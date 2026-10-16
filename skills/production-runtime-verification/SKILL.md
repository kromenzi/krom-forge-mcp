---
name: production-runtime-verification
description: Evidence-backed Production smoke, API health, deployment identity, Vercel runtime-log, and post-deploy verification. Use after deployment, promotion, rollback, or infrastructure change.
---

# Production Runtime Verification

## Purpose
Prove what commit is serving, whether the runtime is healthy, and whether critical user journeys work. Never infer Production state from a Preview URL.

## When to use
Use after deployment/promotion/rollback, for release closure, or when runtime equivalence is uncertain.

## When not to use
Do not treat a local build or HTTP 200 homepage as sufficient production verification.

## Prerequisites
Canonical Production URL; deployment/project ID; expected commit; safe smoke suite; test account; log access; runtime health contract.

## Required inputs
Commit SHA, deployment ID, aliases, health endpoint, API routes, login test plan, thresholds, time window, and expected status codes.

## Inspection workflow
1. Resolve active alias to a deployment and commit.
2. Check health/version endpoint and critical static/API paths.
3. Run bounded authenticated smoke tests with CI secrets.
4. Query runtime errors and targeted Supabase/RPC logs.

## Remediation / implementation
Correct deployment targeting, environment variables, build/runtime configuration, or application defects through a new reviewed change. Do not mask health failures.

## Verification
Repeat after any fix. Require commit equivalence, healthy status, expected HTTP contracts, successful test-account flow, and clean relevant runtime logs.

## Negative tests
Wrong deployment/commit blocks closure; health failure blocks release; malformed API request returns controlled status; runtime error query is not silently skipped.

## Safety guardrails
Redact response bodies and secrets. Use read-only or dedicated test-account actions. Stop if a probe risks lockout or data mutation.

## Production constraints
Set explicit timeouts and bounded retries. Record UTC timestamps, status, deployment ID, commit, and evidence links.

## Rollback / recovery
Use the approved deployment rollback procedure, then repeat the full verification contract.

## Evidence and provenance
Deployment detail, active aliases, health JSON, smoke output, workflow URL, runtime errors query, and final commit.

## PASS / FAIL criteria
PASS requires active alias, expected commit, healthy API, passing smoke suite, and no relevant runtime error.

## Expected output
Production verification record with timeline, status matrix, residual risks, and release recommendation.

## Example commands
`curl -fsS "$BASE/api/health"`; `gh run watch <id> --exit-status`; Vercel runtime logs.

## KROM Forge integration
Use `krom_verify_post_release`, `krom_build_post_deploy_watch_plan`, and `krom_evaluate_production_readiness`; this skill supplies host evidence.

## Agent handoff
Return a concise structured result with: `status`, `scope`, `commit`, `environment`, `findings`, `actions`, `evidenceRefs`, `residualRisks`, and `nextStep`. Never claim execution without host evidence.
