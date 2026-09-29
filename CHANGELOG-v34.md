# KROM Forge v34.0.0 — Autonomous Engineering Loop

## Added
- Autonomous, resumable engineering loop state machine.
- Phases: INTAKE → INSPECT → RESEARCH → PLAN → AGENTS → PATCH → DEBUG → UIUX → VERIFY → EVIDENCE → RELEASE.
- Host-tool and evidence requirements per step.
- Retry budget and anti-loop blocking.
- Portable run state for interruption/resume.
- Release eligibility audit based on verified evidence.

## New MCP tools
- `krom_create_autonomous_loop`
- `krom_get_next_autonomous_action`
- `krom_advance_autonomous_loop`
- `krom_record_loop_host_result`
- `krom_resume_autonomous_loop`
- `krom_audit_autonomous_loop`

## Boundary
KROM Forge coordinates and validates work. External browsing, repository access, file mutation, execution, database actions, browser verification and deployment still require host-authorized tools. No success claim is fabricated.
