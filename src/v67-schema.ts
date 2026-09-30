import { z } from 'zod';

export const v67ReliabilityRecoverySchema=z.object({
  objective:z.string().min(1),
  evidence:z.array(z.object({
    id:z.string().min(1),verified:z.boolean(),fresh:z.boolean(),confidence:z.number().min(0).max(100)
  })).default([]),
  services:z.array(z.object({
    name:z.string().min(1),
    criticality:z.number().min(0).max(100).default(50),
    healthy:z.boolean().default(true),
    errorRate:z.number().min(0).max(100).optional(),
    latencyMs:z.number().min(0).optional(),
    dependencies:z.array(z.string()).default([]),
    evidenceRefs:z.array(z.string()).default([])
  })).default([]),
  incidents:z.array(z.object({
    id:z.string().min(1),
    services:z.array(z.string()).default([]),
    severity:z.number().min(0).max(100).default(0),
    active:z.boolean().default(true),
    evidenceRefs:z.array(z.string()).default([])
  })).default([]),
  retryState:z.object({
    attempted:z.number().int().min(0).default(0),
    budget:z.number().int().min(0).default(3)
  }).default({attempted:0,budget:3}),
  maxErrorRate:z.number().min(0).max(100).default(5),
  maxLatencyMs:z.number().positive().default(2500)
});

export type V67ReliabilityRecoveryInput=z.infer<typeof v67ReliabilityRecoverySchema>;
