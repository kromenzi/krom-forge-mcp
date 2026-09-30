import { z } from 'zod';

export const v66AutonomousVerificationSchema = z.object({
  objective: z.string().min(1),
  evidence: z.array(z.object({
    id: z.string().min(1),
    verified: z.boolean().default(false),
    fresh: z.boolean().default(true),
    confidence: z.number().min(0).max(100).default(50)
  })).default([]),
  tools: z.array(z.object({
    name: z.string().min(1),
    enabled: z.boolean().default(true),
    capabilities: z.array(z.string()).default([]),
    latencyMs: z.number().nonnegative().optional(),
    errorRate: z.number().min(0).max(100).optional(),
    lastSuccessEpoch: z.number().int().nonnegative().optional(),
    evidenceRefs: z.array(z.string()).default([])
  })).default([]),
  checks: z.array(z.object({
    id: z.string().min(1),
    type: z.enum(['REGISTRY','SCHEMA','HTTP','SMOKE','LATENCY','ERROR_RATE','CAPABILITY']),
    passed: z.boolean(),
    severity: z.number().min(0).max(100).default(50),
    toolName: z.string().optional(),
    evidenceRefs: z.array(z.string()).default([])
  })).default([]),
  expectedTools: z.array(z.string()).default([]),
  maxLatencyMs: z.number().positive().default(2500),
  maxErrorRate: z.number().min(0).max(100).default(5),
  staleAfterSeconds: z.number().int().positive().default(86400),
  nowEpoch: z.number().int().nonnegative().default(0)
});

export type V66AutonomousVerificationInput = z.infer<typeof v66AutonomousVerificationSchema>;
