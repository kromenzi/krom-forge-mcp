import { z } from 'zod';

export const debugEvidenceSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['ERROR','STACK','LOG','HTTP','BUILD','TEST','RUNTIME','BROWSER','DATABASE','AUTH','CONFIG','DIFF','TRACE','METRIC','OTHER']),
  source: z.string().min(1),
  summary: z.string().min(1),
  rawRef: z.string().optional(),
  capturedAt: z.string().optional(),
  verified: z.boolean().default(false)
});

export const debugHypothesisSchema = z.object({
  id: z.string().min(1),
  statement: z.string().min(3),
  predicts: z.array(z.string()).default([]),
  disprovedBy: z.array(z.string()).default([]),
  supportingEvidenceIds: z.array(z.string()).default([]),
  contradictingEvidenceIds: z.array(z.string()).default([]),
  status: z.enum(['OPEN','SUPPORTED','WEAKENED','DISPROVED','CONFIRMED']).default('OPEN')
});

export const debugAttemptSchema = z.object({
  id: z.string().min(1),
  hypothesisId: z.string().optional(),
  action: z.string().min(1),
  result: z.string().default(''),
  outcome: z.enum(['PASS','FAIL','INCONCLUSIVE','NOT_RUN']).default('NOT_RUN'),
  evidenceIds: z.array(z.string()).default([]),
  fingerprint: z.string().optional()
});

export const debugSessionSchema = z.object({
  sessionId: z.string().min(1),
  objective: z.string().min(3),
  symptom: z.string().min(3),
  environment: z.string().default('Unknown'),
  exactError: z.string().default(''),
  reproduction: z.object({
    status: z.enum(['NOT_ATTEMPTED','REPRODUCED','NOT_REPRODUCED','INTERMITTENT']).default('NOT_ATTEMPTED'),
    steps: z.array(z.string()).default([]),
    expected: z.string().default(''),
    actual: z.string().default(''),
    evidenceIds: z.array(z.string()).default([])
  }).default({status:'NOT_ATTEMPTED',steps:[],expected:'',actual:'',evidenceIds:[]}),
  classification: z.array(z.enum(['CODE','CONFIG','DATA','PERMISSION','ENVIRONMENT','DEPENDENCY','DEPLOYMENT','UI','INTEGRATION','DATABASE','AUTH','NETWORK','PERFORMANCE','UNKNOWN'])).default(['UNKNOWN']),
  evidence: z.array(debugEvidenceSchema).default([]),
  hypotheses: z.array(debugHypothesisSchema).default([]),
  attempts: z.array(debugAttemptSchema).default([]),
  rootCause: z.object({
    status: z.enum(['UNKNOWN','PROBABLE','CONFIRMED']).default('UNKNOWN'),
    statement: z.string().default(''),
    evidenceIds: z.array(z.string()).default([])
  }).default({status:'UNKNOWN',statement:'',evidenceIds:[]}),
  fix: z.object({
    status: z.enum(['NOT_PLANNED','PLANNED','APPLIED','REVERTED']).default('NOT_PLANNED'),
    summary: z.string().default(''),
    changedPaths: z.array(z.string()).default([]),
    evidenceIds: z.array(z.string()).default([])
  }).default({status:'NOT_PLANNED',summary:'',changedPaths:[],evidenceIds:[]}),
  verification: z.object({
    focusedCheck: z.enum(['NOT_RUN','PASS','FAIL','INCONCLUSIVE']).default('NOT_RUN'),
    regression: z.enum(['NOT_RUN','PASS','FAIL','INCONCLUSIVE']).default('NOT_RUN'),
    runtime: z.enum(['NOT_RUN','PASS','FAIL','INCONCLUSIVE','NOT_APPLICABLE']).default('NOT_RUN'),
    browser: z.enum(['NOT_RUN','PASS','FAIL','INCONCLUSIVE','NOT_APPLICABLE']).default('NOT_RUN'),
    evidenceIds: z.array(z.string()).default([])
  }).default({focusedCheck:'NOT_RUN',regression:'NOT_RUN',runtime:'NOT_RUN',browser:'NOT_RUN',evidenceIds:[]}),
  blockers: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([])
});

export const createDebugSessionSchema = z.object({
  objective: z.string().min(3),
  symptom: z.string().min(3),
  environment: z.string().optional(),
  exactError: z.string().optional(),
  recentChanges: z.array(z.string()).default([])
});

export const addDebugEvidenceSchema = z.object({ session: debugSessionSchema, evidence: debugEvidenceSchema });
export const addHypothesisSchema = z.object({ session: debugSessionSchema, hypothesis: debugHypothesisSchema });
export const recordAttemptSchema = z.object({ session: debugSessionSchema, attempt: debugAttemptSchema });
export const updateReproductionSchema = z.object({
  session: debugSessionSchema,
  reproduction: debugSessionSchema.shape.reproduction
});
export const setRootCauseSchema = z.object({
  session: debugSessionSchema,
  rootCause: debugSessionSchema.shape.rootCause
});
export const recordFixSchema = z.object({ session: debugSessionSchema, fix: debugSessionSchema.shape.fix });
export const verifyFixSchema = z.object({ session: debugSessionSchema, verification: debugSessionSchema.shape.verification });
