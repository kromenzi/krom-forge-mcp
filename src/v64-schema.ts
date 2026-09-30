import { z } from 'zod';

export const v64TrustRuntimeSchema = z.object({
  objective: z.string().min(1),
  evidence: z.array(z.object({
    id: z.string().min(1),
    verified: z.boolean().default(false),
    fresh: z.boolean().default(true),
    confidence: z.number().min(0).max(100).default(50)
  })).default([]),
  principals: z.array(z.object({
    id: z.string().min(1),
    kind: z.enum(['AGENT','TOOL','PROVIDER','OPERATOR']).default('AGENT'),
    baselineTrust: z.number().min(0).max(100).default(50),
    capabilities: z.array(z.string()).default([]),
    allowedScopes: z.array(z.string()).default(['*']),
    suspended: z.boolean().default(false)
  })).default([]),
  sessions: z.array(z.object({
    id: z.string().min(1),
    principalId: z.string().min(1),
    requestedCapabilities: z.array(z.string()).default([]),
    scope: z.string().default('*'),
    evidenceRefs: z.array(z.string()).default([]),
    risk: z.number().min(0).max(100).default(0),
    startedAt: z.number().int().nonnegative().default(0),
    lastSeenAt: z.number().int().nonnegative().default(0)
  })).default([]),
  signals: z.array(z.object({
    id: z.string().min(1),
    principalId: z.string().min(1),
    type: z.enum(['SUCCESS','FAILURE','POLICY_VIOLATION','ANOMALY','VERIFIED_RESULT','MANUAL_REVIEW']),
    weight: z.number().min(0).max(100).default(10),
    observedAt: z.number().int().nonnegative().default(0),
    evidenceRef: z.string().optional()
  })).default([]),
  policies: z.array(z.object({
    id: z.string().min(1),
    capability: z.string().default('*'),
    scope: z.string().default('*'),
    minTrust: z.number().min(0).max(100).default(60),
    maxRisk: z.number().min(0).max(100).default(50),
    requireFreshEvidence: z.boolean().default(true),
    effect: z.enum(['ALLOW','DENY','REVIEW']).default('REVIEW'),
    priority: z.number().default(0)
  })).default([]),
  grants: z.array(z.object({
    principalId: z.string().min(1),
    capability: z.string().min(1),
    scope: z.string().default('*'),
    expires: z.number().int().nonnegative().optional()
  })).default([]),
  revocations: z.array(z.object({
    principalId: z.string().min(1),
    capability: z.string().optional(),
    reason: z.string().default(''),
    active: z.boolean().default(true)
  })).default([]),
  actions: z.array(z.object({
    id: z.string().min(1),
    sessionId: z.string().min(1),
    capability: z.string().min(1),
    scope: z.string().default('*'),
    risk: z.number().min(0).max(100).default(0),
    evidenceRefs: z.array(z.string()).default([])
  })).default([]),
  nowEpoch: z.number().int().nonnegative().default(0),
  trustDecayPerHour: z.number().min(0).max(20).default(0.25),
  sessionMaxIdleSeconds: z.number().int().positive().default(1800),
  trustBudgetBase: z.number().min(1).max(1000).default(100)
});

export type V64TrustRuntimeInput = z.infer<typeof v64TrustRuntimeSchema>;
