import { z } from 'zod';

export const executionActionKindSchema = z.enum([
  'READ_ONLY','SEARCH','ANALYZE','WRITE_FILE','DELETE_FILE','RUN_COMMAND','INSTALL_DEPENDENCY',
  'GIT_COMMIT','GIT_PUSH','CREATE_PR','MERGE_PR','DATABASE_READ','DATABASE_WRITE','DATABASE_MIGRATION',
  'AUTH_CHANGE','SECRET_CHANGE','DEPLOY_PREVIEW','DEPLOY_PRODUCTION','ROLLBACK','DOMAIN_CHANGE',
  'EXTERNAL_MESSAGE','BILLING_CHANGE','DESTRUCTIVE_OTHER','OTHER'
]);

export const executionRiskSchema = z.enum(['LOW','MEDIUM','HIGH','CRITICAL']);
export const executionDecisionSchema = z.enum(['AUTO_EXECUTE','REQUIRE_APPROVAL','BLOCKED']);

export const executionActionSchema = z.object({
  actionId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  kind: executionActionKindSchema,
  target: z.string().optional(),
  environment: z.enum(['LOCAL','PREVIEW','STAGING','PRODUCTION','UNKNOWN']).default('UNKNOWN'),
  reversible: z.boolean().default(true),
  destructive: z.boolean().default(false),
  writesExternalState: z.boolean().default(false),
  changesAuthOrSecrets: z.boolean().default(false),
  affectsBilling: z.boolean().default(false),
  userRequestedExplicitly: z.boolean().default(false),
  hostCanExecute: z.boolean().default(false),
  evidenceAvailable: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([])
});

export const executionPolicySchema = z.object({
  policyId: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.string(),
  allowAutoExecuteKinds: z.array(executionActionKindSchema).default(['READ_ONLY','SEARCH','ANALYZE']),
  alwaysRequireApprovalKinds: z.array(executionActionKindSchema).default([
    'DELETE_FILE','GIT_PUSH','MERGE_PR','DATABASE_WRITE','DATABASE_MIGRATION','AUTH_CHANGE','SECRET_CHANGE',
    'DEPLOY_PRODUCTION','ROLLBACK','DOMAIN_CHANGE','EXTERNAL_MESSAGE','BILLING_CHANGE','DESTRUCTIVE_OTHER'
  ]),
  blockedKinds: z.array(executionActionKindSchema).default([]),
  requireApprovalForProduction: z.boolean().default(true),
  requireApprovalForDestructive: z.boolean().default(true),
  requireApprovalForIrreversible: z.boolean().default(true),
  requireApprovalForExternalState: z.boolean().default(true),
  requireApprovalForAuthOrSecrets: z.boolean().default(true),
  requireApprovalForBilling: z.boolean().default(true),
  notes: z.array(z.string()).default([])
});

export const classifyExecutionActionSchema = z.object({
  action: executionActionSchema,
  policy: executionPolicySchema.optional()
});

export const approvalRecordSchema = z.object({
  approvalId: z.string().min(1),
  actionId: z.string().min(1),
  status: z.enum(['PENDING','APPROVED','DENIED','EXPIRED']),
  requestedAt: z.string(),
  resolvedAt: z.string().optional(),
  scope: z.string().default('single-action'),
  reason: z.string().optional(),
  actor: z.string().optional(),
  evidenceRefs: z.array(z.string()).default([])
});

export const createApprovalRequestSchema = z.object({
  action: executionActionSchema,
  policy: executionPolicySchema.optional(),
  reason: z.string().optional()
});

export const evaluateApprovalSchema = z.object({
  action: executionActionSchema,
  policy: executionPolicySchema.optional(),
  approval: approvalRecordSchema.optional()
});

export const enforceExecutionPolicySchema = z.object({
  actions: z.array(executionActionSchema).min(1),
  policy: executionPolicySchema.optional(),
  approvals: z.array(approvalRecordSchema).default([])
});

export const compareExecutionPoliciesSchema = z.object({
  before: executionPolicySchema,
  after: executionPolicySchema
});
