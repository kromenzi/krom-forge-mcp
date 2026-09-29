import { z } from 'zod';

export const runtimeSignalSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['HEALTH','LOG','METRIC','TRACE','ERROR','DEPLOYMENT','USER_REPORT','SYNTHETIC']),
  source: z.string().min(1),
  environment: z.string().default('unknown'),
  timestamp: z.string().optional(),
  severity: z.enum(['INFO','WARN','ERROR','CRITICAL']).default('INFO'),
  message: z.string().min(1),
  value: z.number().optional(),
  unit: z.string().optional(),
  tags: z.record(z.string(), z.string()).default({}),
  evidenceRef: z.string().optional(),
  verified: z.boolean().default(false)
});

export const observabilitySnapshotSchema = z.object({
  projectId: z.string().min(1),
  environment: z.string().default('production'),
  windowStart: z.string().optional(),
  windowEnd: z.string().optional(),
  signals: z.array(runtimeSignalSchema).default([]),
  serviceTargets: z.array(z.object({name:z.string(), expected:z.string().optional()})).default([]),
  notes: z.array(z.string()).default([])
});

export const serviceHealthInputSchema = z.object({
  snapshot: observabilitySnapshotSchema,
  requiredChecks: z.array(z.string()).default([]),
  criticalServices: z.array(z.string()).default([])
});

export const anomalyInputSchema = z.object({
  snapshot: observabilitySnapshotSchema,
  baseline: observabilitySnapshotSchema.optional(),
  thresholds: z.record(z.string(), z.number()).default({})
});

export const incidentCorrelationSchema = z.object({
  snapshot: observabilitySnapshotSchema,
  deploymentIds: z.array(z.string()).default([]),
  changeRefs: z.array(z.string()).default([]),
  debugSessionRefs: z.array(z.string()).default([])
});

export const sloInputSchema = z.object({
  name: z.string().min(1),
  targetPercent: z.number().min(0).max(100),
  goodEvents: z.number().nonnegative(),
  totalEvents: z.number().positive(),
  window: z.string().min(1)
});

export const compareObservabilitySnapshotsSchema = z.object({
  before: observabilitySnapshotSchema,
  after: observabilitySnapshotSchema
});
