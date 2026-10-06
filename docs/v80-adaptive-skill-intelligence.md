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

## Phase 2 — Operational Learning Loop

v80 now includes a portable observation ledger so routing quality can improve from verified mission outcomes instead of remaining a static scoring model.

### Host-carried observation ledger

The ledger records:

- skill identity;
- mission digest when available;
- domain;
- primary and validator agents;
- PASS / FAIL / BLOCKED / UNVERIFIED outcome;
- evidence completeness;
- post-execution verification;
- regression signal;
- handoff count;
- latency.

Unknown skill names are rejected. Duplicate observation IDs are not re-recorded.

The ledger is deliberately **PORTABLE_HOST_CARRIED**. KROM returns updated state to the host and does not silently persist it server-side. Durable persistence requires a separately authorized adapter.

### Mission outcome normalization

A verified mission result can be converted into one observation per selected skill.

A SUCCEEDED outcome becomes PASS only when:

- execution was authorized;
- verification passed;
- at least one evidence reference exists.

Otherwise the result remains UNVERIFIED. FAILED maps to FAIL and PARTIAL maps to BLOCKED.

### Operational skill health

The health snapshot aggregates real observations into the existing effectiveness score and reports:

- observed skill count;
- catalog coverage;
- per-skill sample confidence;
- success / validator / evidence / regression / failure / latency signals;
- unobserved skill count.

### Routing with operational history

The adaptive route can now start from the existing v76 semantic candidates and re-rank them using:

semantic fit + evidence fit + measured historical quality + agent fit + lifecycle maturity - risk penalty

Unobserved skills receive a neutral historical prior rather than being treated as proven or bad.

### Governed lifecycle proposals

The operational loop can recommend lifecycle changes using measured outcomes and quality gates.

Recommendations never mutate the catalog automatically. Any promotion, downgrade, deprecation or retirement remains a host-authorized change.

### Skill Control Center snapshot

The control-center snapshot exposes:

- total and observed skills;
- observation coverage;
- lifecycle distribution;
- top and bottom measured skills;
- lifecycle change proposals;
- domain/role agent performance recommendations;
- persistence status.

This is backend state suitable for a future UI, not a claim that a visual dashboard has been deployed.

### New operations

The existing `krom_v80_adaptive_skill_intelligence` gateway now also supports:

- CREATE_OBSERVATION_LEDGER
- RECORD_SKILL_OBSERVATION
- RECORD_MISSION_OUTCOME
- BUILD_SKILL_HEALTH_SNAPSHOT
- ROUTE_WITH_OPERATIONAL_HISTORY
- PROPOSE_LIFECYCLE_ACTIONS
- BUILD_CONTROL_CENTER_SNAPSHOT
- AUDIT_OPERATIONAL_LEARNING

No additional public or control-plane gateway is created.

## Phase 3 — Shadow/Canary Onboarding + Duplicate/Retirement Intelligence

Phase 3 adds governed skill admission and lifecycle reduction intelligence. It is designed for large incoming packs such as a future 500-skill expansion, while keeping the live catalog immutable until a host-authorized integration occurs.

### Shadow/Canary onboarding gate

Every candidate skill is evaluated for:

- exact-name collision against the current catalog;
- normalized-name collision;
- semantic maximum similarity;
- procedural maximum similarity;
- explicit semantic-duplicate evidence;
- purpose-overlap risk;
- contract validity;
- JSON schema validity;
- security gate;
- provenance and checksums;
- agent mapping;
- capability mapping;
- evidence contract;
- behavioral-test coverage;
- benchmark quality and sample count.

Possible recommendations:

- BLOCKED
- REVIEW_REQUIRED
- SHADOW
- CANARY

Exact/normalized collisions and high-confidence duplicates block onboarding. High similarity without enough evidence requires review. A clean candidate without enough operational benchmark evidence enters SHADOW. A clean, well-benchmarked candidate may be recommended for a governed CANARY.

### Pack onboarding gate

A batch pack can be evaluated without mutating the catalog.

The gate verifies:

- internal exact duplicate names;
- internal normalized-name collisions;
- baseline consistency;
- current skill count;
- 15-tool public surface;
- 5,333 internal capability target;
- 11-agent baseline;
- per-skill onboarding recommendations.

The result is one of:

- BLOCKED
- CONDITIONAL
- READY_FOR_GOVERNED_ONBOARDING

The target catalog count is reported as a projection only.

### Duplicate intelligence

Skill pairs are evaluated using:

- semantic similarity;
- procedural similarity;
- purpose similarity;
- outcome agreement;
- evidence overlap;
- co-selection rate;
- sample size;
- explicit specialization distinction.

Classifications:

- BLOCK_EXACT_DUPLICATE
- KEEP_SPECIALIZED
- MERGE_CANDIDATE
- REVIEW
- DISTINCT

A high topical similarity does not force a merge when the two skills have legitimate specialized behavior.

### Retirement intelligence

Retirement is deliberately stricter than duplicate detection.

A RETIRE recommendation requires:

- the skill is already DEPRECATED;
- sufficient operational samples;
- zero recent usage;
- no open incidents;
- no unresolved security blocker;
- no unique value remaining;
- a STABLE replacement;
- replacement quality at least as strong as the retiring skill;
- at least 95% coverage match;
- high duplicate/replacement confidence.

Other recommendations include:

- KEEP
- CANARY_DOWNGRADE
- DEPRECATE
- REVIEW
- RETIRE

Every recommendation that reduces lifecycle state requires host authorization. Phase 3 never mutates a skill, rewrites the catalog, merges skills, or deploys automatically.

### Phase 3 operations

The existing `krom_v80_adaptive_skill_intelligence` gateway now also supports:

- EVALUATE_SKILL_ONBOARDING
- EVALUATE_SKILL_PACK_ONBOARDING
- CLASSIFY_DUPLICATE_PAIR
- EVALUATE_SKILL_RETIREMENT
- BUILD_RETIREMENT_PORTFOLIO
- AUDIT_SKILL_ONBOARDING_GOVERNANCE

No additional public tool or v80 gateway is created.

## Phase 4 — v4.2 500-Skill Shadow Catalog

The reviewed v4.2 pack is now represented inside source control as a **non-active SHADOW candidate catalog**.

Source package:

- Pack: `KROM-Forge-v79-Native-Skills-Pack-v4.2-500-New`
- Version: `4.2.0`
- Archive SHA-256: `6dfa6f35e552712d6158c12917d0cf632f87707a607ed9a8657857eda1aa05a5`
- Candidate skills: **500**
- Active runtime skills: **1,465**
- Projected catalog only if every candidate is eventually promoted: **1,965**

Source quality evidence carried into the shadow registry:

- 500/500 unique procedural bodies;
- 0 exact normalized clusters;
- 0 similarity pairs at or above 0.90;
- highest reported combined similarity: 0.8961;
- 4,000 declared behavioral tests;
- source security gate PASS;
- 0 secret-pattern hits;
- 0 unsafe mutation payload hits.

### Non-active boundary

The 500 records are not appended to the v75/v76/v77 active runtime indexes.

They do not:

- increase the active 1,465-skill catalog;
- change the 15-tool compact public MCP surface;
- change the fixed 5,333 internal capabilities;
- change agent permissions;
- create executable capabilities;
- create a second v80 gateway.

Every candidate is marked:

- lifecycle: SHADOW
- runtimeActivated: false

### Collision gate

Phase 4 audits every candidate against the live active catalog using both:

- exact skill name;
- normalized skill identity.

Any collision fails the shadow-catalog audit and blocks later promotion.

### Governed onboarding posture

The source pack has strong structural/originality evidence but no real KROM operational benchmark history yet.

Therefore Phase 4 intentionally supplies:

- benchmarkScore: 0
- benchmarkCases: 0

to the onboarding engine.

The expected result is:

- SHADOW: 500
- CANARY: 0
- REVIEW_REQUIRED: 0
- BLOCKED: 0

This does not mean the skills are weak. It means structural package quality and real runtime effectiveness are treated as separate evidence classes.

Promotion to CANARY must occur per skill after evidence-bound SHADOW observations exist. STABLE promotion remains subject to later lifecycle gates.

### Phase 4 operations

The existing `krom_v80_adaptive_skill_intelligence` gateway also supports:

- AUDIT_V42_SHADOW_CATALOG
- GET_V42_SHADOW_CATALOG
- EVALUATE_V42_SHADOW_PACK

The paged catalog API exposes candidate metadata without activating the candidate.

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
