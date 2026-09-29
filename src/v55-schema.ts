import { z } from 'zod';

export const v55RuntimeSchema = z.object({
  intent: z.string().min(1),
  mode: z.enum(['FAST','STANDARD','DEEP','FORENSIC']).default('STANDARD'),
  budget: z.number().nonnegative().default(100),
  riskTolerance: z.enum(['LOW','MEDIUM','HIGH']).default('MEDIUM'),
  requiredDomains: z.array(z.string()).default([]),
  availableTools: z.array(z.object({
    name: z.string().min(1),
    domain: z.string().default('general'),
    tags: z.array(z.string()).default([]),
    successRate: z.number().min(0).max(1).default(0.5),
    latencyMs: z.number().nonnegative().default(1000),
    cost: z.number().nonnegative().default(1),
    evidenceQuality: z.number().min(0).max(100).default(50),
    failureRate: z.number().min(0).max(1).default(0.5),
    enabled: z.boolean().default(true)
  })).default([]),
  evidence: z.array(z.object({
    id: z.string().min(1),
    source: z.string().default('host'),
    verified: z.boolean().default(false),
    fresh: z.boolean().default(true),
    confidence: z.number().min(0).max(100).default(50),
    dependsOn: z.array(z.string()).default([])
  })).default([]),
  actions: z.array(z.object({
    id: z.string().min(1),
    kind: z.string().default('GENERIC'),
    reversible: z.boolean().default(true),
    requiresApproval: z.boolean().default(false),
    approved: z.boolean().default(false),
    cost: z.number().nonnegative().default(1),
    risk: z.number().min(0).max(100).default(0),
    dependsOn: z.array(z.string()).default([]),
    evidenceRefs: z.array(z.string()).default([])
  })).default([]),
  agents: z.array(z.object({
    id: z.string().min(1),
    role: z.string().default('general'),
    reliability: z.number().min(0).max(100).default(50),
    busy: z.boolean().default(false),
    claims: z.array(z.string()).default([])
  })).default([]),
  providers: z.array(z.object({
    id: z.string().min(1),
    capabilities: z.array(z.string()).default([]),
    latencyMs: z.number().nonnegative().default(1000),
    cost: z.number().nonnegative().default(1),
    quality: z.number().min(0).max(100).default(50),
    local: z.boolean().default(false),
    available: z.boolean().default(true)
  })).default([]),
  signals: z.array(z.object({
    id: z.string().min(1),
    state: z.string().default('UNKNOWN'),
    severity: z.enum(['CRITICAL','HIGH','MEDIUM','LOW']).default('MEDIUM'),
    verified: z.boolean().default(false)
  })).default([]),
  previousState: z.record(z.string(), z.unknown()).default({}),
  checkpoint: z.object({
    id: z.string(),
    completedActionIds: z.array(z.string()).default([]),
    evidenceRefs: z.array(z.string()).default([]),
    stateHash: z.string().optional()
  }).optional()
});
export type V55RuntimeInput = z.infer<typeof v55RuntimeSchema>;
