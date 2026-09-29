# KROM Forge v38.0.0 — Recovery & Rollback Intelligence

Adds evidence-aware recovery planning and rollback verification.

## New MCP tools
- `krom_create_restore_point`
- `krom_assess_recovery_impact`
- `krom_build_recovery_plan`
- `krom_validate_recovery_execution`
- `krom_verify_recovery`
- `krom_recommend_recovery_strategy`
- `krom_compare_restore_points`

## Core rule
A rollback command completing is not proof of recovery. KROM requires evidence-backed confirmation of target state, service health, and applicable data-integrity checks before reporting recovery success.
