import { z } from 'zod';

export const loopPhaseSchema = z.enum(['INTAKE','INSPECT','RESEARCH','PLAN','AGENTS','PATCH','DEBUG','UIUX','VERIFY','EVIDENCE','RELEASE','DONE','BLOCKED']);
export const loopStatusSchema = z.enum(['READY','RUNNING','WAITING_FOR_HOST','BLOCKED','FAILED','DONE']);

export const loopEvidenceSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  summary: z.string().min(1),
  source: z.string().min(1),
  verified: z.boolean().default(false)
});

export const loopStepSchema = z.object({
  id: z.string().min(1),
  phase: loopPhaseSchema,
  title: z.string().min(1),
  status: loopStatusSchema.default('READY'),
  requiredTools: z.array(z.string()).default([]),
  requiredEvidence: z.array(z.string()).default([]),
  agent: z.string().optional(),
  attempts: z.number().int().nonnegative().default(0),
  blockers: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([])
});

export const autonomousLoopSchema = z.object({
  schemaVersion: z.literal('1').default('1'),
  runId: z.string().min(1),
  projectId: z.string().min(1),
  objective: z.string().min(3),
  status: loopStatusSchema,
  currentPhase: loopPhaseSchema,
  currentStepId: z.string().nullable(),
  maxAttemptsPerStep: z.number().int().min(1).max(10).default(3),
  createdAt: z.string(),
  updatedAt: z.string(),
  steps: z.array(loopStepSchema),
  evidence: z.array(loopEvidenceSchema).default([]),
  blockers: z.array(z.string()).default([]),
  decisions: z.array(z.string()).default([])
});

export const createAutonomousLoopSchema = z.object({
  projectId: z.string().min(1),
  objective: z.string().min(3),
  existingProject: z.boolean().default(true),
  researchRequired: z.boolean().default(true),
  uiWork: z.boolean().default(false),
  deploymentInScope: z.boolean().default(true),
  maxAttemptsPerStep: z.number().int().min(1).max(10).default(3)
});

export const advanceLoopSchema = z.object({
  loop: autonomousLoopSchema,
  completedStepId: z.string().optional(),
  failedStepId: z.string().optional(),
  blockers: z.array(z.string()).default([]),
  evidence: z.array(loopEvidenceSchema).default([]),
  notes: z.array(z.string()).default([])
});

export const loopHostResultSchema = z.object({
  loop: autonomousLoopSchema,
  stepId: z.string().min(1),
  success: z.boolean(),
  evidence: z.array(loopEvidenceSchema).default([]),
  errors: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([])
});
