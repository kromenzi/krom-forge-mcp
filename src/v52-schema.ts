import { z } from 'zod';

export const v52EvidenceSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  verified: z.boolean().default(false),
  source: z.string().default('host')
});

export const engineeringConstitutionSchema = z.object({
  constitutionId: z.string().min(1),
  evidence: z.array(v52EvidenceSchema).default([]),
  principles: z.array(z.object({
    id: z.string().min(1),
    statement: z.string().min(1),
    mandatory: z.boolean().default(true),
    priority: z.number().int().nonnegative().default(100),
    evidenceRefs: z.array(z.string()).default([])
  })).default([]),
  proposedActions: z.array(z.object({
    id: z.string().min(1),
    principleIds: z.array(z.string()).default([]),
    violates: z.array(z.string()).default([]),
    evidenceRefs: z.array(z.string()).default([])
  })).default([]),
  previousPrincipleIds: z.array(z.string()).default([])
});

export const constraintSolverSchema = z.object({
  solverId: z.string().min(1),
  variables: z.record(z.string(), z.array(z.string())).default({}),
  constraints: z.array(z.object({
    id: z.string().min(1),
    variable: z.string(),
    allowed: z.array(z.string()).default([]),
    forbidden: z.array(z.string()).default([]),
    mandatory: z.boolean().default(true),
    weight: z.number().nonnegative().default(1)
  })).default([]),
  currentSelection: z.record(z.string(), z.string()).default({}),
  previousSelection: z.record(z.string(), z.string()).default({})
});

export const trustGraphSchema = z.object({
  graphId: z.string().min(1),
  evidence: z.array(v52EvidenceSchema).default([]),
  nodes: z.array(z.object({
    id: z.string().min(1),
    kind: z.string().default('GENERIC'),
    directTrust: z.number().min(0).max(100).default(0),
    evidenceRefs: z.array(z.string()).default([])
  })).default([]),
  edges: z.array(z.object({
    from: z.string(),
    to: z.string(),
    relation: z.enum(['DEPENDS_ON','VERIFIES','DELEGATES_TO']),
    confidence: z.number().min(0).max(100).default(0)
  })).default([]),
  previousScores: z.record(z.string(), z.number()).default({})
});

export const changeSimulationSchema = z.object({
  simulationId: z.string().min(1),
  components: z.array(z.object({
    id: z.string().min(1),
    criticality: z.enum(['CRITICAL','HIGH','MEDIUM','LOW']).default('MEDIUM'),
    dependsOn: z.array(z.string()).default([]),
    safeguards: z.array(z.string()).default([])
  })).default([]),
  changes: z.array(z.object({
    id: z.string().min(1),
    componentId: z.string(),
    impact: z.number().min(0).max(100),
    reversible: z.boolean().default(true)
  })).default([]),
  previousImpactedIds: z.array(z.string()).default([])
});

export const recoveryStrategySchema = z.object({
  recoveryId: z.string().min(1),
  evidence: z.array(v52EvidenceSchema).default([]),
  incidentSeverity: z.enum(['CRITICAL','HIGH','MEDIUM','LOW']).default('MEDIUM'),
  recoveryObjectiveMinutes: z.number().nonnegative().default(60),
  strategies: z.array(z.object({
    id: z.string().min(1),
    estimatedMinutes: z.number().nonnegative(),
    dataLossRisk: z.number().min(0).max(100).default(0),
    serviceRisk: z.number().min(0).max(100).default(0),
    reversible: z.boolean().default(true),
    dependencies: z.array(z.string()).default([]),
    evidenceRefs: z.array(z.string()).default([])
  })).default([]),
  availableDependencies: z.array(z.string()).default([]),
  previousStrategyId: z.string().optional()
});

export const verificationEconomicsSchema = z.object({
  portfolioId: z.string().min(1),
  budget: z.number().nonnegative(),
  checks: z.array(z.object({
    id: z.string().min(1),
    cost: z.number().nonnegative(),
    riskReduction: z.number().nonnegative(),
    mandatory: z.boolean().default(false),
    criticalPath: z.boolean().default(false),
    evidenceRefs: z.array(z.string()).default([])
  })).default([]),
  previousSelectedIds: z.array(z.string()).default([])
});

export const multiProjectCoordinationSchema = z.object({
  programId: z.string().min(1),
  projects: z.array(z.object({
    id: z.string().min(1),
    priority: z.number().nonnegative().default(1),
    dependsOn: z.array(z.string()).default([]),
    requiredCapabilities: z.array(z.string()).default([]),
    window: z.string().optional()
  })).default([]),
  sharedCapacity: z.record(z.string(), z.number().int().nonnegative()).default({}),
  previousOrder: z.array(z.string()).default([])
});

export const operatorCockpitSchema = z.object({
  cockpitId: z.string().min(1),
  evidence: z.array(v52EvidenceSchema).default([]),
  actions: z.array(z.object({
    id: z.string().min(1),
    severity: z.enum(['CRITICAL','HIGH','MEDIUM','LOW']).default('MEDIUM'),
    impact: z.number().min(0).max(100).default(0),
    reversible: z.boolean().default(true),
    requiresApproval: z.boolean().default(false),
    approved: z.boolean().default(false),
    blockers: z.array(z.string()).default([]),
    evidenceRefs: z.array(z.string()).default([])
  })).default([]),
  previousSelectedActionId: z.string().optional()
});
