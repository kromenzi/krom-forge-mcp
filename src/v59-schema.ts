import { z } from 'zod';

export const v59FabricSchema = z.object({
  objective: z.string().min(1),
  nowEpoch: z.number().int().nonnegative().default(0),
  events: z.array(z.object({
    id: z.string().min(1), type: z.string().min(1), key: z.string().default(''),
    sequence: z.number().int().nonnegative().default(0), processed: z.boolean().default(false),
    projectId: z.string().optional(), missionId: z.string().optional(), payloadHash: z.string().default('')
  })).default([]),
  missions: z.array(z.object({
    id: z.string().min(1), projectId: z.string().min(1), owner: z.string().optional(),
    state: z.enum(['PENDING','RUNNING','BLOCKED','DONE']).default('PENDING'),
    dependsOn: z.array(z.string()).default([]), leaseUntil: z.number().int().nonnegative().optional(),
    checkpoint: z.string().optional(), workflowId: z.string().optional(), risk: z.number().min(0).max(100).default(0)
  })).default([]),
  agents: z.array(z.object({
    id: z.string().min(1), skills: z.array(z.string()).default([]), busy: z.boolean().default(false),
    reliability: z.number().min(0).max(100).default(50), inbox: z.array(z.string()).default([])
  })).default([]),
  providers: z.array(z.object({
    id: z.string().min(1), healthy: z.boolean().default(true), latencyMs: z.number().nonnegative().default(1000),
    failures: z.number().int().nonnegative().default(0), successes: z.number().int().nonnegative().default(0),
    cost: z.number().nonnegative().default(1)
  })).default([]),
  tools: z.array(z.object({
    name: z.string().min(1), healthy: z.boolean().default(true), successRate: z.number().min(0).max(1).default(.5),
    latencyMs: z.number().nonnegative().default(1000), failures: z.number().int().nonnegative().default(0),
    capabilities: z.array(z.string()).default([])
  })).default([]),
  workflows: z.array(z.object({
    id: z.string().min(1), steps: z.array(z.object({
      id: z.string().min(1), action: z.string().min(1), dependsOn: z.array(z.string()).default([]),
      compensates: z.string().optional(), reversible: z.boolean().default(true)
    })).default([])
  })).default([]),
  stateRecords: z.array(z.object({
    key: z.string().min(1), version: z.number().int().nonnegative().default(0),
    valueHash: z.string().default(''), adapter: z.string().default('portable'), durable: z.boolean().default(false)
  })).default([]),
  cacheEntries: z.array(z.object({
    key: z.string().min(1), valueHash: z.string().default(''), fresh: z.boolean().default(true),
    confidence: z.number().min(0).max(100).default(50), evidenceRefs: z.array(z.string()).default([])
  })).default([]),
  commands: z.array(z.object({
    id: z.string().min(1), type: z.string().min(1), target: z.string().default(''),
    idempotencyKey: z.string().default(''), approved: z.boolean().default(false)
  })).default([]),
  slo: z.array(z.object({
    name: z.string().min(1), value: z.number(), target: z.number(), direction: z.enum(['MAX','MIN']).default('MAX')
  })).default([]),
  maxInFlight: z.number().int().positive().default(4),
  eventBudget: z.number().int().positive().default(100)
});
export type V59FabricInput = z.infer<typeof v59FabricSchema>;
