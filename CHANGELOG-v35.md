# KROM Forge v35 — Host Capability Bridge

- Adds evidence-backed Host Capability Snapshots for ChatGPT, Codex, custom MCP hosts and other runtimes.
- Maps real host tools/operations/evidence kinds to KROM requirements.
- Adapts the v34 Autonomous Engineering Loop to actual available capabilities.
- Explicitly blocks or degrades steps when required capabilities are missing.
- Adds host-aware execution strategy and evidence capability validation.
- Adds capability snapshot comparison for changing host sessions/integrations.
- Preserves all v24–v34 tools and boundaries.

New MCP tools:
- `krom_register_host_capabilities`
- `krom_assess_host_requirements`
- `krom_adapt_loop_to_host`
- `krom_recommend_host_strategy`
- `krom_validate_host_evidence`
- `krom_compare_host_capabilities`
