import { z } from 'zod';

export const v71ContinuousAssuranceSchema=z.object({
  objective:z.string().min(1), nowEpoch:z.number().int().min(0).default(0),
  evidence:z.array(z.object({id:z.string().min(1),verified:z.boolean(),fresh:z.boolean(),confidence:z.number().min(0).max(100),observedAtEpoch:z.number().int().min(0).optional(),kind:z.string().min(1).default('GENERIC')})).default([]),
  services:z.array(z.object({name:z.string().min(1),criticality:z.number().min(0).max(100).default(50)})).default([]),
  checks:z.array(z.object({id:z.string().min(1),domain:z.string().min(1),passed:z.boolean(),severity:z.number().min(0).max(100).default(50),service:z.string().optional(),lastPassedEpoch:z.number().int().min(0).optional(),evidenceRefs:z.array(z.string()).default([])})).default([]),
  regressions:z.array(z.object({id:z.string().min(1),service:z.string().min(1),risk:z.number().min(0).max(100),active:z.boolean().default(true),evidenceRefs:z.array(z.string()).default([])})).default([]),
  baselines:z.array(z.object({service:z.string().min(1),errorRate:z.number().min(0).max(100).optional(),latencyMs:z.number().min(0).optional(),availability:z.number().min(0).max(100).optional(),observedAtEpoch:z.number().int().min(0),evidenceRefs:z.array(z.string()).default([])})).default([]),
  currentTelemetry:z.array(z.object({service:z.string().min(1),errorRate:z.number().min(0).max(100).optional(),latencyMs:z.number().min(0).optional(),availability:z.number().min(0).max(100).optional(),observedAtEpoch:z.number().int().min(0),evidenceRefs:z.array(z.string()).default([])})).default([]),
  outcomes:z.array(z.object({id:z.string().min(1),kind:z.string().min(1),success:z.boolean(),service:z.string().optional(),evidenceRefs:z.array(z.string()).default([])})).default([]),
  maxEvidenceAgeSeconds:z.number().int().positive().default(86400), verificationStaleSeconds:z.number().int().positive().default(604800),
  maxErrorRateDelta:z.number().min(0).max(100).default(2), maxLatencyDeltaMs:z.number().min(0).default(500), maxAvailabilityDrop:z.number().min(0).max(100).default(0.5)
});
export type V71ContinuousAssuranceInput=z.infer<typeof v71ContinuousAssuranceSchema>;
