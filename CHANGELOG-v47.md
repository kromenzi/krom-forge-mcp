# KROM Forge v47.0.0 — Mega Control Plane

## Added
- 48 integrated MCP tools
- Semantic intent routing and ambiguity detection
- Evidence freshness, invalidation and reverification planning
- Unified change-impact and test/runtime reverification graph
- Reusable workflow template engine
- Enterprise audit package, evidence index, approval ledger and exception register
- Release-train orchestration, canary sequence and rollback matrix
- Project health snapshot/gate and contradiction detection
- Authorized autonomy action queue, precondition validation and evidence-before-action enforcement

## Version integrity
Homepage already derives its version from package metadata. v47 also changes /health and MCP serverInfo/capabilities to derive the version from package.json, preventing future UI/health/server version drift.

## Boundary
All tools reason over host-supplied evidence. They do not fabricate file edits, tests, approvals, deployments, runtime health, persistence or execution.
