---
name: release-gate-and-readiness
description: Release Gate engineering and zero-blocker production certification across build, test, security, evidence, runtime, recovery, quality, approval, deployment, and data.
---

# Release Gate And Readiness

## Purpose
Aggregate independent evidence into a deterministic release decision. Distinguish PASS, WARN, CONDITIONAL, BLOCKED, and READY; never upgrade a warning by assertion.

## When to use
Use before production release, after a blocker remediation, or when KROM Forge needs a final evidence-backed readiness decision.

## When not to use
Do not use to bypass approval, downgrade critical risks, or call CONDITIONAL equivalent to READY.

## Prerequisites
Release ID/commit; gate definitions; CI results; security assessment; deployment/runtime evidence; rollback evidence; approval and exception policy.

## Required inputs
Dimension states/scores, blockers, critical risks, evidence refs, approval state, rollback verification, environment, owner, and unsupported claims.

## Inspection workflow
1. Enumerate required dimensions and hard stops.
2. Verify each PASS has evidence and each WARN has an owner/action.
3. Check contradictions: successful workflow with wrong commit, healthy preview, missing rollback proof, or unsupported claims.
4. Calculate score and apply the release decision rule.

## Remediation / implementation
Close blockers at their source; attach evidence; rerun only affected gates and the final aggregate. Keep exceptions explicit and time-bounded.

## Verification
Run KROM security assessment, production readiness evaluation, then release decision. Confirm no missing controls, hard stops, unsupported claims, or unverified recovery dimension.

## Negative tests
A missing evidence ref cannot be PASS; approval required but absent blocks; rollback unverified yields CONDITIONAL; open critical/high finding blocks.

## Safety guardrails
Never fabricate evidence or mark host actions executed from a plan. Never use `allowConditional` to claim READY.

## Production constraints
Use a release ID tied to the exact commit and deployment. Require explicit approval for exceptions and preserve the decision payload.

## Rollback / recovery
If READY is lost after deployment, invoke the approved rollback skill and re-run the complete gate.

## Evidence and provenance
KROM payloads, CI URLs, deployment detail, smoke results, runtime logs, rollback timeline, approval, and data/migration proof.

## PASS / FAIL criteria
READY requires score threshold, all required dimensions PASS, no hard stop, no open critical risk/blocker, and verified rollback/recovery.

## Expected output
Gate matrix, score, decision, blockers, warnings, unsupported-claim list, and certification statement.

## Example commands
KROM `krom_evaluate_security_assessment`, `krom_evaluate_production_readiness`, `krom_decide_release`.

## KROM Forge integration
Directly compose `krom_build_release_checklist`, `krom_evaluate_production_readiness`, `krom_decide_release`, and `krom_v70_evaluate_delivery_closure`.

## Agent handoff
Return a concise structured result with: `status`, `scope`, `commit`, `environment`, `findings`, `actions`, `evidenceRefs`, `residualRisks`, and `nextStep`. Never claim execution without host evidence.
