import { z } from 'zod';

export const v51EvidenceSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  verified: z.boolean().default(false),
  source: z.string().default('host'),
  summary: z.string().optional(),
  observedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional()
});

export const missionRuntimeSchema = z.object({
  missionId: z.string().min(1),
  now: z.string().datetime().optional(),
  availableCapabilities: z.array(z.string()).default([]),
  approvals: z.array(z.object({ actionId: z.string(), approved: z.boolean(), evidenceRefs: z.array(z.string()).default([]) })).default([]),
  evidence: z.array(v51EvidenceSchema).default([]),
  stages: z.array(z.object({
    id: z.string().min(1), title: z.string().default(''),
    status: z.enum(['PENDING', 'READY', 'RUNNING', 'PASS', 'FAIL', 'BLOCKED']).default('PENDING'),
    dependsOn: z.array(z.string()).default([]), requiredEvidence: z.array(z.string()).default([]),
    requiredCapabilities: z.array(z.string()).default([]), requiresApproval: z.boolean().default(false),
    reversible: z.boolean().default(true), checkpoint: z.boolean().default(false), attempts: z.number().int().nonnegative().default(0),
    maxAttempts: z.number().int().positive().default(3)
  })).default([]),
  previousStages: z.record(z.string(), z.string()).default({})
});

export const causalDecisionSchema = z.object({
  decisionId: z.string().min(1), objective: z.string().min(1),
  evidence: z.array(v51EvidenceSchema).default([]),
  assumptions: z.array(z.object({ id: z.string(), statement: z.string().default(''), status: z.enum(['VALID', 'INVALID', 'UNKNOWN']).default('UNKNOWN'), evidenceRefs: z.array(z.string()).default([]) })).default([]),
  options: z.array(z.object({
    id: z.string(), benefits: z.array(z.number()).default([]), costs: z.array(z.number()).default([]),
    risk: z.number().min(0).max(100).default(0), reversible: z.boolean().default(true),
    evidenceRefs: z.array(z.string()).default([]), assumptionIds: z.array(z.string()).default([])
  })).default([]),
  edges: z.array(z.object({ from: z.string(), to: z.string(), relation: z.enum(['DEPENDS_ON', 'CONFLICTS_WITH', 'ENABLES']) })).default([]),
  selectedOptionId: z.string().optional(), previousSelectedOptionId: z.string().optional(),
  outcomes: z.array(z.object({ optionId: z.string(), metric: z.string(), value: z.number(), evidenceRefs: z.array(z.string()).default([]) })).default([])
});

export const scenarioLabSchema = z.object({
  labId: z.string().min(1), availableCapabilities: z.array(z.string()).default([]), evidence: z.array(v51EvidenceSchema).default([]),
  strategies: z.array(z.object({
    id: z.string(), baseValue: z.number().default(0), cost: z.number().nonnegative().default(0), reversible: z.boolean().default(true),
    requiredCapabilities: z.array(z.string()).default([]), evidenceRefs: z.array(z.string()).default([])
  })).default([]),
  scenarios: z.array(z.object({ id: z.string(), probability: z.number().min(0).max(1), impacts: z.record(z.string(), z.number()).default({}), unavailableCapabilities: z.array(z.string()).default([]) })).default([]),
  previousRanking: z.array(z.string()).default([])
});

export const riskCapitalSchema = z.object({
  portfolioId: z.string().min(1), budget: z.number().nonnegative(), evidence: z.array(v51EvidenceSchema).default([]),
  changes: z.array(z.object({
    id: z.string(), risk: z.number().nonnegative(), value: z.number().nonnegative().default(0), mandatory: z.boolean().default(false),
    domains: z.array(z.string()).default([]), dependsOn: z.array(z.string()).default([]), evidenceRefs: z.array(z.string()).default([])
  })).default([]),
  previousAllocations: z.array(z.string()).default([])
});

export const capabilityMarketSchema = z.object({
  marketId: z.string().min(1), evidence: z.array(v51EvidenceSchema).default([]),
  demands: z.array(z.object({ id: z.string(), capability: z.string(), minimumReliability: z.number().min(0).max(100).default(0), maximumCost: z.number().nonnegative().default(1_000_000), requiredEvidenceKinds: z.array(z.string()).default([]) })).default([]),
  offers: z.array(z.object({ id: z.string(), provider: z.string(), capabilities: z.array(z.string()), reliability: z.number().min(0).max(100), cost: z.number().nonnegative().default(0), capacity: z.number().int().nonnegative().default(1), evidenceRefs: z.array(z.string()).default([]) })).default([]),
  contracts: z.array(z.object({ demandId: z.string(), offerId: z.string(), accepted: z.boolean().default(false), approvalEvidenceRefs: z.array(z.string()).default([]) })).default([]),
  previousMatches: z.record(z.string(), z.string()).default({})
});

export const knowledgeMemorySchema = z.object({
  memoryId: z.string().min(1), now: z.string().datetime(), evidence: z.array(v51EvidenceSchema).default([]),
  requiredTopics: z.array(z.string()).default([]), previousItemIds: z.array(z.string()).default([]),
  items: z.array(z.object({
    id: z.string(), topic: z.string(), statement: z.string(), observedAt: z.string().datetime(), expiresAt: z.string().datetime().optional(),
    verified: z.boolean().default(false), confidence: z.number().min(0).max(100).default(50), evidenceRefs: z.array(z.string()).default([]),
    replaces: z.array(z.string()).default([]), contradicts: z.array(z.string()).default([])
  })).default([])
});

export const safetyCaseSchema = z.object({
  caseId: z.string().min(1), releaseId: z.string().optional(), evidence: z.array(v51EvidenceSchema).default([]),
  hazards: z.array(z.object({ id: z.string(), severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']), probability: z.number().min(0).max(1), controlIds: z.array(z.string()).default([]) })).default([]),
  controls: z.array(z.object({ id: z.string(), hazardIds: z.array(z.string()).default([]), effectiveness: z.number().min(0).max(1).default(0), verified: z.boolean().default(false), evidenceRefs: z.array(z.string()).default([]) })).default([]),
  claims: z.array(z.object({ id: z.string(), statement: z.string(), status: z.enum(['SUPPORTED', 'PARTIAL', 'UNSUPPORTED', 'CONTRADICTED']).default('UNSUPPORTED'), argumentIds: z.array(z.string()).default([]), evidenceRefs: z.array(z.string()).default([]) })).default([]),
  arguments: z.array(z.object({ id: z.string(), claimId: z.string(), premiseClaimIds: z.array(z.string()).default([]), evidenceRefs: z.array(z.string()).default([]) })).default([]),
  previousUnsupportedClaims: z.array(z.string()).default([])
});

export const releaseTwinSchema = z.object({
  releaseId: z.string().min(1), evidence: z.array(v51EvidenceSchema).default([]),
  components: z.array(z.object({ id: z.string(), currentVersion: z.string(), targetVersion: z.string(), health: z.number().min(0).max(100).default(100), dependsOn: z.array(z.string()).default([]), evidenceRefs: z.array(z.string()).default([]) })).default([]),
  transitions: z.array(z.object({ componentId: z.string(), risk: z.number().min(0).max(100), reversible: z.boolean().default(true), requiredEvidence: z.array(z.string()).default([]) })).default([]),
  injections: z.array(z.object({ id: z.string(), componentId: z.string(), healthDelta: z.number(), propagates: z.boolean().default(true) })).default([]),
  observations: z.array(z.object({ componentId: z.string(), predictedHealth: z.number(), actualHealth: z.number(), evidenceRefs: z.array(z.string()).default([]) })).default([]),
  previousRisk: z.number().optional()
});

export const toolEcosystemSchema = z.object({
  ecosystemId: z.string().min(1), evidence: z.array(v51EvidenceSchema).default([]),
  tools: z.array(z.object({ id: z.string(), capabilities: z.array(z.string()).default([]), dependsOn: z.array(z.string()).default([]), reliability: z.number().min(0).max(100).default(0), cost: z.number().nonnegative().default(0), capacity: z.number().int().nonnegative().default(1), evidenceRefs: z.array(z.string()).default([]) })).default([]),
  requirements: z.array(z.object({ id: z.string(), capability: z.string(), required: z.boolean().default(true) })).default([]),
  previousToolIds: z.array(z.string()).default([])
});

export const driftForecastSchema = z.object({
  forecastId: z.string().min(1), evidence: z.array(v51EvidenceSchema).default([]), horizon: z.number().int().positive().default(1),
  metrics: z.array(z.object({ id: z.string(), direction: z.enum(['MAX', 'MIN']), threshold: z.number(), points: z.array(z.object({ index: z.number(), value: z.number(), evidenceRefs: z.array(z.string()).default([]) })).default([]) })).default([]),
  actuals: z.record(z.string(), z.number()).default({}), previousForecasts: z.record(z.string(), z.number()).default({})
});

export const humanOversightSchema = z.object({
  modelId: z.string().min(1), evidence: z.array(v51EvidenceSchema).default([]),
  policy: z.object({ mandatoryImpact: z.number().min(0).max(100).default(70), mandatoryUncertainty: z.number().min(0).max(100).default(60), requireIrreversibleReview: z.boolean().default(true) }).default({ mandatoryImpact: 70, mandatoryUncertainty: 60, requireIrreversibleReview: true }),
  actions: z.array(z.object({ id: z.string(), impact: z.number().min(0).max(100), uncertainty: z.number().min(0).max(100), reversible: z.boolean().default(true), requiredRoles: z.array(z.string()).default([]), evidenceRefs: z.array(z.string()).default([]) })).default([]),
  approvals: z.array(z.object({ actionId: z.string(), role: z.string(), approved: z.boolean(), evidenceRefs: z.array(z.string()).default([]) })).default([]),
  escalationLevels: z.array(z.object({ level: z.number().int().nonnegative(), role: z.string(), maximumImpact: z.number().min(0).max(100) })).default([]),
  previousReviewIds: z.array(z.string()).default([])
});

export const outcomeLearningSchema = z.object({
  programId: z.string().min(1), evidence: z.array(v51EvidenceSchema).default([]),
  interventions: z.array(z.object({ id: z.string(), action: z.string(), predictedImpact: z.number(), cohort: z.string().default('default'), evidenceRefs: z.array(z.string()).default([]) })).default([]),
  outcomes: z.array(z.object({ id: z.string(), interventionId: z.string(), metric: z.string(), baseline: z.number(), value: z.number(), cohort: z.string().default('default'), evidenceRefs: z.array(z.string()).default([]) })).default([]),
  minimumSamples: z.number().int().positive().default(1), previousEffects: z.record(z.string(), z.number()).default({})
});
