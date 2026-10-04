---
name: migration-and-schema-safety
description: Safe database migration, production verification, schema fingerprint, and baseline-drift workflow. Use before or after Supabase/PostgreSQL schema changes.
---

# Migration And Schema Safety

## Purpose
Make schema changes observable, reversible where possible, and independently verifiable. Separate application rollback from database rollback.

## When to use
Use for migration review, production apply, RPC rollout, schema baseline/fingerprint checks, or migration incident analysis.

## When not to use
Do not use for destructive migration execution without explicit approval, backup/restore plan, and owner sign-off.

## Prerequisites
Migration files; source/target schema; dependency graph; backup/restore plan; maintenance/lock expectations; approved execution identity.

## Required inputs
Migration SQL, expected objects, current schema snapshot, migration history, fingerprint algorithm, data compatibility rules, and rollback posture.

## Inspection workflow
1. Parse DDL/DML and classify locks, data loss, backfill, security, and compatibility risk.
2. Compare migration history and schema fingerprint to the declared baseline.
3. Check SECURITY DEFINER, RLS, indexes, constraints, and function signatures.
4. Define expand/contract sequencing for application compatibility.

## Remediation / implementation
Use additive, idempotent, bounded migrations; qualify schemas; add constraints after backfill; keep rollback/forward-fix documented; never hide drift by rewriting history.

## Verification
Apply in disposable/staging DB, run schema diff/fingerprint, execute contract tests, then verify production object existence and behavior without exposing data.

## Negative tests
Migration is rejected when checksum/history drifts; repeated apply is idempotent; old app remains compatible during expand phase; missing RPC/policy fails health gate.

## Safety guardrails
No `DROP`, truncation, destructive data rewrite, or production migration without explicit approval. Never roll back a security migration merely to pass an app test.

## Production constraints
Record start/end, migration ID, operator, target project, lock/latency observations, and post-apply verification. Keep a restore point.

## Rollback / recovery
Prefer forward fix; if rollback is approved, use the documented reversible migration and verify application compatibility. Database rollback is distinct from Vercel deployment rollback.

## Evidence and provenance
Migration SHA/checksum, schema fingerprint before/after, apply logs, object verification, backup/restore reference, and approval record.

## PASS / FAIL criteria
PASS requires expected schema, policies, functions, and fingerprints with no unexplained drift or failed compatibility check.

## Expected output
Migration risk review, execution plan, fingerprint report, verification matrix, and explicit rollback decision.

## Example commands
`supabase migration list`; `supabase db diff`; catalog queries with explicit `LIMIT`; checksum comparison.

## KROM Forge integration
Map to KROM security/release/data migration primitives and `krom_v53_release_migrate`; add a specialized schema-fingerprint evidence contract.

## Agent handoff
Return a concise structured result with: `status`, `scope`, `commit`, `environment`, `findings`, `actions`, `evidenceRefs`, `residualRisks`, and `nextStep`. Never claim execution without host evidence.
