import { z } from 'zod';

export const gateStateSchema = z.enum(['PASS','WARN','FAIL','UNKNOWN']);

export const readinessDimensionSchema = z.object({
  name: z.enum(['BUILD','TEST','SECURITY','EVIDENCE','RUNTIME','RECOVERY','QUALITY','APPROVAL','DEPLOYMENT','DATA']),
  state: gateStateSchema,
  score: z.number().min(0).max(100).optional(),
  evidenceRefs: z.array(z.string()).default([]),
  blockers: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([]),
  critical: z.boolean().default(false)
});

export const productionReadinessInputSchema = z.object({
  projectId: z.string().min(1),
  releaseId: z.string().min(1),
  environment: z.string().default('production'),
  dimensions: z.array(readinessDimensionSchema).default([]),
  unsupportedClaims: z.array(z.string()).default([]),
  openCriticalRisks: z.array(z.string()).default([]),
  openBlockers: z.array(z.string()).default([]),
  approvalRequired: z.boolean().default(true),
  approvalGranted: z.boolean().default(false),
  rollbackPlanAvailable: z.boolean().default(false),
  rollbackPlanVerified: z.boolean().default(false),
  runtimeVerificationPlanned: z.boolean().default(false),
  changeWindow: z.string().optional(),
  owner: z.string().optional()
});

export const releaseDecisionSchema = z.object({
  readiness: productionReadinessInputSchema,
  minimumScore: z.number().min(0).max(100).default(85),
  allowConditional: z.boolean().default(true)
});

export const releaseExceptionSchema = z.object({
  releaseId: z.string().min(1),
  exceptionId: z.string().min(1),
  reason: z.string().min(5),
  dimensions: z.array(z.string()).min(1),
  approver: z.string().min(1),
  approved: z.boolean(),
  expiresAt: z.string().optional(),
  compensatingControls: z.array(z.string()).default([]),
  evidenceRefs: z.array(z.string()).default([])
});

export const postReleaseVerificationSchema = z.object({
  projectId: z.string().min(1),
  releaseId: z.string().min(1),
  deploymentVerified: z.boolean().default(false),
  runtimeHealth: z.enum(['HEALTHY','DEGRADED','UNHEALTHY','INSUFFICIENT_EVIDENCE']).default('INSUFFICIENT_EVIDENCE'),
  regressionPassed: z.boolean().default(false),
  criticalIncidents: z.array(z.string()).default([]),
  verifiedEvidenceRefs: z.array(z.string()).default([]),
  rollbackTriggered: z.boolean().default(false)
});

export const compareReadinessSchema = z.object({
  before: productionReadinessInputSchema,
  after: productionReadinessInputSchema
});
