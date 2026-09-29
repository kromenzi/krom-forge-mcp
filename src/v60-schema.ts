import { z } from 'zod';

export const v60MeshSchema = z.object({
  objective: z.string().min(1),
  events: z.array(z.object({
    id:z.string().min(1), stream:z.string().default('default'), sequence:z.number().int().nonnegative().default(0),
    type:z.string().min(1), aggregateId:z.string().default(''), hash:z.string().default(''), processed:z.boolean().default(false)
  })).default([]),
  commands: z.array(z.object({
    id:z.string().min(1), type:z.string().min(1), target:z.string().default(''), idempotencyKey:z.string().default(''),
    policy:z.enum(['ALLOW','DENY','REQUIRE_APPROVAL']).default('ALLOW'), approved:z.boolean().default(false)
  })).default([]),
  workloads: z.array(z.object({
    id:z.string().min(1), priority:z.number().default(0), state:z.enum(['PENDING','RUNNING','BLOCKED','DONE']).default('PENDING'),
    dependsOn:z.array(z.string()).default([]), cost:z.number().nonnegative().default(1), risk:z.number().min(0).max(100).default(0)
  })).default([]),
  agents: z.array(z.object({
    id:z.string().min(1), vote:z.enum(['APPROVE','BLOCK','ABSTAIN']).default('ABSTAIN'),
    reliability:z.number().min(0).max(100).default(50), available:z.boolean().default(true)
  })).default([]),
  tools: z.array(z.object({
    name:z.string().min(1), successRate:z.number().min(0).max(1).default(.5), failures:z.number().int().nonnegative().default(0),
    latencyMs:z.number().nonnegative().default(1000), quality:z.number().min(0).max(100).default(50)
  })).default([]),
  cache: z.array(z.object({
    key:z.string().min(1), deps:z.array(z.string()).default([]), fresh:z.boolean().default(true), confidence:z.number().min(0).max(100).default(50)
  })).default([]),
  changedDeps: z.array(z.string()).default([]),
  sagas: z.array(z.object({
    id:z.string().min(1), state:z.enum(['NEW','RUNNING','COMPENSATING','COMPLETED','FAILED']).default('NEW'),
    steps:z.array(z.object({id:z.string().min(1),done:z.boolean().default(false),compensation:z.string().optional()})).default([])
  })).default([]),
  checkpoints: z.array(z.object({
    id:z.string().min(1), parentId:z.string().optional(), workloadId:z.string().min(1), verified:z.boolean().default(false)
  })).default([]),
  telemetry: z.array(z.object({
    name:z.string().min(1), value:z.number(), target:z.number().optional(), direction:z.enum(['MAX','MIN']).default('MAX')
  })).default([]),
  deadLetters: z.array(z.object({
    id:z.string().min(1), eventId:z.string().min(1), reason:z.string().default('UNKNOWN'), retryable:z.boolean().default(false)
  })).default([]),
  budget:z.number().nonnegative().default(100),
  maxConcurrent:z.number().int().positive().default(4),
  maxEventGap:z.number().int().nonnegative().default(0)
});
export type V60MeshInput = z.infer<typeof v60MeshSchema>;
