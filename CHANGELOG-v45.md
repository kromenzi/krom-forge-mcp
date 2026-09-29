# KROM Forge v45.0.0 — Unified Engineering Control Plane

## Major capability
Adds a mission-level control plane above the existing engineering engines. v45 coordinates portable mission state, context, execution manifests, host actions, cross-engine gates, blocker arbitration, delivery closure, and post-deploy observation without fabricating execution or evidence.

## New MCP tools
- krom_create_engineering_mission
- krom_build_mission_context_pack
- krom_compile_mission_execution_manifest
- krom_evaluate_mission_gate
- krom_select_mission_next_action
- krom_record_mission_host_result
- krom_resume_engineering_mission
- krom_arbitrate_mission_blockers
- krom_build_cross_engine_gate
- krom_create_delivery_manifest
- krom_verify_delivery_closure
- krom_build_post_deploy_watch_plan
- krom_generate_operator_brief
- krom_audit_control_plane
- krom_compare_missions

## Core rule
KROM coordinates host-authorized capabilities; it never treats missing capabilities, missing evidence, or unexecuted actions as successful work.
