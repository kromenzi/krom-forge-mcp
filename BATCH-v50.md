# KROM Forge v50 - Engineering Operating System

Version 50 is a milestone architecture batch. It adds 51 integrated MCP tools and replaces regex-only registry inspection with a TypeScript-AST manifest pipeline.

## Eight operating systems

1. **Policy-as-Code** compiles facts and prioritized rules into explainable allow, deny or conditional decisions, including evidence-bound exceptions.
2. **Evidence Lineage** models support, derivation, contradiction, invalidation and replacement across claims and artifacts.
3. **Verification Portfolio Optimization** selects risk-reducing checks within a time budget while protecting mandatory and critical coverage.
4. **Confidence Calibration** discounts unsupported passes, applies reliability weights and produces evidence-bounded release decisions.
5. **Incident Command** coordinates severity, ownership, timelines, objectives and closure evidence.
6. **Compatibility Lifecycle** detects breaking contracts, maps consumer impact and controls deprecation, migration waves and sunset readiness.
7. **Agent Reliability** scores evidence discipline, scope compliance and handoff quality before routing work or granting trust.
8. **Continuous Improvement** clusters recurring failures, measures controls and prioritizes engineering investments within capacity.

## AST manifest pipeline

`scripts/mcp-manifest-lib.mjs` parses `app/mcp/route.ts` with the TypeScript compiler API. It extracts every registered tool, title, description, input schema expression, capability entry, source module and source line. The generated manifest includes a deterministic SHA-256 fingerprint.

```text
TypeScript source
  -> AST registration inventory
  -> metadata and capability parity
  -> deterministic manifest fingerprint
  -> unit tests and CI artifacts
```

## Verification architecture

GitHub Actions runs contract gates on Node 20 and Node 22. The production gate then runs type checking, dependency audit and Next.js build on Node 22, and uploads both the verification report and MCP manifest.

No deployment or merge is performed by this batch. Host execution evidence remains mandatory for build, test, CI, recovery, approval and runtime claims.
