# KROM Forge v40 — Production Readiness & Release Control Engine

Adds a unified release control plane over quality, evidence, security, runtime, recovery, approval, deployment and data readiness.

## New MCP tools
- krom_evaluate_production_readiness
- krom_decide_release
- krom_build_release_checklist
- krom_evaluate_release_exception
- krom_verify_post_release
- krom_create_release_control_summary
- krom_compare_production_readiness

## Core rule
A release is not READY when hard stops, unsupported claims, missing approvals, missing rollback planning, missing runtime verification, or evidence-free PASS states remain. CONDITIONAL requires an explicit exception and does not silently become approval.

## 40.0.1 hotfix
- Fixed TypeScript inference in `buildReleaseChecklist`: required release dimension names are now typed as `DimensionName[]` instead of generic `string[]`.
- Tightened `defaultWeights` to `Record<DimensionName, number>`.
