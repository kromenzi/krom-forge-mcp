import { z } from 'zod';

export const v57BrainSchema = z.object({
  objective: z.string().min(1),
  now: z.string().default(''),
  projects: z.array(z.object({
    id: z.string().min(1),
    name: z.string().default(''),
    domain: z.string().default('general'),
    status: z.string().default('UNKNOWN'),
    dependencies: z.array(z.string()).default([]),
    constraints: z.array(z.string()).default([]),
    knowledgeRefs: z.array(z.string()).default([])
  })).default([]),
  memories: z.array(z.object({
    id: z.string().min(1),
    projectId: z.string().min(1),
    kind: z.string().default('NOTE'),
    text: z.string().default(''),
    verified: z.boolean().default(false),
    fresh: z.boolean().default(true),
    sequence: z.number().int().nonnegative().default(0),
    tags: z.array(z.string()).default([])
  })).default([]),
  missions: z.array(z.object({
    id: z.string().min(1),
    projectId: z.string().min(1),
    priority: z.number().default(0),
    state: z.enum(['PENDING','RUNNING','BLOCKED','DONE']).default('PENDING'),
    dependsOn: z.array(z.string()).default([]),
    dueOrder: z.number().int().nonnegative().default(0),
    requiresApproval: z.boolean().default(false),
    approved: z.boolean().default(false)
  })).default([]),
  tools: z.array(z.object({
    name: z.string().min(1),
    domain: z.string().default('general'),
    successRate: z.number().min(0).max(1).default(0.5),
    evidenceQuality: z.number().min(0).max(100).default(50),
    latencyMs: z.number().nonnegative().default(1000),
    cost: z.number().nonnegative().default(1),
    evalScore: z.number().min(0).max(100).default(50),
    enabled: z.boolean().default(true),
    tags: z.array(z.string()).default([])
  })).default([]),
  evals: z.array(z.object({
    toolName: z.string().min(1),
    passed: z.boolean(),
    score: z.number().min(0).max(100),
    scenario: z.string().default(''),
    evidenceVerified: z.boolean().default(false)
  })).default([]),
  policies: z.array(z.object({
    id: z.string().min(1),
    action: z.string().default('*'),
    effect: z.enum(['ALLOW','DENY','REQUIRE_APPROVAL']),
    priority: z.number().int().default(0)
  })).default([]),
  skills: z.array(z.object({
    id: z.string().min(1),
    domain: z.string().default('general'),
    steps: z.array(z.string()).default([]),
    evidenceRequirements: z.array(z.string()).default([])
  })).default([]),
  knowledge: z.array(z.object({
    id: z.string().min(1),
    projectId: z.string().min(1),
    kind: z.string().default('FACT'),
    verified: z.boolean().default(false),
    fresh: z.boolean().default(true),
    dependsOn: z.array(z.string()).default([]),
    content: z.string().default('')
  })).default([]),
  contextBudget: z.number().int().positive().default(12),
  portfolioBudget: z.number().nonnegative().default(20)
});
export type V57BrainInput = z.infer<typeof v57BrainSchema>;
