---
name: safe-rollback-and-recovery
description: Safe Vercel rollback drill, promotion recovery, backup/restore planning, and RTO/RPO measurement. Use for non-destructive recovery verification and release closure.
---

# Safe Rollback And Recovery

## Purpose
Verify recovery without touching application data unless separately approved. Separate Vercel deployment rollback from Supabase migration rollback.

## When to use
Use to validate rollback plans, measure RTO/RPO, rehearse Vercel recovery, or close a readiness recovery blocker.

## When not to use
Do not use for destructive production recovery, database rollback, or restore execution without explicit approval and a reviewed plan.

## Prerequisites
Current and known-good deployment IDs; rollback/promote permissions; smoke suite; monitoring; recovery owner; backup/restore plan; approval.

## Required inputs
Current deployment/commit, prior READY deployment/commit, aliases, start/ready timestamps, health contract, RTO/RPO targets, and rollback scope.

## Inspection workflow
1. Document current and target deployments before change.
2. Confirm target is READY and known-good.
3. Define rollback and immediate re-promotion sequence.
4. Prepare timestamped smoke/log evidence and abort criteria.

## Remediation / implementation
Use only official Vercel rollback/promote APIs/tools. Do not rebuild unless the plan explicitly requires it. Preserve database migrations and data.

## Verification
During rollback check alias, commit, homepage, health, API/login, smoke, and runtime errors. Re-promote current deployment and repeat all checks. Calculate RTO and record RPO assumptions.

## Negative tests
Unknown target blocks rollback; failed health blocks re-promotion; any data/migration change fails the drill scope; runtime errors trigger escalation.

## Safety guardrails
Explicit approval is mandatory. Keep rollback window short. Never roll back Supabase automatically. Never delete deployments, data, or migrations.

## Production constraints
Use low-traffic window, communicate ownership, record timestamps in UTC, and stop on data-integrity or auth failures.

## Rollback / recovery
Rollback drill itself is reversible: re-promote the original deployment. If re-promotion fails, follow the incident plan and do not improvise database changes.

## Evidence and provenance
Before/after deployment IDs, aliases, commit SHAs, API health, smoke results, runtime errors, timestamps, RTO/RPO, and approval.

## PASS / FAIL criteria
PASS requires both states healthy, current version restored, no runtime errors, and measured RTO within target or documented exception.

## Expected output
Rollback drill report, recovery timeline, RTO/RPO result, residual risks, and KROM recovery evidence.

## Example commands
Vercel `request_rollback`; Vercel `request_promote`; `curl /api/health`; bounded smoke workflow.

## KROM Forge integration
Map to `krom_v53_release_rollback`, `krom_v53_recovery_rollback`, `krom_v53_recovery_plan`, and readiness RECOVERY dimension.

## Agent handoff
Return a concise structured result with: `status`, `scope`, `commit`, `environment`, `findings`, `actions`, `evidenceRefs`, `residualRisks`, and `nextStep`. Never claim execution without host evidence.
