# KROM Forge v28 — Coding & Patch Engine

## v51 Frontier Operations

KROM Forge v51 adds 72 integrated MCP tools across mission runtime and checkpointing, causal decision intelligence, counterfactual delivery simulation, risk-capital allocation, capability markets and delegation contracts, knowledge freshness and consolidation, engineering safety cases, release digital twins, tool-ecosystem composition, drift forecasting, human oversight, and outcome learning.

The v51 systems share one evidence discipline: unsupported facts, approvals, outcomes, forecasts and pass claims are discounted or blocked. Static AST verification now requires all 12 v51 control layers and keeps registration, metadata, capabilities and version surfaces aligned. See `BATCH-v51.md` for the architecture and boundaries.

## v50 Engineering Operating System

KROM Forge v50 adds policy-as-code, evidence lineage, verification portfolio optimization, release-confidence calibration, incident command, compatibility lifecycle management, agent reliability and continuous improvement. These systems turn the existing control planes into a connected operating model from policy and evidence through release, incident response and learning.

The MCP registry is now inspected through the TypeScript AST. CI generates a deterministic manifest for every tool and verifies registration, metadata, capability parity and version integrity on Node 20 and Node 22 before the production build. See `BATCH-v50.md` for the architecture and evidence boundaries.

## v49 Release Integrity Mesh

KROM Forge v49 adds commit-bound release provenance, risk-adaptive verification, MCP tool-contract assurance, CI run evidence validation, recovery rehearsal and merge-policy enforcement. These layers connect source identity to verified checks and approvals; a successful label without matching evidence cannot authorize release or merge.

The repository now includes deterministic unit tests and GitHub Actions evidence artifacts in addition to static registration, capability parity, version consistency, type checking, dependency audit and production build gates. See `BATCH-v49.md` for the full architecture and evidence boundary.

KROM Forge v28 extends v27 Research Engine with evidence-driven code-change planning and patch review.

## New v28 tools

- `krom_plan_code_change`
- `krom_prepare_patch`
- `krom_validate_change_scope`
- `krom_assess_patch_risk`
- `krom_generate_migration_plan`
- `krom_generate_test_plan`
- `krom_review_diff`
- `krom_verify_patch_evidence`

## Workflow

```text
INSPECT
  ↓
RESEARCH
  ↓
PLAN
  ↓
PATCH CONTRACT
  ↓
AUTHORIZED HOST APPLIES FILE CHANGES
  ↓
DIFF REVIEW
  ↓
BUILD / TEST / BROWSER / DB EVIDENCE
  ↓
PATCH EVIDENCE VERIFICATION
  ↓
RELEASE GATE
```

## Critical boundary

KROM Forge does not silently mutate files or claim a patch was applied. ChatGPT, Codex, or another authorized host performs actual file operations and commands. KROM Forge creates the change contract, detects scope creep, evaluates risk, plans migrations/tests, and reviews supplied evidence.

## v25-v27 retained

Engineering orchestration, portable run state, real-project snapshot inspection, architecture/dependency/risk analysis, evidence-driven research classification and domain synthesis remain available.

## Deploy

```powershell
npm install
npm run build
vercel link --yes --project krom-forge-mcp --scope kromenzis-projects
vercel --prod --yes --scope kromenzis-projects
```

Endpoint: `/mcp`
Health: `/health`

## v30 — Multi-Agent KROM

v30 adds explicit specialist-agent orchestration with evidence-bearing handoffs. Use `krom_list_agents` to inspect contracts, `krom_route_agent` to choose specialists, `krom_create_agent_run` to create a portable coordination state, and `krom_agent_handoff` / `krom_coordinate_agents` / `krom_evaluate_agent_run` to enforce evidence and release integrity.


## v30 — Project Intelligence Store

KROM Forge v30 adds project-scoped intelligence memory with explicit isolation through `projectId` + `scopeKey`. It records decisions, failures, evidence, tests, deployments, tasks, risks and snapshots.

`PORTABLE` mode is honest host-carried state and is not durable server-side persistence. `EXTERNAL_PERSISTENCE` is adapter-ready and must only be treated as durable after an authorized external store is actually connected and evidenced.

See `CHANGELOG-v30.md` and `docs/PROJECT-MEMORY-EXAMPLE.json`.

## v31 — UI/UX Intelligence Engine
KROM Forge can now consume host-supplied browser, screenshot, DOM, accessibility-tree and console observations to audit UI quality, responsive behavior, RTL/LTR, accessibility, design-system consistency and before/after regressions. These tools are evidence analyzers: they do not claim KROM Forge opened a browser or modified UI code unless the host actually supplied those capabilities and evidence.

## v32 — Debugging Intelligence Engine

KROM Forge v32 adds structured evidence-driven debugging:

`SYMPTOM → REPRODUCE → EVIDENCE → HYPOTHESIS → DIAGNOSTIC → ROOT CAUSE → SMALLEST FIX → FOCUSED CHECK → REGRESSION → CLOSURE`

It does not execute host diagnostics by itself. ChatGPT, Codex, or another authorized MCP host supplies logs, stacks, build/test/runtime/browser/database evidence and performs file/tool actions. KROM structures, challenges, and verifies the debugging process.

## v33 Evidence Engine
KROM Forge v33 introduces a project-scoped Claim–Evidence Graph. Host-observed build, test, diff, runtime, deployment, security, database, browser and other artifacts can be recorded and explicitly linked to claims. Claims are evaluated as SUPPORTED, PARTIAL, UNSUPPORTED or CONTRADICTED; missing or unverified evidence never becomes a pass.

## v34 — Autonomous Engineering Loop

v34 unifies the previous project inspection, research, patching, multi-agent, project-memory, UI/UX, debugging and evidence layers into one resumable engineering state machine.

Typical flow:

```text
INTAKE → INSPECT → RESEARCH → PLAN → AGENTS → PATCH → DEBUG → UIUX → VERIFY → EVIDENCE → RELEASE
```

The loop does not execute unavailable external actions itself. Instead it declares required host tools and evidence, records host results, enforces retry budgets, and blocks release when consequential claims lack verified evidence.

## v35 — Host Capability Bridge

KROM Forge no longer assumes that every host exposes the same tools. The host supplies a capability snapshot describing connected/authenticated tools, supported operations, evidence kinds and limitations. KROM maps the autonomous loop to that snapshot and marks each stage as executable or blocked. Missing capabilities remain explicit gaps; KROM never simulates unavailable web, file-write, execution, browser, GitHub, Supabase or Vercel actions.


## v36 — Execution Policy & Approval Engine
KROM Forge now separates harmless inspection from consequential execution. Every proposed action can be classified as `AUTO_EXECUTE`, `REQUIRE_APPROVAL`, or `BLOCKED`. Approval is scoped to one action and does not replace host authorization/capability.

New tools: `krom_get_execution_policy`, `krom_classify_execution_action`, `krom_create_approval_request`, `krom_evaluate_approval`, `krom_enforce_execution_policy`, `krom_audit_execution_policy`, `krom_compare_execution_policies`.

## v37 — Self-Evaluation & Quality Gate Engine

v37 adds an explicit quality gate before KROM can treat a run as complete or release-ready. It evaluates plan quality, implementation/build/test/security/UI/evidence dimensions, residual risks, blockers, unsupported claims, and final-delivery quality.

The gate is deliberately conservative: self-evaluation cannot manufacture evidence or override failed/blocked host evidence.

## v38 — Recovery & Rollback Intelligence

v38 adds restore-point normalization, blast-radius analysis, recovery-plan validation, approval-aware execution tracking and post-recovery verification. Recovery remains host-executed; KROM Forge plans and verifies from supplied evidence and never fabricates rollback or restore success.


## v39 — Observability & Runtime Intelligence

Adds verified runtime-signal normalization, service-health evaluation, anomaly detection, SLO checks, incident correlation, runtime evidence generation, response recommendations, and before/after runtime comparison. Runtime conclusions remain bounded by host-supplied evidence.


## v40 — Production Readiness & Release Control
KROM Forge now provides one release control plane across build, test, security, evidence, runtime, recovery, quality, approval, deployment and data gates. It returns READY / CONDITIONAL / BLOCKED, validates explicit exception records, and requires post-release runtime/regression evidence before a release is considered verified.

## v41 Security & Policy Intelligence
v41 adds evidence-backed security assessment, RLS/authz negative-test auditing, secret-exposure review, dependency security evidence, security control coverage, remediation ordering and before/after security comparison. Missing security evidence never becomes PASS.


## v42 — Compliance & Governance Intelligence
Adds requirement authority classification, evidence mapping, control coverage, exception governance, remediation planning, and governance decisions. Mandatory obligations require authoritative traceability; missing evidence remains an explicit gap.

## v43 Enterprise Mega Pack
Adds database/data, performance/cost, software supply-chain, and change/release-train intelligence as evidence-driven MCP tools integrated with existing KROM Forge release, security, recovery and evidence controls.

## v44 — Intelligence Mega Pack
v44 adds planning intelligence, requirements traceability, architecture decision intelligence, test intelligence, API contract intelligence, and an engineering knowledge graph. The new layers connect intent -> architecture -> implementation -> tests -> evidence -> release without inventing proof for missing host evidence.


## v45 — Unified Engineering Control Plane

KROM Forge v45 introduces a mission-level orchestration surface above the existing intelligence engines. It can create resumable engineering missions, compile dependency-aware execution manifests, record host-authorized results, arbitrate blockers, aggregate cross-engine gates, verify delivery closure, and define post-deploy observation requirements.

A mission is not complete because code was generated. Closure requires evidence proportional to the requested scope and deployment/runtime evidence when release is part of the mission.


## v46 — Enterprise Command Intelligence

KROM Forge v46 adds portfolio/program intelligence, CI/CD pipeline gates, engineering pre-mortem and failure prevention, engineering decision/risk command intelligence, and an Enterprise Command Gate above the v45 mission control plane. All consequential claims remain evidence-backed and all external mutation still requires host-authorized tools.


## v47 — Mega Control Plane

KROM Forge v47 adds 48 integrated MCP capabilities across semantic intent routing, evidence freshness and invalidation, unified change-impact reverification, reusable workflow templates, enterprise audit packaging, release-train orchestration, project-health control, and an authorized autonomy layer.

The v47 control philosophy is: intent -> route -> evidence contract -> impact graph -> reverification -> workflow gates -> release train -> audit package -> authorized next action. No external action is claimed executed without host evidence, and critical actions remain approval/evidence bounded.

## v48 — Assurance Control Plane

KROM Forge v48 adds an assurance layer above v47: release verification contracts, MCP registry/capabilities/version integrity checks, GitHub CI independence from Vercel preview capacity, and delivery handoff/no-merge guards.

The v48 control philosophy is: control-plane decision -> required gates -> verified evidence -> registry/version parity -> GitHub CI quality gate -> explicit handoff. Build, CI, deployment, PR and merge success remain evidence-backed claims only.


## v52 — Strategic Engineering Intelligence

KROM Forge v52 adds eight strategic control systems: Engineering Constitution, Constraint Solver, Trust Graph, Change Simulation, Recovery Strategy Intelligence, Verification Economics, Multi-Project Coordination, and Operator Decision Cockpit.

These systems convert policies, dependencies, risk, evidence, recovery choices, verification budgets and program capacity into explicit decision support while preserving KROM Forge's evidence boundary: advisory decisions do not imply host execution.


## v53 — 2000 Tool Strategic Expansion

KROM Forge v53 adds exactly 2,000 domain-specialized MCP tools generated from a deterministic 40-domain × 50-operation registry. The expansion covers architecture, requirements, APIs, databases, data quality, security, identity/access, privacy, compliance, software supply chain, dependencies, code quality, refactoring, testing, QA, debugging, observability, SRE, incident response, recovery, performance, FinOps, CI/CD, DevOps, release, cloud, Kubernetes, containers, serverless, frontend, UI/UX, accessibility, mobile, analytics, MLOps, AI agents, LLM engineering, prompt engineering, documentation and engineering program management.

The registry uses one hardened evidence-bound execution kernel. Every tool has a unique MCP name, domain focus, operation intent, evidence expectations and output behavior. Evaluation/control operations refuse unsupported conclusions; model/simulation tools mark outputs as hypotheses; planning tools never claim host mutation.

The v53 CI contract requires exactly 2,000 generated v53 tools, unique names, capability parity, version consistency, unit tests, TypeScript, production dependency audit and Next.js build.


## v54 — 5000 Tool Enterprise Automation Fabric

KROM Forge v54 adds exactly 2,485 new MCP tools to the verified 2,515-tool v53 baseline, producing exactly **5,000 runtime MCP tools and 5,000 capability entries**.

The v54 layer uses a deterministic 35-domain × 71-operation registry focused on advanced distributed systems and automation: event-driven systems, messaging, caching, search, storage, networking, edge, platform engineering, developer experience, monorepos, build systems, configuration, secrets, feature flags, resilience, chaos engineering, capacity, concurrency, transactions, consistency, schema evolution, data pipelines, streaming data, advanced observability, telemetry quality, threat detection, vulnerability management, secure coding, policy-as-code, governance automation, release automation, test automation, autonomous agents and knowledge engineering.

### Automation integrity
CI independently validates registry/capability parity, exact 5,000 total count, global name uniqueness, metadata completeness, deterministic manifest fingerprint, Node 20/22 contract gates, unit tests, TypeScript, production dependency audit, Next.js build, concurrency cancellation and evidence artifact retention.


## v55 — Adaptive Autonomous Engineering Runtime

v55 changes the optimization target from tool-count growth to intelligent use of the existing tool estate. It adds 28 control-runtime tools for semantic routing, domain skill-pack loading, tool-quality ranking, capability compression, dynamic task graphs, parallel execution waves, multi-agent command, evidence trust, automatic reverification, execution dry-runs, mutation-risk gates, resumable checkpoints, change-impact v2, release digital twins, incident command, execution-cost governance, adaptive analysis depth, contradiction reconciliation, provider/plugin abstraction, realtime mission-console state, outcome learning and on-demand tool loading.

The total registry is 5,028 tools. CI now includes an independent v55 routing/runtime benchmark in addition to registry parity, duplicate checks, automation integrity, Node 20/22 tests, TypeScript, production dependency audit and Next.js build.


## v56 — Cognitive Self-Healing Runtime

v56 adds 24 control-runtime tools above v55. The new layer provides bounded semantic mission memory, deterministic mission replay, failure-aware replanning, retry-budget and loop protection, provider circuit breakers and failover, shadow/canary tool evaluation, semantic overlap detection, advisory deprecation recommendations, evidence-weighted agent quorum, deterministic runtime policy compilation/diff, evidence invalidation propagation, causal execution traces, evidence-only recovery confidence, runtime observability and a consolidated self-healing command snapshot.

The registry now contains 5,052 tools/capabilities. CI adds an independent v56 benchmark covering replay determinism, retry-loop protection, provider failover, semantic-overlap detection, agent quorum, transitive evidence invalidation and evidence-backed recovery.


## v57 — Autonomous Engineering Brain

v57 adds 20 control-brain MCP tools for long-horizon project memory indexing/retrieval/compaction, knowledge freshness, cross-project dependency reasoning, mission scheduling and continuation, eval-driven tool learning, adaptive tool portfolios, guarded skill synthesis, policy-aware orchestration, bounded project context packs, knowledge refresh planning, control-center state and autonomous-brain consistency checks.

The registry now contains 5,072 tools/capabilities. v57 explicitly keeps synthesized skills advisory until human review and evaluation, keeps memory portable unless an authorized persistence layer exists, and never treats learned weights or mission schedules as evidence of execution.


## v58 — Autonomous Engineering Operating System

v58 adds 21 OS-level MCP tools for mission leasing and idempotent scheduling, unified knowledge graphs, contradiction detection, dynamic agent-team formation, internal tool marketplace matching, pre-mortem failure prevention, execution economy, portfolio budgeting/scheduling, deadlock detection, lease renewal planning, mission continuation validation and a consolidated control-center backend snapshot.

The registry now contains 5,093 tools/capabilities. v58 explicitly separates portable OS state from durable persistence, treats pre-mortem outputs as scenarios rather than predictions, and never claims a mission lease, schedule, agent assignment or marketplace match was externally executed.


## v59 — Autonomous Engineering Control Fabric

v59 adds 23 control-fabric MCP tools for runtime event buses, idempotent event processing, durable-state adapter contracts, distributed mission coordination, mission ownership handoffs, agent handoff protocols, tool health/reputation, semantic cache planning, workflow compilation, saga compensation, rollback orchestration, backpressure governance, checkpoint journals, provider resilience/failover, control-center command/event contracts, runtime SLO evaluation and consolidated fabric consistency.

The registry now contains 5,116 tools/capabilities. v59 keeps event delivery, persistence, mission mutation and rollback execution behind host-authorized adapters and never reports them as completed from planning state alone.
