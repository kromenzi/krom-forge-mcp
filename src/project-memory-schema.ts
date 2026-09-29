import { z } from 'zod';

export const memoryEvidenceSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['SOURCE','BUILD','TEST','DEPLOYMENT','DIFF','RUNTIME','SECURITY','DATABASE','BROWSER','OTHER']),
  summary: z.string().min(1),
  reference: z.string().optional(),
  verified: z.boolean().default(false),
  capturedAt: z.string().optional()
});

export const projectDecisionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  decision: z.string().min(1),
  rationale: z.string().default(''),
  status: z.enum(['ACTIVE','SUPERSEDED','REVOKED']).default('ACTIVE'),
  evidenceIds: z.array(z.string()).default([]),
  createdAt: z.string().optional(),
  supersedesId: z.string().optional()
});

export const projectFailureSchema = z.object({
  id: z.string().min(1),
  category: z.enum(['BUILD','TYPE','TEST','RUNTIME','DATABASE','AUTH','PERMISSION','DEPLOYMENT','UI','INTEGRATION','ENVIRONMENT','OTHER']),
  symptom: z.string().min(1),
  rootCause: z.string().default('UNKNOWN'),
  resolution: z.string().default('UNRESOLVED'),
  status: z.enum(['OPEN','RESOLVED','WONT_FIX']).default('OPEN'),
  attempts: z.array(z.string()).default([]),
  evidenceIds: z.array(z.string()).default([]),
  firstSeenAt: z.string().optional(),
  resolvedAt: z.string().optional()
});

export const projectTestResultSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['UNIT','INTEGRATION','E2E','TYPECHECK','LINT','BUILD','SECURITY','RLS','BROWSER','OTHER']),
  command: z.string().optional(),
  status: z.enum(['PASS','FAIL','NOT_RUN','PASS_WITH_GAPS']),
  summary: z.string().min(1),
  evidenceIds: z.array(z.string()).default([]),
  ranAt: z.string().optional()
});

export const projectDeploymentSchema = z.object({
  id: z.string().min(1),
  provider: z.string().default('unknown'),
  environment: z.enum(['production','preview','development','other']).default('other'),
  url: z.string().optional(),
  version: z.string().optional(),
  commitSha: z.string().optional(),
  status: z.enum(['READY','ERROR','BUILDING','CANCELED','UNKNOWN']).default('UNKNOWN'),
  evidenceIds: z.array(z.string()).default([]),
  deployedAt: z.string().optional()
});

export const projectTaskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(['BACKLOG','READY','IN_PROGRESS','BLOCKED','DONE','CANCELED']).default('BACKLOG'),
  priority: z.enum(['P0','P1','P2','P3','P4','P5']).default('P2'),
  owner: z.string().optional(),
  blockers: z.array(z.string()).default([]),
  evidenceIds: z.array(z.string()).default([])
});

export const projectRiskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  severity: z.enum(['CRITICAL','HIGH','MEDIUM','LOW','INFO']).default('MEDIUM'),
  status: z.enum(['OPEN','MITIGATED','ACCEPTED','CLOSED']).default('OPEN'),
  mitigation: z.string().default(''),
  evidenceIds: z.array(z.string()).default([])
});

export const projectSnapshotMemorySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  summary: z.string().default(''),
  architectureHash: z.string().optional(),
  fileCount: z.number().int().nonnegative().optional(),
  routeCount: z.number().int().nonnegative().optional(),
  dependencyCount: z.number().int().nonnegative().optional(),
  gitRef: z.string().optional(),
  capturedAt: z.string().optional(),
  evidenceIds: z.array(z.string()).default([])
});

export const projectMemorySchema = z.object({
  schemaVersion: z.literal('1').default('1'),
  projectId: z.string().min(1),
  projectName: z.string().min(1),
  scopeKey: z.string().min(1),
  storageMode: z.enum(['PORTABLE','EXTERNAL_PERSISTENCE']).default('PORTABLE'),
  persistenceProvider: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  architectureSummary: z.string().default(''),
  currentVersion: z.string().optional(),
  currentCommitSha: z.string().optional(),
  decisions: z.array(projectDecisionSchema).default([]),
  failures: z.array(projectFailureSchema).default([]),
  evidence: z.array(memoryEvidenceSchema).default([]),
  tests: z.array(projectTestResultSchema).default([]),
  deployments: z.array(projectDeploymentSchema).default([]),
  tasks: z.array(projectTaskSchema).default([]),
  risks: z.array(projectRiskSchema).default([]),
  snapshots: z.array(projectSnapshotMemorySchema).default([]),
  notes: z.array(z.string()).default([])
});

export const projectMemoryCreateSchema = z.object({
  projectId: z.string().min(1),
  projectName: z.string().min(1),
  scopeKey: z.string().min(1),
  architectureSummary: z.string().default(''),
  currentVersion: z.string().optional(),
  currentCommitSha: z.string().optional(),
  storageMode: z.enum(['PORTABLE','EXTERNAL_PERSISTENCE']).default('PORTABLE'),
  persistenceProvider: z.string().optional()
});

export const memoryUpdateSchema = z.object({
  memory: projectMemorySchema,
  architectureSummary: z.string().optional(),
  currentVersion: z.string().optional(),
  currentCommitSha: z.string().optional(),
  notesToAdd: z.array(z.string()).default([])
});

export const recordDecisionInputSchema = z.object({ memory: projectMemorySchema, decision: projectDecisionSchema });
export const recordFailureInputSchema = z.object({ memory: projectMemorySchema, failure: projectFailureSchema });
export const recordEvidenceInputSchema = z.object({ memory: projectMemorySchema, evidence: memoryEvidenceSchema });
export const recordTestInputSchema = z.object({ memory: projectMemorySchema, test: projectTestResultSchema });
export const recordDeploymentInputSchema = z.object({ memory: projectMemorySchema, deployment: projectDeploymentSchema });
export const recordTaskInputSchema = z.object({ memory: projectMemorySchema, task: projectTaskSchema });
export const recordRiskInputSchema = z.object({ memory: projectMemorySchema, risk: projectRiskSchema });
export const recordSnapshotInputSchema = z.object({ memory: projectMemorySchema, snapshot: projectSnapshotMemorySchema });
export const compareMemorySnapshotsSchema = z.object({ before: projectMemorySchema, after: projectMemorySchema });

export type ProjectMemory = z.infer<typeof projectMemorySchema>;
