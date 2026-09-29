# KROM Forge v50

## Added

- 51 MCP tools across eight integrated engineering operating systems.
- TypeScript-AST MCP manifest generation with deterministic SHA-256 fingerprinting.
- Registration metadata validation for title, description and input schema.
- Contract tests for manifest parity, metadata, fingerprint determinism and source locations.
- Behavioral tests for policy, lineage, verification, confidence, incident, compatibility, agent and improvement controls.
- Node 20 and Node 22 contract compatibility jobs in GitHub Actions.
- Machine-readable MCP manifest and verification artifacts.

## Changed

- Version advanced to `50.0.0`.
- Static verification now consumes the AST manifest instead of regex-only registration discovery.
- CI separates cross-version contract gates from the Node 22 production quality gate.
- Capability declarations support the versioned `V50_TOOL_NAMES` registry while remaining source-auditable.

## Boundaries

- No deployment was requested or performed.
- No merge to `main` was requested or performed.
- Missing or unverified evidence never becomes a passing claim.
