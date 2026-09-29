# KROM Forge v51 - Frontier Operations

Version 51 expands KROM Forge from a control plane into an evidence-bound engineering operations model. It adds 72 MCP tools across 12 systems while preserving every previous contract.

## Twelve integrated systems

1. **Mission Runtime and Checkpointing** compiles mission stages into capability, evidence, approval and retry-aware execution state; detects deadlocks and builds recovery routes.
2. **Causal Decision Intelligence** connects options, assumptions, evidence, reversibility and observed outcomes into auditable decision paths.
3. **Counterfactual Scenario Laboratory** simulates delivery strategies, maps sensitivity, detects fragility and selects resilient strategies from supplied scenarios.
4. **Risk Capital and Portfolio Budgeting** allocates finite risk capacity to evidenced change value while detecting concentration and dependency gaps.
5. **Capability Market and Delegation Contracts** matches demands to evidenced providers, enforces approval contracts and exposes capacity bottlenecks.
6. **Knowledge Freshness and Consolidation** retires stale or replaced knowledge, detects live contradictions and plans missing-topic refresh work.
7. **Safety Case and Assurance Arguments** links hazards, controls, claims, arguments and verified evidence into release assurance decisions.
8. **Release Digital Twin** models component transitions, failure propagation, prediction risk and fidelity against observed runtime evidence.
9. **Tool Ecosystem and Composition Planning** builds tool dependency graphs, detects cycles, finds capability paths and optimizes reliable compositions.
10. **Drift Forecasting and Early Warning** forecasts only from verified time-series evidence, detects leading indicators and calibrates predictions against actuals.
11. **Human Oversight and Escalation** classifies review requirements, audits role-complete approvals and maps actions to escalation authority.
12. **Outcome Learning and Calibration** links interventions to verified outcomes, measures effects, exposes cohort bias and recalibrates predictions.

## Connected operating model

```text
Mission runtime
  -> capability market and tool composition
  -> causal decisions and counterfactual scenarios
  -> risk-capital allocation and human oversight
  -> safety case and release digital twin
  -> drift observation and outcome learning
  -> refreshed knowledge and the next mission checkpoint
```

All systems consume host-supplied data. They plan, evaluate and verify; they do not fabricate browsing, code mutation, approvals, CI, deployment, runtime recovery or production outcomes.

## Verification contract

- TypeScript-AST registry manifest with deterministic SHA-256 fingerprint.
- Registration, capability, metadata and version parity.
- Required presence of all 12 v51 systems.
- Behavioral tests for success, failure, stale evidence, missing approval, missing capability and unsupported outcome cases.
- Node 20 and Node 22 contract gates.
- Production typecheck, dependency audit and Next.js build.
- Commit-bound GitHub evidence artifact.
- Local MCP initialize and `tools/list` runtime checks.

No merge to `main` or manual Production promotion is part of this batch.
