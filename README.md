# KROM Forge v28 — Coding & Patch Engine

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
