import { z } from 'zod';

export const v50StatusSchema = z.enum(['PASS', 'FAIL', 'PASS_WITH_GAPS', 'UNKNOWN', 'NOT_RUN', 'NOT_APPLICABLE']);
export const v50RiskSchema = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
export const v50EvidenceSchema = z.object({
  id: z.string().min(1),
  kind: z.string().default('OTHER'),
  verified: z.boolean().default(false),
  source: z.string().default('HOST'),
  observedAt: z.string().optional(),
  expiresAt: z.string().optional(),
  contentHash: z.string().optional(),
  summary: z.string().default('')
});

export const policyAsCodeSchema = z.object({
  policySetId: z.string().min(1),
  facts: z.record(z.string(), z.unknown()).default({}),
  policies: z.array(z.object({
    id: z.string().min(1),
    scope: z.string().default('*'),
    effect: z.enum(['ALLOW', 'DENY', 'REQUIRE']),
    priority: z.number().int().default(0),
    mandatory: z.boolean().default(true),
    condition: z.object({
      field: z.string(),
      operator: z.enum(['EQUALS', 'NOT_EQUALS', 'IN', 'NOT_IN', 'EXISTS', 'GT', 'GTE', 'LT', 'LTE']),
      value: z.unknown().optional()
    }),
    requirement: z.string().optional(),
    evidenceRefs: z.array(z.string()).default([])
  })).default([]),
  exceptions: z.array(z.object({
    id: z.string(),
    policyId: z.string(),
    approved: z.boolean().default(false),
    expiresAt: z.string().optional(),
    evidenceRefs: z.array(z.string()).default([])
  })).default([]),
  evidence: z.array(v50EvidenceSchema).default([]),
  now: z.string().optional(),
  previousDecisions: z.record(z.string(), z.string()).default({})
});

export const evidenceLineageSchema = z.object({
  graphId: z.string().min(1),
  nodes: z.array(z.object({
    id: z.string(),
    kind: z.enum(['CLAIM', 'SOURCE', 'BUILD', 'TEST', 'RUNTIME', 'APPROVAL', 'DECISION', 'OTHER']),
    verified: z.boolean().default(false),
    observedAt: z.string().optional(),
    expiresAt: z.string().optional(),
    contentHash: z.string().optional(),
    status: v50StatusSchema.default('UNKNOWN')
  })).default([]),
  edges: z.array(z.object({
    from: z.string(),
    to: z.string(),
    relation: z.enum(['SUPPORTS', 'CONTRADICTS', 'DERIVED_FROM', 'INVALIDATES', 'REPLACES'])
  })).default([]),
  requiredClaimIds: z.array(z.string()).default([]),
  now: z.string().optional(),
  previousNodeHashes: z.record(z.string(), z.string()).default({})
});

export const verificationPortfolioSchema = z.object({
  portfolioId: z.string().min(1),
  budgetMinutes: z.number().nonnegative(),
  changedCategories: z.array(z.string()).default([]),
  criticalCategories: z.array(z.string()).default([]),
  gates: z.array(z.object({
    id: z.string(),
    categories: z.array(z.string()).default([]),
    costMinutes: z.number().nonnegative(),
    riskReduction: z.number().nonnegative(),
    required: z.boolean().default(false),
    available: z.boolean().default(true),
    dependencies: z.array(z.string()).default([]),
    status: v50StatusSchema.default('NOT_RUN'),
    evidenceRefs: z.array(z.string()).default([])
  })).default([]),
  evidence: z.array(v50EvidenceSchema).default([]),
  selectedGateIds: z.array(z.string()).default([]),
  previousSelectedGateIds: z.array(z.string()).default([])
});

export const confidenceCalibrationSchema = z.object({
  modelId: z.string().min(1),
  signals: z.array(z.object({
    id: z.string(),
    kind: z.string(),
    status: v50StatusSchema.default('UNKNOWN'),
    weight: z.number().positive().default(1),
    reliability: z.number().min(0).max(1).default(1),
    evidenceRefs: z.array(z.string()).default([])
  })).default([]),
  evidence: z.array(v50EvidenceSchema).default([]),
  thresholds: z.object({ allow: z.number().min(0).max(100).default(90), conditional: z.number().min(0).max(100).default(70) }).default({ allow: 90, conditional: 70 }),
  minimumRequiredSignals: z.array(z.string()).default([]),
  historicalOutcomes: z.array(z.object({ score: z.number().min(0).max(100), successful: z.boolean() })).default([]),
  previousScore: z.number().min(0).max(100).optional()
});

export const incidentCommandSchema = z.object({
  incidentId: z.string().min(1),
  summary: z.string().min(1),
  signals: z.array(z.object({ id: z.string(), category: z.string(), severity: v50RiskSchema, verified: z.boolean().default(false), evidenceRefs: z.array(z.string()).default([]) })).default([]),
  events: z.array(z.object({ id: z.string(), at: z.string(), type: z.string(), summary: z.string(), evidenceRefs: z.array(z.string()).default([]) })).default([]),
  responders: z.array(z.object({ role: z.string(), owner: z.string().optional(), acknowledged: z.boolean().default(false) })).default([]),
  requiredRoles: z.array(z.string()).default(['incident-commander', 'technical-lead', 'communications']),
  objectives: z.array(z.object({ id: z.string(), targetMinutes: z.number().nonnegative().optional(), completedAtMinutes: z.number().nonnegative().optional(), status: v50StatusSchema.default('NOT_RUN'), evidenceRefs: z.array(z.string()).default([]) })).default([]),
  evidence: z.array(v50EvidenceSchema).default([]),
  previousSeverity: v50RiskSchema.optional()
});

const interfaceSchema = z.object({
  id: z.string(),
  version: z.string(),
  contractHash: z.string().optional(),
  consumers: z.array(z.string()).default([]),
  requiredInputs: z.array(z.string()).default([]),
  outputFields: z.array(z.string()).default([]),
  status: z.enum(['ACTIVE', 'DEPRECATED', 'SUNSET', 'PROPOSED']).default('ACTIVE')
});

export const compatibilityLifecycleSchema = z.object({
  releaseId: z.string().min(1),
  current: z.array(interfaceSchema).default([]),
  previous: z.array(interfaceSchema).default([]),
  deprecations: z.array(z.object({
    interfaceId: z.string(),
    announced: z.boolean().default(false),
    replacementId: z.string().optional(),
    sunsetAt: z.string().optional(),
    migratedConsumers: z.array(z.string()).default([]),
    evidenceRefs: z.array(z.string()).default([])
  })).default([]),
  evidence: z.array(v50EvidenceSchema).default([]),
  now: z.string().optional(),
  maxWaveSize: z.number().int().positive().default(10)
});

export const agentReliabilitySchema = z.object({
  evaluationId: z.string().min(1),
  agents: z.array(z.object({
    id: z.string(),
    specialization: z.array(z.string()).default([]),
    runs: z.array(z.object({
      id: z.string(),
      taskCategory: z.string(),
      status: v50StatusSchema,
      claims: z.array(z.object({ id: z.string(), evidenceRefs: z.array(z.string()).default([]) })).default([]),
      changedPaths: z.array(z.string()).default([]),
      allowedPaths: z.array(z.string()).default([]),
      handoffFields: z.array(z.string()).default([]),
      durationMinutes: z.number().nonnegative().optional()
    })).default([])
  })).default([]),
  evidence: z.array(v50EvidenceSchema).default([]),
  taskCategory: z.string().optional(),
  requiredHandoffFields: z.array(z.string()).default(['status', 'changes', 'evidence', 'risks', 'openItems']),
  previousScores: z.record(z.string(), z.number()).default({})
});

export const continuousImprovementSchema = z.object({
  programId: z.string().min(1),
  observations: z.array(z.object({
    id: z.string(),
    category: z.string(),
    signature: z.string(),
    severity: v50RiskSchema.default('MEDIUM'),
    recurring: z.boolean().default(false),
    controlId: z.string().optional(),
    detected: z.boolean().default(true),
    prevented: z.boolean().default(false),
    costMinutes: z.number().nonnegative().default(0),
    evidenceRefs: z.array(z.string()).default([])
  })).default([]),
  controls: z.array(z.object({ id: z.string(), operatingCostMinutes: z.number().nonnegative().default(0), investmentCostMinutes: z.number().nonnegative().default(0) })).default([]),
  evidence: z.array(v50EvidenceSchema).default([]),
  capacityMinutes: z.number().nonnegative().default(0),
  previousPriorities: z.array(z.string()).default([])
});
