# KROM Forge v25.0.0 — Engineering Orchestrator

## Added
- Host-aware tool/evidence selection via `krom_select_tools`.
- Dependency-aware engineering task graph via `krom_build_task_graph`.
- Portable stateless run state via `krom_plan_execution`.
- Run continuation and dependency unlocking via `krom_resume_task`.
- Evidence-backed claim verification via `krom_verify_evidence`.
- Conservative project inventory audit via `krom_audit_project`.

## Preserved
All v24 MCP tools remain available.

## Architectural boundary
KROM Forge orchestrates engineering work but does not directly execute external actions. The host must provide authorized tools and return evidence. This prevents fabricated claims and keeps secrets out of KROM Forge.

## Verification status
Source package assembled successfully. Dependency installation/build verification could not be completed in the artifact environment because npm dependency installation did not complete within the execution window. Run `npm install && npm run build` locally before production deployment.
