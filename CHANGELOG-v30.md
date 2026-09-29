# KROM Forge v30.0.0 — Project Intelligence Store

## Added
- Project-scoped intelligence memory schema with explicit `scopeKey` isolation.
- Portable memory mode plus adapter-ready external persistence mode.
- Decisions, failures, evidence, test results, deployments, tasks, risks and architecture snapshots.
- Timeline synthesis and before/after memory comparison.
- Internal integrity audit for duplicate IDs and dangling evidence references.

## New MCP tools
- `krom_create_project_memory`
- `krom_get_project_memory`
- `krom_update_project_memory`
- `krom_record_decision`
- `krom_record_failure`
- `krom_record_evidence`
- `krom_record_test_result`
- `krom_record_deployment`
- `krom_record_task`
- `krom_record_risk`
- `krom_record_project_snapshot`
- `krom_get_project_timeline`
- `krom_compare_project_memory`
- `krom_audit_project_memory`

## Persistence boundary
KROM Forge does not fabricate durable persistence. `PORTABLE` mode requires the host to round-trip/store the memory object. `EXTERNAL_PERSISTENCE` is a contract mode and only represents durable storage when an authorized external store is actually connected and evidence exists.
