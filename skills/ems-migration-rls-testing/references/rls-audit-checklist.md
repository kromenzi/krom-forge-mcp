# RLS Audit Checklist

Use this checklist during review; record evidence, not just yes/no answers.

## Policy and schema

- [ ] Every sensitive table has an explicit tenant/ownership rule.
- [ ] RLS is enabled; force RLS is considered for table owners and service paths.
- [ ] Policies are explicit for SELECT/INSERT/UPDATE/DELETE.
- [ ] `USING` restricts visible/target rows.
- [ ] `WITH CHECK` restricts inserted/updated row values.
- [ ] Default deny behavior is verified with no matching policy.

## Identity and context

- [ ] Tenant identity comes from a trusted authenticated context.
- [ ] Client-supplied tenant IDs are not trusted by themselves.
- [ ] Missing, malformed, expired, and switched claims are tested.
- [ ] Role membership and service-role paths are documented.

## Bypass paths

- [ ] Views, joins, RPC/functions, exports, and bulk operations are tested.
- [ ] `SECURITY DEFINER` functions use a fixed `search_path` and validate inputs.
- [ ] Upsert/conflict paths cannot change tenant ownership.
- [ ] Soft-deleted rows, counts, errors, and pagination do not leak other tenants.
- [ ] Caches, logs, materialized views, and background jobs preserve isolation.

## REST API

- [ ] Every sensitive endpoint has authenticated and unauthenticated cases.
- [ ] 401/403/404 behavior follows the API contract without revealing another tenant's existence.
- [ ] Body, path, query, bulk, and upsert inputs cannot change resource ownership.
- [ ] Response schema, pagination, filtering, sorting, rate limits, and error envelopes are validated.
- [ ] RPC/export endpoints use the same RLS boundary as direct table access.

## E2E Smoke

- [ ] Login, critical read/write journey, logout, and tenant isolation run after deployment/migration.
- [ ] Smoke data is synthetic, isolated, deterministic, and cleaned up even after failure.
- [ ] Tests have bounded timeouts and capture request IDs, screenshots, or traces on failure.
- [ ] Critical Smoke failures block go-live; flaky or load tests remain outside the Smoke suite.

## Missing migration history / Phase 7.4

- [ ] All 33 foundational migration IDs are inventoried with missing/present status.
- [ ] Git history, tags, branches, CI artifacts, ORM/schema dumps, deployment records, and Production migration metadata were searched.
- [ ] Each table, function, trigger, view, grant, extension, index, constraint, and RLS policy has provenance classified as proven, observed, inferred, or unknown.
- [ ] Production DDL is preserved as current-state evidence, not misrepresented as the original migration history.
- [ ] A separately named reconstructed baseline exists, with assumptions and review ownership documented.
- [ ] Empty-database build plus available migrations has automated schema/catalog/data parity checks against Production.
- [ ] RLS, security-definer functions, grants, and tenant-isolation behavior are included in parity—not only tables and columns.
- [ ] Unknown lineage or unexplained diffs force NO-GO or an explicitly approved CONDITIONAL decision.

## Evidence to retain

- SQL or API request, actor identity, tenant context, expected result, actual result.
- Row IDs/counts observed (never include secrets or unnecessary PII).
- Policy definition and schema version under test.
- Reproduction steps and regression test ID for each finding.
