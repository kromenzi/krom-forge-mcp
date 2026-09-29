import { z } from 'zod';

export const v56RuntimeSchema = z.object({
  missionId: z.string().min(1).default('mission'),
  objective: z.string().min(1),
  memory: z.array(z.object({
    id: z.string().min(1),
    kind: z.string().default('NOTE'),
    content: z.string().default(''),
    verified: z.boolean().default(false),
    sequence: z.number().int().nonnegative().default(0),
    evidenceRefs: z.array(z.string()).default([])
  })).default([]),
  failures: z.array(z.object({
    id: z.string().min(1),
    class: z.string().default('UNKNOWN'),
    actionId: z.string().optional(),
    signature: z.string().default(''),
    retryable: z.boolean().default(true),
    providerId: z.string().optional(),
    toolName: z.string().optional()
  })).default([]),
  attempts: z.array(z.object({
    id: z.string().min(1),
    actionId: z.string().min(1),
    signature: z.string().default(''),
    success: z.boolean().default(false),
    providerId: z.string().optional(),
    toolName: z.string().optional(),
    cost: z.number().nonnegative().default(0)
  })).default([]),
  retryBudget: z.object({
    maxAttempts: z.number().int().positive().default(3),
    maxCost: z.number().nonnegative().default(20)
  }).default({ maxAttempts: 3, maxCost: 20 }),
  providers: z.array(z.object({
    id: z.string().min(1),
    capabilities: z.array(z.string()).default([]),
    failures: z.number().int().nonnegative().default(0),
    successes: z.number().int().nonnegative().default(0),
    circuit: z.enum(['CLOSED','OPEN','HALF_OPEN']).default('CLOSED'),
    quality: z.number().min(0).max(100).default(50),
    latencyMs: z.number().nonnegative().default(1000),
    cost: z.number().nonnegative().default(1),
    available: z.boolean().default(true)
  })).default([]),
  tools: z.array(z.object({
    name: z.string().min(1),
    domain: z.string().default('general'),
    description: z.string().default(''),
    tags: z.array(z.string()).default([]),
    deprecated: z.boolean().default(false),
    successRate: z.number().min(0).max(1).default(0.5)
  })).default([]),
  agents: z.array(z.object({
    id: z.string().min(1),
    vote: z.enum(['APPROVE','BLOCK','ABSTAIN']).default('ABSTAIN'),
    reliability: z.number().min(0).max(100).default(50),
    evidenceRefs: z.array(z.string()).default([])
  })).default([]),
  policies: z.array(z.object({
    id: z.string().min(1),
    effect: z.enum(['ALLOW','DENY','REQUIRE_APPROVAL']),
    actionKinds: z.array(z.string()).default([]),
    minEvidence: z.number().int().nonnegative().default(0),
    priority: z.number().int().default(0)
  })).default([]),
  previousPolicies: z.array(z.object({
    id: z.string().min(1),
    effect: z.enum(['ALLOW','DENY','REQUIRE_APPROVAL']),
    actionKinds: z.array(z.string()).default([]),
    minEvidence: z.number().int().nonnegative().default(0),
    priority: z.number().int().default(0)
  })).default([]),
  evidence: z.array(z.object({
    id: z.string().min(1),
    verified: z.boolean().default(false),
    fresh: z.boolean().default(true),
    source: z.string().default('host'),
    dependsOn: z.array(z.string()).default([]),
    confidence: z.number().min(0).max(100).default(50)
  })).default([]),
  changedEvidenceIds: z.array(z.string()).default([]),
  actions: z.array(z.object({
    id: z.string().min(1),
    kind: z.string().default('GENERIC'),
    dependsOn: z.array(z.string()).default([]),
    evidenceRefs: z.array(z.string()).default([]),
    reversible: z.boolean().default(true),
    risk: z.number().min(0).max(100).default(0)
  })).default([]),
  metrics: z.array(z.object({
    name: z.string().min(1),
    value: z.number(),
    threshold: z.number().optional(),
    direction: z.enum(['MAX','MIN']).default('MAX')
  })).default([])
});

export type V56RuntimeInput = z.infer<typeof v56RuntimeSchema>;
