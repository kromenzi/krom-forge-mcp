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

## Phase 4 — v4.2 Shadow Candidate Registry

The reviewed `KROM-Forge-v79-Native-Skills-Pack-v4.2-500-New` is registered as a **metadata-only SHADOW candidate registry**.

Important boundary:

- stable KROM skill catalog remains **1,465**;
- shadow candidate count is **500**;
- target catalog remains **1,965 only if future promotions are explicitly approved**;
- shadow candidates are **non-executable by default**;
- no v75/v76/v77 stable skill index is mutated;
- no public tool or internal capability is added;
- the existing single v80 control-plane gateway is reused.

### Registry evidence

The registry binds to archive SHA-256:

`6dfa6f35e552712d6158c12917d0cf632f87707a607ed9a8657857eda1aa05a5`

Reviewed package facts carried into the registry:

- 500 candidates;
- 4,000 declared behavioral tests;
- 500 input schemas;
- 500 output schemas;
- 500 normalized procedural bodies;
- 0 procedural pairs >= 0.90;
- highest reviewed procedural similarity 0.8961;
- 0 high-confidence semantic duplicates;
- package validation PASS;
- 0 blocking capability gaps.

### Shadow registry audit

The registry independently checks:

- exact-name collisions against the stable catalog;
- normalized-name collisions against the stable catalog;
- duplicate candidate names;
- duplicate instruction hashes;
- stable 1,465-skill baseline;
- 11-agent baseline;
- non-executable SHADOW default.

A failed collision or baseline check blocks registry readiness.

### Canary cohort selection

Candidates remain SHADOW until evidence is supplied.

CANARY recommendation requires, by default:

- benchmark score >= 0.90;
- at least 20 benchmark cases;
- evidence completeness;
- validator PASS;
- security PASS;
- regression rate <= 0.05;
- no unresolved high-similarity concern unless the specialization is explicitly distinct.

The selector is deterministic and can cap both:

- total CANARY recommendations;
- candidates per domain/area.

A CANARY result is **recommendation only**:

- no candidate is promoted automatically;
- no candidate becomes executable automatically;
- host authorization is required before any stable-runtime change.

### Phase 4 operations

The existing `krom_v80_adaptive_skill_intelligence` gateway now also supports:

- GET_V42_SHADOW_REGISTRY_SUMMARY
- GET_V42_SHADOW_CANDIDATE
- SELECT_V42_CANARY_COHORT
- AUDIT_V42_SHADOW_REGISTRY

## Phase 5 — Shadow Benchmark Runner

The v80 Shadow Benchmark Runner evaluates **supplied benchmark results** for the 500 v4.2 SHADOW candidates.

It does not execute external tests by itself and does not claim that a benchmark ran unless result records are supplied by the host.

### Case contract

Each supplied benchmark case can carry:

- case ID;
- candidate skill name;
- PASS / FAIL / BLOCKED outcome;
- evidence references;
- validator result;
- security result;
- unsupported-claim signal;
- regression signal;
- latency and latency budget;
- semantic/procedural similarity context;
- source reference.

Unknown candidate names are reported instead of being accepted as valid shadow skills.

### Per-skill benchmark score

The runner aggregates:

- pass rate;
- validator pass rate;
- evidence completeness;
- security pass rate;
- supported-claim rate;
- latency-budget pass rate;
- source binding;
- regression penalty.

The score is deterministic and evidence-bound. It is used only as input to the existing governed CANARY selector.

### CANARY recommendation

A benchmark result can recommend a candidate for CANARY only when the existing Phase 4 gates are satisfied, including:

- minimum sample count;
- benchmark threshold;
- evidence completeness;
- validator pass;
- security pass;
- regression threshold;
- similarity/specialization review.

The output remains:

- recommendation only;
- non-executable;
- no automatic promotion;
- host authorization required before any runtime/catalog mutation.

### Failure taxonomy

The batch report includes counts for:

- failed benchmark cases;
- blocked cases;
- missing evidence;
- validator failures;
- security failures;
- unsupported claims;
- regressions;
- latency-budget misses;
- missing source references.

### Phase 5 operations

The existing `krom_v80_adaptive_skill_intelligence` gateway now also supports:

- EVALUATE_V42_SHADOW_BENCHMARK
- GET_V42_SHADOW_BENCHMARK_REPORT
- AUDIT_V42_SHADOW_BENCHMARK_RUNNER

## Phase 6 — CANARY Promotion Controller

Phase 6 adds a deterministic governance layer between benchmark readiness and any future catalog/runtime promotion.

The controller does **not** apply promotions. It emits a recommendation and an authorization scope only.

### SHADOW → CANARY gates

A SHADOW candidate is eligible for a CANARY recommendation only when all applicable gates pass:

- benchmark cases >= 20;
- benchmark score >= 0.90;
- pass rate >= 0.90;
- validator pass rate >= 0.95;
- evidence completeness >= 0.95;
- security pass rate = 1.00;
- unsupported-claim rate <= 0.02;
- regression rate <= 0.05;
- latency-budget pass rate >= 0.90;
- evidence is within the configured freshness window;
- rollback contract is ready, tested and evidence-backed;
- no open critical incidents;
- primary and validator reviews are PASS.

High-risk promotion additionally requires an independent judge with PASS and distinct reviewer identities.

### CANARY → STABLE gates

STABLE recommendation is stricter:

- benchmark/canary cases >= 60;
- benchmark score >= 0.95;
- pass rate >= 0.95;
- validator pass rate >= 0.97;
- evidence completeness >= 0.98;
- security pass rate = 1.00;
- unsupported-claim rate <= 0.01;
- regression rate <= 0.03;
- latency-budget pass rate >= 0.95;
- CANARY exposure >= 5%;
- CANARY observation window >= 24 hours;
- fresh evidence;
- tested rollback contract;
- review approval.

### Evidence freshness

The controller is deterministic: the host supplies both:

- `evidenceGeneratedAtEpoch`;
- `nowEpoch`.

No server clock is used to fabricate freshness. Evidence outside the configured freshness window is blocked.

### Rollback contract

A promotion recommendation requires:

- rollback ready;
- rollback tested;
- rollback evidence references;
- a valid fallback lifecycle target.

This prevents promoting a candidate without a verified recovery path.

### Batch promotion plan

The promotion plan can evaluate up to 500 assessments and cap:

- total recommended promotions;
- promotions per area/domain.

Ready items are ordered deterministically by lifecycle priority, benchmark score, sample count and skill name.

Even when the plan selects candidates:

- `promotionApplied=false`;
- `deploymentApplied=false`;
- `executable=false`;
- `stableCatalogMutation=false`.

The stable runtime remains **1,465 skills** until a separate host-authorized catalog change is performed.

### Phase 6 operations

The existing `krom_v80_adaptive_skill_intelligence` gateway now also supports:

- EVALUATE_V42_PROMOTION_READINESS
- BUILD_V42_PROMOTION_PLAN
- AUDIT_V42_PROMOTION_CONTROLLER

## Phase 7 — Authorized Promotion Executor + Atomic Rollback

Phase 7 adds an execution boundary after the Phase 6 promotion recommendation.

The executor still does **not** mutate KROM's real stable catalog. It applies an authorized lifecycle transition only to a caller-supplied promotion-state snapshot and returns the resulting snapshot plus evidence.

### Transaction preconditions

A promotion transaction is prepared only when:

- the candidate exists in the v4.2 registry;
- the supplied state contains the candidate;
- the supplied state lifecycle matches the Phase 6 readiness lifecycle;
- Phase 6 readiness is `READY`;
- the supplied state contains no duplicate or unknown candidate records.

Preparation produces a deterministic transaction ID and expected state SHA-256 digest.

### Explicit host authorization

Execution requires:

- `hostAuthorization=true`;
- an authorization ID;
- approval evidence references;
- the exact `expectedStateDigest` from the before-state.

A digest mismatch blocks the transaction. This provides optimistic-concurrency protection against stale or changed supplied state.

### Atomic lifecycle transition

Supported transitions are governed by Phase 6 readiness:

- SHADOW → CANARY;
- CANARY → STABLE.

The executor first builds an attempted supplied-state snapshot, then evaluates caller-supplied post-apply verification evidence.

If post-apply verification does not PASS or the observed lifecycle does not equal the expected target, the operation returns:

- `status=ROLLED_BACK`;
- the exact original supplied state as `stateAfter`;
- `afterDigest=beforeDigest`;
- `atomicRollbackApplied=true`.

### Commit semantics

A successful transaction returns:

- `status=COMMITTED_TO_SUPPLIED_STATE`;
- incremented transition revision;
- transaction ID on the transitioned record;
- before, attempted and after digests;
- authorization and verification evidence record.

This is a real deterministic state transition on the value supplied to the operation, but it is **not** a repository, deployment, database, or live catalog mutation.

The following remain false:

- `repositoryMutation`;
- `runtimeCatalogMutation`;
- `deploymentMutation`.

The real KROM stable catalog therefore remains **1,465 skills**.

### Phase 7 operations

The existing `krom_v80_adaptive_skill_intelligence` gateway now also supports:

- PREPARE_V42_PROMOTION_TRANSACTION
- EXECUTE_V42_PROMOTION_TRANSACTION
- AUDIT_V42_AUTHORIZED_PROMOTION_EXECUTOR

A future phase may add an explicitly authorized repository/catalog mutation adapter. That adapter must remain separate from this supplied-state transaction engine and must retain rollback and evidence guarantees.

## Phase 8 — Real Catalog Promotion Adapter

Phase 8 establishes the repository-controlled bridge from the governed v4.2 lifecycle into KROM's real skill catalog.

No v4.2 skill is promoted in this phase. The promoted registry is intentionally empty, so the real stable catalog remains **1,465 skills**.

### Single promoted-skill registry

The file:

`src/v80-promoted-v42-skill-seeds.ts`

is the single source of truth for v4.2 candidates that have received an explicitly authorized real catalog promotion.

The v79 native catalog now includes the derived promoted seeds. Because V75, V76 and V77 already consume that catalog, future entries propagate automatically through:

- V79 native skill metadata;
- V75 agent skill access;
- V76 semantic skill index and routing;
- V77 native directive/runtime policy.

Verification counts are promotion-aware: the expected stable count is `1,465 + promoted-v4.2 count`.

### Promotion receipt requirement

The real catalog adapter accepts only Phase 7 receipts representing:

- `status=COMMITTED_TO_SUPPLIED_STATE`;
- `targetLifecycle=STABLE`;
- a valid transaction ID;
- distinct before/after state digests;
- authorization evidence;
- post-apply verification evidence.

Unknown, duplicate or already-promoted candidates are blocked.

### Catalog authorization and concurrency

Preparing a real catalog patch requires:

- `catalogAuthorization=true`;
- catalog authorization ID;
- catalog approval evidence;
- the exact current catalog SHA-256 digest.

A stale or mismatched catalog digest blocks patch preparation.

The maximum promotion batch is 25 skills.

### Exact patch + rollback source

A valid request returns:

- the target file path;
- complete replacement source for the promoted registry;
- complete rollback source for the prior promoted registry;
- current and projected stable catalog counts;
- current and projected catalog digests;
- receipt evidence binding.

Phase 8 does **not** write the repository itself:

- `repositoryMutationApplied=false`;
- `runtimeCatalogMutationApplied=false`;
- `deploymentMutationApplied=false`.

This keeps repository mutation as an explicit host action after review.

### Promotion-aware lifecycle

Once a future authorized promotion is actually committed to the repository:

- promoted candidates stop participating in SHADOW benchmark selection;
- lookup reports them as STABLE;
- promotion controllers reject them as already stable;
- V75/V76/V77 count expectations expand automatically;
- remaining SHADOW count becomes `500 - promoted count`.

### Phase 8 operations

The existing `krom_v80_adaptive_skill_intelligence` gateway now also supports:

- PREPARE_V42_REAL_CATALOG_PROMOTION
- VERIFY_V42_REAL_CATALOG_PATCH
- AUDIT_V42_REAL_CATALOG_PROMOTION_ADAPTER

## Phase 9 — Host-Verified Real Benchmark Evidence Pipeline

Phase 9 adds the evidence bridge between synthetic/verifier coverage and genuine host-observed benchmark execution.

It does **not** execute external workloads itself and it does **not** promote any skill. Its purpose is to prevent fixture, declared-only or self-asserted results from being treated as production-quality benchmark evidence.

### Deterministic benchmark manifest

A benchmark manifest binds every planned execution case to:

- benchmark ID and case ID;
- v4.2 SHADOW skill name;
- current skill instruction SHA-256;
- primary agent;
- validator agent;
- scenario ID and scenario source reference;
- expected evidence kinds;
- latency budget.

Each case receives a deterministic SHA-256 case digest, and the complete manifest receives a deterministic manifest digest.

Already-promoted candidates and unknown v4.2 names are rejected.

### Host execution receipt

A result counts as real benchmark evidence only when the supplied receipt includes:

- `executionPerformed=true`;
- `evidenceOrigin=HOST_EXECUTION`;
- matching benchmark, case, skill and manifest-case digest;
- non-empty host execution ID;
- source reference;
- evidence references;
- all evidence kinds required by the manifest;
- outcome;
- validator result;
- security result;
- latency result;
- semantic/procedural similarity observations;
- regression signal;
- host attestation.

The pipeline rejects:

- fixture evidence;
- self-asserted evidence;
- declared-only evidence;
- missing execution evidence;
- stale or tampered case digests;
- missing expected evidence kinds;
- duplicate receipt case IDs.

### Existing Phase 5 integration

Only verified host receipts are converted to the existing `V80ShadowBenchmarkCase` format.

This means the existing benchmark scoring, regression analysis, similarity checks and CANARY recommendation logic remain authoritative while Phase 9 strengthens the provenance of their inputs.

Receipt digests and host execution IDs are appended to the evidence references passed downstream.

### Anti-fabrication boundary

Phase 9 explicitly reports:

- `externalExecutionPerformedByPipeline=false`;
- `repositoryMutationApplied=false`;
- `runtimeCatalogMutationApplied=false`;
- `deploymentMutationApplied=false`;
- `promotionApplied=false`.

A generated manifest is a plan, not execution evidence. A verifier fixture is test evidence for the pipeline itself, not evidence that a candidate skill ran successfully on a real host.

### Phase 9 operations

The existing `krom_v80_adaptive_skill_intelligence` gateway now also supports:

- BUILD_V42_REAL_BENCHMARK_MANIFEST
- VERIFY_V42_REAL_BENCHMARK_RECEIPTS
- BUILD_V42_REAL_BENCHMARK_EVIDENCE
- AUDIT_V42_REAL_BENCHMARK_EVIDENCE_PIPELINE

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
