# KROM Forge Execution Runbook

Use this runbook when the host exposes KROM Forge MCP tools. KROM Forge is an evidence-safe coordinator: it can route, plan, verify, and decide, but it must not be told that unsupplied files, Production state, or tests were observed.

## Required phase order

1. **Route** the request with `krom_route_workflow`.
2. **Build** a deterministic plan with `krom_v77_build_native_mission_plan`, including `evidenceReady`, `schemaValidated`, `hostAuthorized`, `minimumConfidence`, and `maxCapabilities`.
3. **Supply evidence**: project snapshot, Git refs, migration inventory, Production catalog/DDL manifest, reconstructed manifest, test artifacts, RLS/REST/E2E results, and a host-attested Supabase execution receipt bound to each manifest by SHA-256.
4. **Verify claims** with `krom_verify_evidence`; keep missing claims `UNVERIFIED`.
5. **Inspect/audit/validate** only the supplied snapshots using the selected KROM capabilities. Never claim a capability executed against the host unless an execution receipt is supplied.
6. **Evaluate readiness and release** using KROM gates. Treat unresolved migration lineage, parity differences, and cross-tenant exposure as hard stops.

## Host evidence contract

The host should provide a manifest rather than raw secrets. Minimum fields:

```json
{
  "run_id": "phase-7-4-2026-10-15",
  "environment": "staging",
  "source_revision": "<commit-sha>",
  "generated_at": "<UTC timestamp>",
  "migration_ids": [],
  "missing_migration_ids": [],
  "production_manifest_ref": "evidence/production.json",
  "reconstructed_manifest_ref": "evidence/reconstructed.json",
  "test_artifacts": [],
  "rls_policy_snapshot_ref": "evidence/rls-policies.sql",
  "evidence_refs": [],
  "provenance": {
    "source_type": "supabase_mcp | supabase_cli | host_ci",
    "role": "production | reconstructed",
    "project_ref": "<supabase-project-ref>",
    "environment": "staging",
    "captured_at": "<UTC timestamp>",
    "run_id": "<run-id>",
    "source_revision": "<commit-sha>",
    "payload_sha256": "<sha256 of manifest excluding provenance and receipt>"
  },
  "execution_receipt": {
    "receipt_id": "<receipt-id>",
    "run_id": "<run-id>",
    "target_service": "supabase",
    "project_ref": "<supabase-project-ref>",
    "environment": "staging",
    "started_at": "<UTC timestamp>",
    "finished_at": "<UTC timestamp>",
    "exit_code": 0,
    "host_attested": true,
    "payload_sha256": "<same sha256>",
    "tests_run": ["RLS", "REST", "Storage", "Migration"],
    "test_results": [{"name": "RLS", "status": "passed", "artifact_uri": "evidence/rls.json", "artifact_sha256": "<sha256>"}, {"name": "REST", "status": "passed", "artifact_uri": "evidence/rest.json", "artifact_sha256": "<sha256>"}, {"name": "Storage", "status": "passed", "artifact_uri": "evidence/storage.json", "artifact_sha256": "<sha256>"}, {"name": "Migration", "status": "passed", "artifact_uri": "evidence/migration.json", "artifact_sha256": "<sha256>"}],
    "artifacts": [{"uri": "evidence/results.json", "sha256": "<sha256>"}]
  }
}
```

Redact secrets, tokens, PII, connection strings, and full production rows. Preserve hashes, object names, policy definitions, counts, and provenance. A JSON file supplied by a user or agent without a host-attested receipt is **UNVERIFIED** and cannot support a production GO decision.

The Ed25519 public key used by `verify_signed_receipt.py` must be provisioned out-of-band by the trusted CI/KROM operator. Do not generate the key pair in the same job that creates the evidence, and do not trust a public key embedded only in the evidence JSON. The signer must be authorized to run against the stated Supabase project and environment.

## Gate rules

- **G1 scope**: EMS-1A, EMS-1B, REST, E2E Smoke, Migration, RLS, and Phase 7.4 are explicitly separated.
- **G2 lineage**: all 33 foundational IDs are inventoried; unknowns are not silently promoted.
- **G3 parity**: reconstructed and Production manifests match for schema, functions, triggers, grants, and policies, or every difference has approved disposition.
- **G4 behavior**: Migration, rollback/recovery, REST contracts, and E2E Smoke evidence exist.
- **G5 isolation**: tenant A/B negative tests pass through SQL, REST, RPC, and E2E paths.
- **G6 evidence**: each claim has a source and timestamp; no unverified claim is used for GO.
- **G7 execution authenticity**: each manifest is bound to a host-attested Supabase receipt, matching project/environment/run ID and payload SHA-256; otherwise BLOCKED.
- **G8 approval authority**: Merge/Deploy approval must be a separately signed receipt whose approver, role, key ID, and approval identities match an out-of-band approver registry; JSON fields inside a test result are not approvals.
- **G9 CI execution proof**: the protected workflow must emit a signed GitHub Actions attestation containing repository, workflow ref, commit SHA, run ID, Supabase project ref, environment, and the workflow-template hash; a local test run is not proof that GitHub Actions ran.
- **G10 command integrity**: `scripts/validate_ci_commands.py` must reject empty, placeholder, runnerless, or domainless CI commands before an adapter can emit a passed receipt. This is a static shape guard, not semantic proof of a security test.
- **G11 release**: unresolved Critical/High findings, cross-tenant access, missing RLS, or unexplained parity differences force BLOCKED/NO-GO. A local 14/15-test result, a command-shape pass, or an adapter receipt alone never proves real Supabase/GitHub integration.

## Decision vocabulary

Use `READY` only when gates are satisfied and the KROM response supports it. Use `CONDITIONAL` only with named exceptions, owner, expiry, and compensating control. Use `BLOCKED`/`NO-GO` when evidence is missing or a hard stop is present. A KROM route marked `READY` means routing/contract readiness, not that the investigation ran or passed.

## Safe dispatch rule

Do not dispatch a mutation or repair capability merely because a route selected it. First verify exact capability schema, host authorization, approval requirements, target environment, rollback plan, and supplied evidence. Prefer read-only audit/validate/test capabilities for this problem; create SQL patches as review artifacts before any application.
