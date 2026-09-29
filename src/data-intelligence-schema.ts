import { z } from 'zod';

export const dataEntitySchema = z.object({
  name: z.string().min(1),
  rowsEstimate: z.number().nonnegative().optional(),
  primaryKey: z.string().optional(),
  foreignKeys: z.array(z.string()).default([]),
  uniqueConstraints: z.array(z.string()).default([]),
  indexes: z.array(z.string()).default([]),
  sensitiveFields: z.array(z.string()).default([]),
  tenantScoped: z.boolean().default(false)
});

export const databaseSnapshotSchema = z.object({
  project: z.string().min(1),
  engine: z.string().default('unknown'),
  entities: z.array(dataEntitySchema).default([]),
  migrations: z.array(z.object({
    id: z.string(),
    summary: z.string(),
    reversible: z.boolean().default(false),
    destructive: z.boolean().default(false),
    evidenceRef: z.string().optional()
  })).default([]),
  queries: z.array(z.object({
    id: z.string(),
    route: z.string().optional(),
    statementSummary: z.string(),
    latencyMs: z.number().nonnegative().optional(),
    rowsScanned: z.number().nonnegative().optional(),
    usesIndex: z.boolean().optional(),
    evidenceRef: z.string().optional()
  })).default([]),
  integrityEvidence: z.array(z.string()).default([]),
  backupEvidence: z.array(z.string()).default([]),
  rlsEvidence: z.array(z.string()).default([])
});

export const schemaDriftSchema = z.object({
  expected: databaseSnapshotSchema,
  actual: databaseSnapshotSchema
});

export const migrationSafetySchema = z.object({
  project: z.string(),
  migrationId: z.string(),
  destructive: z.boolean().default(false),
  reversible: z.boolean().default(false),
  backupVerified: z.boolean().default(false),
  rollbackTested: z.boolean().default(false),
  affectedEntities: z.array(z.string()).default([]),
  expectedDowntimeSeconds: z.number().nonnegative().optional(),
  evidenceRefs: z.array(z.string()).default([])
});

export const queryAnalysisSchema = z.object({
  project: z.string(),
  queries: databaseSnapshotSchema.shape.queries,
  latencyBudgetMs: z.number().positive().default(500),
  maxRowsScanned: z.number().positive().default(100000)
});

export const dataIntegritySchema = z.object({
  project: z.string(),
  checks: z.array(z.object({
    id: z.string(),
    description: z.string(),
    status: z.enum(['PASS','FAIL','UNKNOWN']),
    evidenceRef: z.string().optional()
  })).default([])
});

export const compareDatabaseSnapshotsSchema = z.object({ before: databaseSnapshotSchema, after: databaseSnapshotSchema });
