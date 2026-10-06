# KROM Forge v80 — Adaptive Skill Intelligence & Continuous Engineering Assurance

## Scope

This feature branch adds a governed v80 control-plane layer on top of the existing KROM Forge v79 runtime.

It does **not** change:

- the compact 15-tool public MCP surface;
- the fixed 5,333 internal capability registry;
- host authorization rules;
- Production, Vercel, secrets, permissions, or deployment state;
- the skill catalog by itself.

The v80 capability is registered as a **control-plane capability** and is reachable through the existing governed search → describe → dispatch path.

## Engines

### 1. Skill Effectiveness Engine

Scores a skill from observed outcomes rather than name similarity alone.

Signals:

- selection count;
- success rate;
- validator pass rate;
- evidence completeness;
- handoff rate;
- regression rate;
- failure rate;
- latency against a declared budget.

Low sample counts reduce confidence. The score is advisory and never rewrites the skill automatically.

### 2. Adaptive Skill Router

Ranks candidate skills using:

- semantic fit;
- evidence fit;
- historical quality;
- agent fit;
- lifecycle maturity;
- risk penalty.

A close top-two score or a score below the acceptance floor escalates to the orchestrator instead of forcing a selection.

### 3. Governed Skill Lifecycle

Supported states:

DRAFT → SHADOW → CANARY → STABLE → DEPRECATED → RETIRED

Promotions and downgrades are recommendations only. Contract/schema/security failures or critical failures prevent normal promotion. Stable skills can be downgraded to CANARY when measured quality degrades.

### 4. Agent Performance Matrix

Aggregates observed quality by:

agent × domain × role

Roles are primary and validator.

The output can recommend a primary/validator pairing only when enough observations exist. Recommendations never change permissions or agent routing policy automatically.

### 5. Evidence Dependency Graph

Represents evidence as dependency edges across:

- claims;
- evidence;
- tests;
- skills;
- agents;
- capabilities;
- commits;
- artifacts.

Edges are interpreted as dependency → dependent. When a commit/evidence/test node changes, invalidation propagates to dependent claims and marks them for reverification.

## Additional Controls

### High-risk multi-agent review

High-risk decisions require:

Primary → Independent Validator → Judge

A missing judge blocks a high-risk decision. Reviewer disagreement produces CONFLICT and requires contradiction resolution.

### Benchmark suite

The benchmark evaluator reports:

- top-1 routing accuracy;
- top-3 routing recall;
- evidence completeness;
- unsupported-claim rate;
- safe-block accuracy;
- latency-budget pass rate.

This creates a measurable basis for comparing future routing versions.

## MCP Surface

One new control-plane gateway is registered:

krom_v80_adaptive_skill_intelligence

Operations:

- SCORE_SKILL_EFFECTIVENESS
- RANK_ADAPTIVE_SKILLS
- EVALUATE_SKILL_LIFECYCLE
- BUILD_AGENT_PERFORMANCE_MATRIX
- BUILD_EVIDENCE_GRAPH
- INVALIDATE_EVIDENCE_GRAPH
- EVALUATE_MULTI_AGENT_REVIEW
- EVALUATE_BENCHMARK
- AUDIT

The gateway is intentionally absent from KROM_CORE_PUBLIC_TOOL_NAMES, preserving the 15-tool compact public surface.

## Governance Boundary

v80 is deterministic and evidence-bound.

It must not:

- edit or retire a skill autonomously;
- change agent permissions;
- push, merge, deploy, or alter repositories;
- promote a lifecycle state without a host-authorized change;
- treat historical performance as proof that a current claim is true;
- fabricate execution, tests, CI, deployment, or evidence.

## Verification

The feature adds:

npm run verify:v80

The gate verifies:

- effectiveness scoring orders strong evidence above weak evidence;
- adaptive routing can prefer a proven skill over a semantically closer but weak candidate;
- route ambiguity escalates to orchestrator;
- qualified CANARY can be recommended for STABLE;
- agent matrix can learn domain-specific validator fit;
- evidence invalidation propagates from changed source nodes to claims;
- high-risk review requires an independent judge;
- benchmark metrics are deterministic;
- 15 compact public tools remain unchanged;
- the 5,333 internal capability registry is not inflated;
- exactly one v80 control-plane gateway is added.

## Release posture

This branch is an implementation candidate for v80. It is not a Production release and does not claim deployment.
