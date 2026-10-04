---
name: supabase-security-boundaries
description: Supabase/PostgreSQL security-boundary validation for RPCs, RLS, RBAC, IDOR, SECURITY DEFINER, and service-role isolation. Use for database-backed authorization and privileged-function reviews.
---

# Supabase Security Boundaries

## Purpose
Prove that database access follows least privilege across anonymous, authenticated, role-specific, and service-role contexts. Treat SECURITY DEFINER as a privileged boundary requiring explicit audit.

## When to use
Use for Supabase RPC design, RLS reviews, RBAC/authorization tests, IDOR checks, or service-role exposure audits.

## When not to use
Do not use to bypass RLS, query production with unrestricted service keys, or make destructive schema changes without approval.

## Prerequisites
Schema and policy inventory; non-production fixtures; role matrix; approved test identities; migration history; safe SQL execution path.

## Required inputs
Tables/views/functions, RLS policies, grants, function owner/search_path, role capabilities, object identifiers, and expected allow/deny matrix.

## Inspection workflow
1. Enumerate policies, grants, RPCs, SECURITY DEFINER functions, and service-role call sites.
2. Verify fixed `search_path` and qualified object names for privileged functions.
3. Trace every ID from request to query and tenant/owner predicate.
4. Compare intended RBAC matrix to actual database enforcement.

## Remediation / implementation
Enable and test RLS; write tenant/owner predicates; minimize grants; isolate service-role code server-side; lock SECURITY DEFINER search_path; validate object ownership before mutation.

## Verification
Run least-privilege SQL/API tests for anonymous, user A, user B, manager/admin, and service-role-only operations. Confirm denied rows are absent, not merely hidden in the UI.

## Negative tests
User A cannot read/update/delete User B data; guessed IDs fail; anonymous cannot call privileged RPCs; altered JWT claims do not grant access; SECURITY DEFINER cannot resolve attacker-controlled objects.

## Safety guardrails
Never paste service keys into logs or source. Use transaction rollback for test fixtures. Do not execute DELETE/DROP/ALTER in production validation.

## Production constraints
Prefer metadata reads and read-only probes. Any production write requires explicit approval, isolated fixture, and cleanup plan.

## Rollback / recovery
Revert policy/function changes with a reviewed migration; preserve the prior policy snapshot; re-run both allow and deny tests.

## Evidence and provenance
Policy/function SQL, grants snapshot, role matrix, redacted negative-test results, migration SHA, and query audit output.

## PASS / FAIL criteria
PASS requires deny tests for cross-tenant/IDOR/RBAC paths, verified SECURITY DEFINER boundaries, and no service-role client exposure.

## Expected output
Authorization matrix, SQL review findings, negative-test transcript, migration safety notes, and KROM evidence references.

## Example commands
`supabase db diff`; `supabase migration list`; parameterized SQL with explicit `LIMIT`; API tests per role.

## KROM Forge integration
Map to KROM identity/access, RLS, authorization, and security hardening capabilities; propose a Supabase-specific adapter and reusable negative-test contract.

## Agent handoff
Return a concise structured result with: `status`, `scope`, `commit`, `environment`, `findings`, `actions`, `evidenceRefs`, `residualRisks`, and `nextStep`. Never claim execution without host evidence.
