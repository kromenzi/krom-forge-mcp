import { z } from 'zod';

export const restorePointSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  label: z.string().min(2),
  createdAt: z.string().min(1),
  sourceType: z.enum(['GIT_COMMIT','DEPLOYMENT','DATABASE_BACKUP','CONFIG_SNAPSHOT','ARTIFACT','MANUAL']),
  sourceRef: z.string().min(1),
  environment: z.string().optional(),
  reversible: z.boolean().default(true),
  evidenceRefs: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([])
});

export const recoveryImpactSchema = z.object({
  projectId: z.string().min(1),
  targetRestorePoint: restorePointSchema,
  affectedAreas: z.array(z.enum(['CODE','DEPLOYMENT','DATABASE','AUTH','CONFIG','STORAGE','CACHE','DNS','SECRETS','OTHER'])).default([]),
  productionImpact: z.boolean().default(false),
  dataLossRisk: z.enum(['NONE','LOW','MEDIUM','HIGH','UNKNOWN']).default('UNKNOWN'),
  downtimeRisk: z.enum(['NONE','LOW','MEDIUM','HIGH','UNKNOWN']).default('UNKNOWN'),
  irreversibleSteps: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
  evidenceRefs: z.array(z.string()).default([])
});

export const recoveryPlanSchema = z.object({
  projectId: z.string().min(1),
  objective: z.string().min(3),
  targetRestorePoint: restorePointSchema,
  impact: recoveryImpactSchema,
  steps: z.array(z.object({
    id: z.string().min(1),
    description: z.string().min(3),
    actionClass: z.enum(['READ','BACKUP','RESTORE','ROLLBACK','VERIFY','CLEANUP']),
    requiresApproval: z.boolean().default(false),
    requiredCapabilities: z.array(z.string()).default([]),
    requiredEvidence: z.array(z.string()).default([]),
    rollbackOfStepId: z.string().optional()
  })).min(1),
  preconditions: z.array(z.string()).default([]),
  abortConditions: z.array(z.string()).default([]),
  postChecks: z.array(z.string()).default([])
});

export const recoveryExecutionSchema = z.object({
  plan: recoveryPlanSchema,
  approvals: z.array(z.object({actionId:z.string(),status:z.enum(['APPROVED','REJECTED','EXPIRED'])})).default([]),
  hostResults: z.array(z.object({
    stepId: z.string(),
    status: z.enum(['PASS','FAIL','BLOCKED','NOT_RUN']),
    evidenceRefs: z.array(z.string()).default([]),
    notes: z.array(z.string()).default([])
  })).default([])
});

export const recoveryVerificationSchema = z.object({
  plan: recoveryPlanSchema,
  checks: z.array(z.object({
    id: z.string(),
    description: z.string(),
    status: z.enum(['PASS','FAIL','NOT_RUN','UNKNOWN']),
    evidenceRefs: z.array(z.string()).default([])
  })).default([]),
  serviceHealthy: z.boolean().optional(),
  targetVersionConfirmed: z.boolean().optional(),
  dataIntegrityConfirmed: z.boolean().optional(),
  unresolvedRisks: z.array(z.string()).default([])
});

export const compareRestorePointsSchema = z.object({
  before: restorePointSchema,
  after: restorePointSchema
});
