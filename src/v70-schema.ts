import { z } from 'zod';

export const v70DeliveryVerificationSchema=z.object({
  objective:z.string().min(1),
  nowEpoch:z.number().int().min(0).default(0),
  evidence:z.array(z.object({
    id:z.string().min(1),
    verified:z.boolean(),
    fresh:z.boolean(),
    confidence:z.number().min(0).max(100),
    observedAtEpoch:z.number().int().min(0).optional(),
    kind:z.string().min(1).default('GENERIC')
  })).default([]),
  releases:z.array(z.object({
    id:z.string().min(1),
    services:z.array(z.string()).default([]),
    environment:z.string().min(1).default('production'),
    changeRisk:z.number().min(0).max(100).default(0),
    approved:z.boolean().default(false),
    reversible:z.boolean().default(true),
    evidenceRefs:z.array(z.string()).default([])
  })).default([]),
  services:z.array(z.object({
    name:z.string().min(1),
    healthy:z.boolean().default(true),
    criticality:z.number().min(0).max(100).default(50),
    dependencies:z.array(z.string()).default([]),
    errorRate:z.number().min(0).max(100).optional(),
    latencyMs:z.number().min(0).optional(),
    evidenceRefs:z.array(z.string()).default([])
  })).default([]),
  observations:z.array(z.object({
    id:z.string().min(1),
    releaseId:z.string().min(1),
    service:z.string().min(1),
    phase:z.enum(['PRE_DEPLOY','CANARY','POST_DEPLOY','RECOVERY']),
    healthy:z.boolean(),
    errorRate:z.number().min(0).max(100).optional(),
    latencyMs:z.number().min(0).optional(),
    epoch:z.number().int().min(0),
    evidenceRefs:z.array(z.string()).default([])
  })).default([]),
  verificationChecks:z.array(z.object({
    id:z.string().min(1),
    releaseId:z.string().min(1),
    service:z.string().optional(),
    kind:z.enum(['BUILD','TEST','SECURITY','RUNTIME','SMOKE','CONTRACT','DATA','UI']),
    passed:z.boolean(),
    severity:z.number().min(0).max(100).default(50),
    evidenceRefs:z.array(z.string()).default([])
  })).default([]),
  maxEvidenceAgeSeconds:z.number().int().positive().default(86400),
  maxErrorRate:z.number().min(0).max(100).default(5),
  maxLatencyMs:z.number().positive().default(2500),
  observationWindowSeconds:z.number().int().positive().default(900)
});

export type V70DeliveryVerificationInput=z.infer<typeof v70DeliveryVerificationSchema>;
