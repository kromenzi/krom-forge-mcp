import { z } from 'zod';

export const v58OsSchema = z.object({
  objective: z.string().min(1),
  nowEpoch: z.number().int().nonnegative().default(0),
  missions: z.array(z.object({
    id: z.string().min(1),
    projectId: z.string().min(1),
    state: z.enum(['PENDING','RUNNING','BLOCKED','DONE']).default('PENDING'),
    priority: z.number().default(0),
    dependsOn: z.array(z.string()).default([]),
    leaseOwner: z.string().optional(),
    leaseUntil: z.number().int().nonnegative().optional(),
    idempotencyKey: z.string().optional(),
    cost: z.number().nonnegative().default(1),
    risk: z.number().min(0).max(100).default(0)
  })).default([]),
  projects: z.array(z.object({
    id: z.string().min(1),
    dependencies: z.array(z.string()).default([]),
    budget: z.number().nonnegative().default(0),
    priority: z.number().default(0)
  })).default([]),
  knowledge: z.array(z.object({
    id: z.string().min(1),
    projectId: z.string().min(1),
    subject: z.string().min(1),
    value: z.string().default(''),
    verified: z.boolean().default(false),
    fresh: z.boolean().default(true),
    confidence: z.number().min(0).max(100).default(50),
    source: z.string().default('host')
  })).default([]),
  agents: z.array(z.object({
    id: z.string().min(1),
    skills: z.array(z.string()).default([]),
    reliability: z.number().min(0).max(100).default(50),
    busy: z.boolean().default(false),
    cost: z.number().nonnegative().default(1)
  })).default([]),
  toolOffers: z.array(z.object({
    tool: z.string().min(1),
    domains: z.array(z.string()).default([]),
    capabilities: z.array(z.string()).default([]),
    quality: z.number().min(0).max(100).default(50),
    cost: z.number().nonnegative().default(1),
    available: z.boolean().default(true)
  })).default([]),
  toolDemand: z.array(z.object({
    id: z.string().min(1),
    domain: z.string().default('general'),
    capability: z.string().min(1),
    maxCost: z.number().nonnegative().default(100),
    minQuality: z.number().min(0).max(100).default(0)
  })).default([]),
  signals: z.array(z.object({
    id: z.string().min(1),
    projectId: z.string().optional(),
    severity: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).default('MEDIUM'),
    kind: z.string().default('GENERIC'),
    verified: z.boolean().default(false)
  })).default([]),
  budget: z.number().nonnegative().default(100),
  maxConcurrent: z.number().int().positive().default(4)
});
export type V58OsInput = z.infer<typeof v58OsSchema>;
