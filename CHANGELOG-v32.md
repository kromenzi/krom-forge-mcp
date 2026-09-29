# KROM Forge v32.0.0 — Debugging Intelligence Engine

## Added
- Evidence-driven Debug Session state.
- Failure classification across code/config/data/permission/environment/dependency/deployment/UI/integration/database/auth/network/performance.
- Falsifiable hypothesis tracking.
- Reproduction contract with expected vs actual behavior.
- Root-cause evidence graph.
- Anti-loop detection after repeated failed or inconclusive strategies.
- Next-diagnostic recommendation engine.
- Evidence-linked root-cause, fix and verification records.
- Debug closure gate that blocks false “fixed” claims without verified evidence.

## New MCP tools
- `krom_create_debug_session`
- `krom_classify_failure`
- `krom_add_debug_evidence`
- `krom_add_debug_hypothesis`
- `krom_record_debug_attempt`
- `krom_update_reproduction`
- `krom_build_root_cause_graph`
- `krom_check_debug_loop`
- `krom_next_debug_diagnostic`
- `krom_set_root_cause`
- `krom_record_debug_fix`
- `krom_verify_debug_fix`
- `krom_evaluate_debug_closure`

## Governing rule
KROM Forge must not claim a bug is fixed unless the focused failing check passes and the supplied verification evidence supports the claim. Repeated failed strategies must produce new evidence or a changed hypothesis instead of blind retries.
