import { z } from 'zod';

export const qualityDimensionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2),
  weight: z.number().min(0).max(1).default(0.1),
  status: z.enum(['PASS','PASS_WITH_GAPS','FAIL','NOT_AVAILABLE','NOT_APPLICABLE']),
  evidence: z.array(z.string()).default([]),
  findings: z.array(z.string()).default([]),
  blockers: z.array(z.string()).default([]),
  score: z.number().min(0).max(100).optional()
});

export const qualityGateInputSchema = z.object({
  objective: z.string().min(3),
  releaseTarget: z.string().optional(),
  dimensions: z.array(qualityDimensionSchema).min(1),
  residualRisks: z.array(z.object({
    severity: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']),
    description: z.string().min(2),
    mitigated: z.boolean().default(false)
  })).default([]),
  unsupportedClaims: z.array(z.string()).default([]),
  openBlockers: z.array(z.string()).default([])
});

export const planQualityInputSchema = z.object({
  objective: z.string().min(3),
  tasks: z.array(z.object({
    id: z.string(),
    description: z.string(),
    dependencies: z.array(z.string()).default([]),
    acceptanceCriteria: z.array(z.string()).default([]),
    evidenceRequired: z.array(z.string()).default([])
  })).min(1),
  assumptions: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([])
});

export const deliveryQualityInputSchema = z.object({
  summary: z.string().min(3),
  completedItems: z.array(z.string()).default([]),
  evidenceRefs: z.array(z.string()).default([]),
  knownGaps: z.array(z.string()).default([]),
  userFacingClaims: z.array(z.string()).default([]),
  releaseStatus: z.enum(['NOT_READY','READY_WITH_GAPS','READY']).default('NOT_READY')
});

export const compareQualityGatesSchema = z.object({
  before: qualityGateInputSchema,
  after: qualityGateInputSchema
});
