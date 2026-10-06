import { z } from 'zod';
import { V75_AGENT_IDS, V75_SKILL_NAMES } from './v75-agent-capability-fabric';

export const V80_RELEASE = 'v80' as const;
export const V80_SKILL_LIFECYCLE = ['DRAFT','SHADOW','CANARY','STABLE','DEPRECATED','RETIRED'] as const;
export const V80_REVIEW_STATUS = ['PASS','FAIL','BLOCKED','UNVERIFIED'] as const;

const lifecycleSchema = z.enum(V80_SKILL_LIFECYCLE);
const reviewStatusSchema = z.enum(V80_REVIEW_STATUS);
const agentSchema = z.enum(V75_AGENT_IDS);

const clamp01 = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
const round = (value: number, digits = 4) => Number(value.toFixed(digits));
const safeRate = (part: number, total: number) => total > 0 ? clamp01(part / total) : 0;

export const v80SkillMetricSchema = z.object({
  skillName: z.string().min(1),
  domain: z.string().min(1).default('general'),
  selectionCount: z.number().int().min(0).default(0),
  successCount: z.number().int().min(0).default(0),
  validatorPassCount: z.number().int().min(0).default(0),
  evidenceCompleteCount: z.number().int().min(0).default(0),
  handoffCount: z.number().int().min(0).default(0),
  regressionCount: z.number().int().min(0).default(0),
  failureCount: z.number().int().min(0).default(0),
  avgLatencyMs: z.number().min(0).default(0),
  avgCostUnits: z.number().min(0).default(0)
});

export const v80EffectivenessSchema = z.object({
  metrics: v80SkillMetricSchema,
  latencyBudgetMs: z.number().positive().default(10000),
  minConfidenceSamples: z.number().int().positive().default(20)
});

export function scoreSkillEffectivenessV80(input: z.infer<typeof v80EffectivenessSchema>) {
  const m = input.metrics;
  const n = Math.max(0, m.selectionCount);
  const successRate = safeRate(m.successCount, n);
  const validatorPassRate = safeRate(m.validatorPassCount, n);
  const evidenceCompleteness = safeRate(m.evidenceCompleteCount, n);
  const handoffRate = safeRate(m.handoffCount, n);
  const regressionRate = safeRate(m.regressionCount, n);
  const failureRate = safeRate(m.failureCount, n);
  const latencyScore = clamp01(1 - Math.max(0, m.avgLatencyMs - input.latencyBudgetMs) / input.latencyBudgetMs);
  const sampleConfidence = clamp01(n / input.minConfidenceSamples);

  const raw =
    (0.30 * successRate) +
    (0.20 * validatorPassRate) +
    (0.20 * evidenceCompleteness) +
    (0.10 * (1 - regressionRate)) +
    (0.08 * (1 - failureRate)) +
    (0.07 * (1 - handoffRate)) +
    (0.05 * latencyScore);

  const confidenceAdjusted = raw * (0.70 + 0.30 * sampleConfidence);
  const score = round(100 * clamp01(confidenceAdjusted), 2);

  return {
    release: V80_RELEASE,
    skillName: m.skillName,
    domain: m.domain,
    score,
    confidence: round(sampleConfidence),
    rates: {
      success: round(successRate),
      validatorPass: round(validatorPassRate),
      evidenceCompleteness: round(evidenceCompleteness),
      handoff: round(handoffRate),
      regression: round(regressionRate),
      failure: round(failureRate),
      latency: round(latencyScore)
    },
    sampleSize: n,
    status: n === 0 ? 'NO_DATA' : sampleConfidence < 0.5 ? 'LOW_CONFIDENCE' : 'MEASURED',
    executionClaim: false
  };
}

export const v80AdaptiveCandidateSchema = z.object({
  skillName: z.string().min(1),
  domain: z.string().min(1).default('general'),
  semanticScore: z.number().min(0).max(1),
  evidenceFit: z.number().min(0).max(1),
  historicalQuality: z.number().min(0).max(1),
  agentFit: z.number().min(0).max(1),
  lifecycle: lifecycleSchema.default('STABLE'),
  riskLevel: z.enum(['low','medium','high']).default('low')
});

export const v80AdaptiveRoutingSchema = z.object({
  query: z.string().min(1),
  candidates: z.array(v80AdaptiveCandidateSchema).min(1).max(100),
  ambiguityDelta: z.number().min(0).max(0.25).default(0.035),
  minimumAcceptableScore: z.number().min(0).max(1).default(0.45)
});

const lifecycleWeight: Record<(typeof V80_SKILL_LIFECYCLE)[number], number> = {
  DRAFT: 0.55,
  SHADOW: 0.72,
  CANARY: 0.90,
  STABLE: 1,
  DEPRECATED: 0.35,
  RETIRED: 0
};

const riskPenalty = { low: 0, medium: 0.05, high: 0.12 } as const;

export function rankAdaptiveSkillsV80(input: z.infer<typeof v80AdaptiveRoutingSchema>) {
  const ranked = input.candidates
    .map(candidate => {
      const base =
        (0.30 * candidate.semanticScore) +
        (0.25 * candidate.evidenceFit) +
        (0.25 * candidate.historicalQuality) +
        (0.15 * candidate.agentFit) +
        (0.05 * lifecycleWeight[candidate.lifecycle]);
      const score = clamp01(base - riskPenalty[candidate.riskLevel]);
      return {
        ...candidate,
        adaptiveScore: round(score),
        reasons: [
          `semantic=${round(candidate.semanticScore)}`,
          `evidence=${round(candidate.evidenceFit)}`,
          `history=${round(candidate.historicalQuality)}`,
          `agent=${round(candidate.agentFit)}`,
          `lifecycle=${candidate.lifecycle}`,
          `risk=${candidate.riskLevel}`
        ]
      };
    })
    .sort((a,b) => b.adaptiveScore - a.adaptiveScore || a.skillName.localeCompare(b.skillName));

  const top = ranked[0];
  const second = ranked[1];
  const delta = second ? top.adaptiveScore - second.adaptiveScore : 1;
  const belowFloor = top.adaptiveScore < input.minimumAcceptableScore;
  const ambiguous = Boolean(second) && delta <= input.ambiguityDelta;
  const needsOrchestrator = belowFloor || ambiguous;

  return {
    release: V80_RELEASE,
    query: input.query,
    selectedSkill: needsOrchestrator ? null : top.skillName,
    selectedScore: top.adaptiveScore,
    runnerUp: second?.skillName ?? null,
    scoreDelta: round(delta),
    needsOrchestrator,
    decision: belowFloor ? 'NO_ACCEPTABLE_SKILL' : ambiguous ? 'AMBIGUOUS' : 'ROUTED',
    candidates: ranked,
    routingPolicy: 'semantic + evidence fit + historical quality + agent fit + lifecycle - risk penalty',
    executionClaim: false
  };
}

export const v80LifecycleEvaluationSchema = z.object({
  skillName: z.string().min(1),
  currentState: lifecycleSchema,
  contractValid: z.boolean(),
  schemaValid: z.boolean(),
  securityPass: z.boolean(),
  sampleSize: z.number().int().min(0).default(0),
  successRate: z.number().min(0).max(1).default(0),
  validatorPassRate: z.number().min(0).max(1).default(0),
  evidenceCompletenessRate: z.number().min(0).max(1).default(0),
  regressionRate: z.number().min(0).max(1).default(0),
  criticalFailures: z.number().int().min(0).default(0),
  usageLast30d: z.number().int().min(0).default(0),
  replacementReady: z.boolean().default(false)
});

export function evaluateSkillLifecycleV80(input: z.infer<typeof v80LifecycleEvaluationSchema>) {
  const blockers: string[] = [];
  if (!input.contractValid) blockers.push('contract-invalid');
  if (!input.schemaValid) blockers.push('schema-invalid');
  if (!input.securityPass) blockers.push('security-failed');
  if (input.criticalFailures > 0) blockers.push('critical-failure');

  let recommendedState: (typeof V80_SKILL_LIFECYCLE)[number] = input.currentState;
  let rationale = 'retain-current-state';

  if (blockers.length) {
    recommendedState = input.currentState === 'RETIRED' ? 'RETIRED' : 'SHADOW';
    rationale = 'blocking-quality-or-security-condition';
  } else if (input.currentState === 'DRAFT') {
    recommendedState = 'SHADOW';
    rationale = 'contracts-valid-enter-shadow';
  } else if (input.currentState === 'SHADOW') {
    if (
      input.sampleSize >= 10 &&
      input.successRate >= 0.85 &&
      input.validatorPassRate >= 0.85 &&
      input.evidenceCompletenessRate >= 0.90 &&
      input.regressionRate <= 0.10
    ) {
      recommendedState = 'CANARY';
      rationale = 'shadow-evidence-sufficient';
    }
  } else if (input.currentState === 'CANARY') {
    if (
      input.sampleSize >= 30 &&
      input.successRate >= 0.90 &&
      input.validatorPassRate >= 0.90 &&
      input.evidenceCompletenessRate >= 0.95 &&
      input.regressionRate <= 0.05
    ) {
      recommendedState = 'STABLE';
      rationale = 'canary-quality-gates-passed';
    } else if (
      input.sampleSize >= 10 &&
      (input.successRate < 0.75 || input.validatorPassRate < 0.75 || input.regressionRate > 0.15)
    ) {
      recommendedState = 'SHADOW';
      rationale = 'canary-regression';
    }
  } else if (input.currentState === 'STABLE') {
    if (
      input.sampleSize >= 10 &&
      (input.successRate < 0.82 || input.validatorPassRate < 0.82 || input.evidenceCompletenessRate < 0.88 || input.regressionRate > 0.12)
    ) {
      recommendedState = 'CANARY';
      rationale = 'stable-quality-degraded';
    }
  } else if (input.currentState === 'DEPRECATED') {
    if (input.replacementReady && input.usageLast30d === 0) {
      recommendedState = 'RETIRED';
      rationale = 'replacement-ready-and-unused';
    }
  }

  return {
    release: V80_RELEASE,
    skillName: input.skillName,
    currentState: input.currentState,
    recommendedState,
    changed: recommendedState !== input.currentState,
    blockers,
    rationale,
    mutationAuthorized: false,
    policy: 'Lifecycle output is a governed recommendation only; promotion, deprecation, or retirement requires an authorized host change.',
    executionClaim: false
  };
}

export const v80AgentObservationSchema = z.object({
  domain: z.string().min(1),
  primaryAgent: agentSchema,
  validatorAgent: agentSchema,
  outcome: reviewStatusSchema,
  evidenceComplete: z.boolean(),
  latencyMs: z.number().min(0).default(0),
  decisionQuality: z.number().min(0).max(1).optional()
});

export const v80AgentMatrixSchema = z.object({
  observations: z.array(v80AgentObservationSchema).min(1).max(5000),
  latencyBudgetMs: z.number().positive().default(10000),
  minimumSamples: z.number().int().positive().default(3)
});

const outcomeScore = (outcome: z.infer<typeof reviewStatusSchema>) => {
  if (outcome === 'PASS') return 1;
  if (outcome === 'BLOCKED') return 0.75;
  if (outcome === 'UNVERIFIED') return 0.4;
  return 0;
};

export function buildAgentPerformanceMatrixV80(input: z.infer<typeof v80AgentMatrixSchema>) {
  type Cell = {
    agent: string;
    domain: string;
    role: 'primary'|'validator';
    samples: number;
    quality: number;
    evidence: number;
    latency: number;
  };

  const cells = new Map<string, Cell>();

  const add = (agent: string, domain: string, role: 'primary'|'validator', observation: z.infer<typeof v80AgentObservationSchema>) => {
    const key = `${agent}::${domain}::${role}`;
    const cell = cells.get(key) ?? { agent, domain, role, samples: 0, quality: 0, evidence: 0, latency: 0 };
    const quality = observation.decisionQuality ?? outcomeScore(observation.outcome);
    cell.samples += 1;
    cell.quality += quality;
    cell.evidence += observation.evidenceComplete ? 1 : 0;
    cell.latency += clamp01(1 - Math.max(0, observation.latencyMs - input.latencyBudgetMs) / input.latencyBudgetMs);
    cells.set(key, cell);
  };

  for (const observation of input.observations) {
    add(observation.primaryAgent, observation.domain, 'primary', observation);
    add(observation.validatorAgent, observation.domain, 'validator', observation);
  }

  const matrix = [...cells.values()].map(cell => {
    const quality = cell.quality / cell.samples;
    const evidence = cell.evidence / cell.samples;
    const latency = cell.latency / cell.samples;
    const confidence = clamp01(cell.samples / Math.max(input.minimumSamples, 1));
    const score = clamp01((0.55 * quality) + (0.30 * evidence) + (0.15 * latency));
    return {
      agent: cell.agent,
      domain: cell.domain,
      role: cell.role,
      samples: cell.samples,
      quality: round(quality),
      evidenceCompleteness: round(evidence),
      latencyScore: round(latency),
      confidence: round(confidence),
      score: round(score * (0.75 + 0.25 * confidence))
    };
  }).sort((a,b) => b.score - a.score || b.samples - a.samples || a.agent.localeCompare(b.agent));

  const domains = [...new Set(input.observations.map(o => o.domain))].sort();
  const recommendations = domains.map(domain => {
    const primary = matrix.filter(x => x.domain === domain && x.role === 'primary' && x.samples >= input.minimumSamples)[0] ?? null;
    const validator = matrix.filter(x => x.domain === domain && x.role === 'validator' && x.samples >= input.minimumSamples)[0] ?? null;
    return {
      domain,
      recommendedPrimaryAgent: primary?.agent ?? null,
      recommendedValidatorAgent: validator?.agent ?? null,
      primaryScore: primary?.score ?? null,
      validatorScore: validator?.score ?? null,
      sufficientEvidence: Boolean(primary && validator)
    };
  });

  return {
    release: V80_RELEASE,
    observations: input.observations.length,
    matrix,
    recommendations,
    governedHintsOnly: true,
    authorizationChangesApplied: false,
    executionClaim: false
  };
}

export const v80EvidenceNodeSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['claim','evidence','test','skill','agent','capability','commit','artifact']),
  label: z.string().min(1).optional(),
  status: z.enum(['FRESH','STALE','INVALID','UNVERIFIED']).default('FRESH')
});

export const v80EvidenceEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  relation: z.enum(['supports','validates','produced_by','derived_from','bound_to','selected_by','depends_on'])
});

export const v80EvidenceGraphSchema = z.object({
  version: z.string().min(1).default('1'),
  nodes: z.array(v80EvidenceNodeSchema).min(1).max(5000),
  edges: z.array(v80EvidenceEdgeSchema).max(15000)
});

export function buildEvidenceGraphV80(input: z.infer<typeof v80EvidenceGraphSchema>) {
  const nodeIds = new Set(input.nodes.map(node => node.id));
  const brokenEdges = input.edges.filter(edge => !nodeIds.has(edge.from) || !nodeIds.has(edge.to));
  const inbound = new Map<string, z.infer<typeof v80EvidenceEdgeSchema>[]>();
  for (const edge of input.edges) {
    const list = inbound.get(edge.to) ?? [];
    list.push(edge);
    inbound.set(edge.to, list);
  }

  const claims = input.nodes.filter(node => node.kind === 'claim');
  const claimCoverage = claims.map(claim => {
    const relevant = (inbound.get(claim.id) ?? []).filter(edge => ['supports','validates','bound_to','derived_from'].includes(edge.relation));
    const sources = [...new Set(relevant.map(edge => edge.from))];
    const invalidSources = sources.filter(id => {
      const node = input.nodes.find(candidate => candidate.id === id);
      return node?.status === 'INVALID' || node?.status === 'STALE';
    });
    return {
      claimId: claim.id,
      supportCount: sources.length,
      invalidSupportCount: invalidSources.length,
      supported: sources.length > 0 && invalidSources.length === 0
    };
  });

  return {
    release: V80_RELEASE,
    version: input.version,
    nodeCount: input.nodes.length,
    edgeCount: input.edges.length,
    brokenEdges,
    claimCoverage,
    orphanClaims: claimCoverage.filter(item => item.supportCount === 0).map(item => item.claimId),
    unsupportedClaims: claimCoverage.filter(item => !item.supported).map(item => item.claimId),
    graphValid: brokenEdges.length === 0,
    executionClaim: false
  };
}

export const v80EvidenceInvalidationSchema = z.object({
  graph: v80EvidenceGraphSchema,
  changedNodeIds: z.array(z.string().min(1)).min(1).max(1000)
});

export function invalidateEvidenceGraphV80(input: z.infer<typeof v80EvidenceInvalidationSchema>) {
  const outgoing = new Map<string, string[]>();
  for (const edge of input.graph.edges) {
    const list = outgoing.get(edge.from) ?? [];
    list.push(edge.to);
    outgoing.set(edge.from, list);
  }

  const existing = new Set(input.graph.nodes.map(node => node.id));
  const queue = input.changedNodeIds.filter(id => existing.has(id));
  const invalidated = new Set(queue);

  while (queue.length) {
    const current = queue.shift() as string;
    for (const dependent of outgoing.get(current) ?? []) {
      if (!invalidated.has(dependent)) {
        invalidated.add(dependent);
        queue.push(dependent);
      }
    }
  }

  const invalidatedClaims = input.graph.nodes
    .filter(node => node.kind === 'claim' && invalidated.has(node.id))
    .map(node => node.id)
    .sort();

  return {
    release: V80_RELEASE,
    changedNodeIds: input.changedNodeIds,
    invalidatedNodeIds: [...invalidated].sort(),
    invalidatedClaims,
    requiresReverification: invalidatedClaims.length > 0,
    mutationApplied: false,
    executionClaim: false
  };
}

export const v80MultiAgentReviewSchema = z.object({
  domain: z.string().min(1),
  riskLevel: z.enum(['low','medium','high']),
  primary: z.object({ agent: agentSchema, status: reviewStatusSchema }),
  validator: z.object({ agent: agentSchema, status: reviewStatusSchema }),
  judge: z.object({ agent: agentSchema, status: reviewStatusSchema }).optional()
});

export function evaluateMultiAgentReviewV80(input: z.infer<typeof v80MultiAgentReviewSchema>) {
  const reviews = [input.primary, input.validator, ...(input.judge ? [input.judge] : [])];
  const statuses = reviews.map(item => item.status);
  const highRiskJudgeMissing = input.riskLevel === 'high' && !input.judge;

  let status: 'PASS'|'CONFLICT'|'BLOCKED'|'UNVERIFIED' = 'PASS';
  if (highRiskJudgeMissing) status = 'BLOCKED';
  else if (statuses.includes('BLOCKED')) status = 'BLOCKED';
  else if (statuses.includes('UNVERIFIED')) status = 'UNVERIFIED';
  else if (new Set(statuses).size > 1) status = 'CONFLICT';
  else if (statuses.every(value => value === 'FAIL')) status = 'CONFLICT';
  else if (!statuses.every(value => value === 'PASS')) status = 'CONFLICT';

  return {
    release: V80_RELEASE,
    domain: input.domain,
    riskLevel: input.riskLevel,
    status,
    highRiskJudgeRequired: input.riskLevel === 'high',
    highRiskJudgeMissing,
    reviewers: reviews,
    requiresContradictionResolution: status === 'CONFLICT',
    releaseDecisionAllowed: status === 'PASS',
    executionClaim: false
  };
}

export const v80BenchmarkCaseSchema = z.object({
  id: z.string().min(1),
  expectedSkill: z.string().min(1),
  rankedSkills: z.array(z.string().min(1)).min(1),
  evidenceComplete: z.boolean(),
  unsupportedClaim: z.boolean(),
  safeBlockExpected: z.boolean(),
  safeBlockObserved: z.boolean(),
  latencyMs: z.number().min(0).default(0)
});

export const v80BenchmarkSchema = z.object({
  cases: z.array(v80BenchmarkCaseSchema).min(1).max(5000),
  latencyBudgetMs: z.number().positive().default(10000)
});

export function evaluateSkillBenchmarkV80(input: z.infer<typeof v80BenchmarkSchema>) {
  const total = input.cases.length;
  const top1 = input.cases.filter(testCase => testCase.rankedSkills[0] === testCase.expectedSkill).length;
  const top3 = input.cases.filter(testCase => testCase.rankedSkills.slice(0,3).includes(testCase.expectedSkill)).length;
  const evidenceComplete = input.cases.filter(testCase => testCase.evidenceComplete).length;
  const unsupported = input.cases.filter(testCase => testCase.unsupportedClaim).length;
  const safeBlockCorrect = input.cases.filter(testCase => testCase.safeBlockExpected === testCase.safeBlockObserved).length;
  const withinLatency = input.cases.filter(testCase => testCase.latencyMs <= input.latencyBudgetMs).length;

  return {
    release: V80_RELEASE,
    cases: total,
    top1Accuracy: round(top1 / total),
    top3Recall: round(top3 / total),
    evidenceCompleteness: round(evidenceComplete / total),
    unsupportedClaimRate: round(unsupported / total),
    safeBlockAccuracy: round(safeBlockCorrect / total),
    latencyBudgetPassRate: round(withinLatency / total),
    executionClaim: false
  };
}

export const v80AdaptiveSkillIntelligenceSchema = z.object({
  operation: z.enum([
    'SCORE_SKILL_EFFECTIVENESS',
    'RANK_ADAPTIVE_SKILLS',
    'EVALUATE_SKILL_LIFECYCLE',
    'BUILD_AGENT_PERFORMANCE_MATRIX',
    'BUILD_EVIDENCE_GRAPH',
    'INVALIDATE_EVIDENCE_GRAPH',
    'EVALUATE_MULTI_AGENT_REVIEW',
    'EVALUATE_BENCHMARK',
    'CREATE_OBSERVATION_LEDGER',
    'RECORD_SKILL_OBSERVATION',
    'RECORD_MISSION_OUTCOME',
    'BUILD_SKILL_HEALTH_SNAPSHOT',
    'ROUTE_WITH_OPERATIONAL_HISTORY',
    'PROPOSE_LIFECYCLE_ACTIONS',
    'BUILD_CONTROL_CENTER_SNAPSHOT',
    'AUDIT_OPERATIONAL_LEARNING',
    'EVALUATE_SKILL_ONBOARDING',
    'EVALUATE_SKILL_PACK_ONBOARDING',
    'CLASSIFY_DUPLICATE_PAIR',
    'EVALUATE_SKILL_RETIREMENT',
    'BUILD_RETIREMENT_PORTFOLIO',
    'AUDIT_SKILL_ONBOARDING_GOVERNANCE',
    'GET_V42_SHADOW_REGISTRY_SUMMARY',
    'GET_V42_SHADOW_CANDIDATE',
    'SELECT_V42_CANARY_COHORT',
    'AUDIT_V42_SHADOW_REGISTRY',
    'EVALUATE_V42_SHADOW_BENCHMARK',
    'GET_V42_SHADOW_BENCHMARK_REPORT',
    'AUDIT_V42_SHADOW_BENCHMARK_RUNNER',
    'EVALUATE_V42_PROMOTION_READINESS',
    'BUILD_V42_PROMOTION_PLAN',
    'AUDIT_V42_PROMOTION_CONTROLLER',
    'PREPARE_V42_PROMOTION_TRANSACTION',
    'EXECUTE_V42_PROMOTION_TRANSACTION',
    'AUDIT_V42_AUTHORIZED_PROMOTION_EXECUTOR',
    'PREPARE_V42_REAL_CATALOG_PROMOTION',
    'VERIFY_V42_REAL_CATALOG_PATCH',
    'AUDIT_V42_REAL_CATALOG_PROMOTION_ADAPTER',
    'BUILD_V42_REAL_BENCHMARK_MANIFEST',
    'VERIFY_V42_REAL_BENCHMARK_RECEIPTS',
    'BUILD_V42_REAL_BENCHMARK_EVIDENCE',
    'AUDIT_V42_REAL_BENCHMARK_EVIDENCE_PIPELINE',
    'PLAN_V42_REAL_BENCHMARK_CAMPAIGN',
    'BUILD_V42_REAL_BENCHMARK_CAMPAIGN_STATUS',
    'AUDIT_V42_REAL_BENCHMARK_CAMPAIGN_ORCHESTRATOR',
    'AUDIT'
  ]),
  payload: z.unknown().optional()
});

export function auditAdaptiveSkillIntelligenceV80() {
  const strong = scoreSkillEffectivenessV80(v80EffectivenessSchema.parse({
    metrics: {
      skillName: 'strong-skill',
      domain: 'database',
      selectionCount: 30,
      successCount: 28,
      validatorPassCount: 27,
      evidenceCompleteCount: 30,
      handoffCount: 2,
      regressionCount: 1,
      failureCount: 1,
      avgLatencyMs: 3000
    }
  }));

  const weak = scoreSkillEffectivenessV80(v80EffectivenessSchema.parse({
    metrics: {
      skillName: 'weak-skill',
      domain: 'database',
      selectionCount: 30,
      successCount: 12,
      validatorPassCount: 13,
      evidenceCompleteCount: 15,
      handoffCount: 12,
      regressionCount: 7,
      failureCount: 8,
      avgLatencyMs: 16000
    }
  }));

  const routed = rankAdaptiveSkillsV80(v80AdaptiveRoutingSchema.parse({
    query: 'database migration safety',
    candidates: [
      { skillName:'semantic-only', domain:'database', semanticScore:0.96, evidenceFit:0.40, historicalQuality:0.45, agentFit:0.70, lifecycle:'STABLE', riskLevel:'medium' },
      { skillName:'proven-skill', domain:'database', semanticScore:0.90, evidenceFit:0.95, historicalQuality:0.96, agentFit:0.92, lifecycle:'STABLE', riskLevel:'low' }
    ]
  }));

  const ambiguous = rankAdaptiveSkillsV80(v80AdaptiveRoutingSchema.parse({
    query: 'ambiguous route',
    ambiguityDelta: 0.05,
    candidates: [
      { skillName:'a', semanticScore:0.8, evidenceFit:0.8, historicalQuality:0.8, agentFit:0.8, lifecycle:'STABLE', riskLevel:'low' },
      { skillName:'b', semanticScore:0.79, evidenceFit:0.8, historicalQuality:0.8, agentFit:0.8, lifecycle:'STABLE', riskLevel:'low' }
    ]
  }));

  const lifecycle = evaluateSkillLifecycleV80(v80LifecycleEvaluationSchema.parse({
    skillName:'canary-skill',
    currentState:'CANARY',
    contractValid:true,
    schemaValid:true,
    securityPass:true,
    sampleSize:40,
    successRate:0.95,
    validatorPassRate:0.94,
    evidenceCompletenessRate:0.98,
    regressionRate:0.02
  }));

  const matrix = buildAgentPerformanceMatrixV80(v80AgentMatrixSchema.parse({
    minimumSamples:2,
    observations:[
      { domain:'testing', primaryAgent:'qa', validatorAgent:'qa', outcome:'PASS', evidenceComplete:true, latencyMs:1000 },
      { domain:'testing', primaryAgent:'qa', validatorAgent:'qa', outcome:'PASS', evidenceComplete:true, latencyMs:1200 },
      { domain:'testing', primaryAgent:'backend', validatorAgent:'backend', outcome:'FAIL', evidenceComplete:false, latencyMs:1000 },
      { domain:'testing', primaryAgent:'backend', validatorAgent:'backend', outcome:'FAIL', evidenceComplete:false, latencyMs:1000 }
    ]
  }));

  const graph = v80EvidenceGraphSchema.parse({
    version:'audit',
    nodes:[
      { id:'commit:1', kind:'commit' },
      { id:'evidence:1', kind:'evidence' },
      { id:'claim:1', kind:'claim' }
    ],
    edges:[
      { from:'commit:1', to:'evidence:1', relation:'bound_to' },
      { from:'evidence:1', to:'claim:1', relation:'supports' }
    ]
  });
  const graphBuilt = buildEvidenceGraphV80(graph);
  const invalidated = invalidateEvidenceGraphV80({ graph, changedNodeIds:['commit:1'] });

  const review = evaluateMultiAgentReviewV80(v80MultiAgentReviewSchema.parse({
    domain:'security',
    riskLevel:'high',
    primary:{agent:'security',status:'PASS'},
    validator:{agent:'qa',status:'FAIL'},
    judge:{agent:'release-auditor',status:'PASS'}
  }));

  const benchmark = evaluateSkillBenchmarkV80(v80BenchmarkSchema.parse({
    cases:[
      { id:'1', expectedSkill:'a', rankedSkills:['a','b'], evidenceComplete:true, unsupportedClaim:false, safeBlockExpected:false, safeBlockObserved:false, latencyMs:1000 },
      { id:'2', expectedSkill:'b', rankedSkills:['x','b'], evidenceComplete:true, unsupportedClaim:false, safeBlockExpected:true, safeBlockObserved:true, latencyMs:2000 }
    ]
  }));

  const checks = {
    effectivenessOrdersQuality: strong.score > weak.score,
    adaptiveRouterUsesEvidenceAndHistory: routed.selectedSkill === 'proven-skill',
    ambiguityEscalatesToOrchestrator: ambiguous.needsOrchestrator,
    lifecyclePromotesQualifiedCanary: lifecycle.recommendedState === 'STABLE',
    agentMatrixLearnsQaTestingStrength: matrix.recommendations.find(item => item.domain === 'testing')?.recommendedValidatorAgent === 'qa',
    evidenceGraphHasClaimSupport: graphBuilt.unsupportedClaims.length === 0,
    evidenceInvalidationPropagates: invalidated.invalidatedClaims.includes('claim:1'),
    disagreementRequiresResolution: review.status === 'CONFLICT' && review.requiresContradictionResolution,
    benchmarkMetricsDeterministic: benchmark.top1Accuracy === 0.5 && benchmark.top3Recall === 1,
    skillCatalogVisible: V75_SKILL_NAMES.length > 0,
    agentCatalogStable: V75_AGENT_IDS.length === 11
  };

  const failures = Object.entries(checks).filter(([,passed]) => !passed).map(([name]) => name);

  return {
    release: V80_RELEASE,
    status: failures.length ? 'FAIL' : 'PASS',
    currentSkillCatalogCount: V75_SKILL_NAMES.length,
    agentCount: V75_AGENT_IDS.length,
    engines: [
      'skill-effectiveness',
      'adaptive-router',
      'skill-lifecycle',
      'agent-performance-matrix',
      'evidence-graph'
    ],
    additionalControls: ['multi-agent-review','benchmark-suite'],
    checks,
    failures,
    corePublicToolSurfaceChange: 0,
    internalCapabilityRegistryChange: 0,
    controlPlaneCapabilitiesAdded: 1,
    selfModification: false,
    executionClaim: false
  };
}
