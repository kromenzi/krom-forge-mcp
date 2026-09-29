# KROM Forge v56.0.0 — Cognitive Self-Healing Runtime

## Added
- 24 cognitive runtime MCP tools.
- Portable semantic mission memory and deterministic replay.
- Failure classification and self-healing replan generation.
- Retry budget enforcement and retry-loop detection.
- Provider circuit breaker and failover selection.
- Tool shadow/canary evaluation.
- Semantic tool-overlap detection and advisory deprecation.
- Evidence-weighted agent quorum.
- Deterministic runtime policy compilation and diff.
- Transitive evidence invalidation.
- Causal execution tracing.
- Evidence-only recovery confidence.
- Runtime observability and anomaly detection.
- Consolidated self-healing command snapshot.

## Verification
- Registry/capabilities target: 5,052 / 5,052.
- v56 benchmark validates replay determinism, loop guard, provider failover, semantic overlap, quorum, evidence invalidation and recovery evidence.
- Existing Node 20/22, automation, unit-test, TypeScript, production-audit and Next.js build gates remain mandatory.
