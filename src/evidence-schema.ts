import { z } from 'zod';

export const evidenceKindSchema = z.enum([
  'SOURCE','BUILD','TYPECHECK','LINT','TEST','DIFF','RUNTIME','DEPLOYMENT','SECURITY','DATABASE','BROWSER','LOG','SCREENSHOT','COMMAND','API','OTHER'
]);

export const claimTypeSchema = z.enum([
  'BUILD_PASSED','TYPECHECK_PASSED','TESTS_PASSED','FIXED','DEPLOYED','SECURITY_VERIFIED','DATABASE_VERIFIED','UI_VERIFIED','RELEASE_READY','CUSTOM'
]);

export const evidenceArtifactSchema = z.object({
  id: z.string().min(1),
  kind: evidenceKindSchema,
  summary: z.string().min(1),
  source: z.string().min(1),
  verified: z.boolean().default(false),
  observedAt: z.string().optional(),
  reference: z.string().optional(),
  contentHash: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const evidenceClaimSchema = z.object({
  id: z.string().min(1),
  statement: z.string().min(1),
  type: claimTypeSchema,
  requiredKinds: z.array(evidenceKindSchema).default([]),
  evidenceRefs: z.array(z.string()).default([]),
  status: z.enum(['UNSUPPORTED','PARTIAL','SUPPORTED','CONTRADICTED']).default('UNSUPPORTED'),
  notes: z.array(z.string()).default([])
});

export const evidenceBundleSchema = z.object({
  projectId: z.string().min(1),
  scopeKey: z.string().min(1),
  version: z.string().default('33.0.0'),
  createdAt: z.string(),
  updatedAt: z.string(),
  claims: z.array(evidenceClaimSchema).default([]),
  artifacts: z.array(evidenceArtifactSchema).default([])
});

export const createEvidenceBundleSchema = z.object({
  projectId: z.string().min(1),
  scopeKey: z.string().min(1)
});

export const recordClaimInputSchema = z.object({
  bundle: evidenceBundleSchema,
  claim: evidenceClaimSchema.omit({ status: true }).extend({ status: z.enum(['UNSUPPORTED','PARTIAL','SUPPORTED','CONTRADICTED']).optional() })
});

export const recordArtifactInputSchema = z.object({
  bundle: evidenceBundleSchema,
  artifact: evidenceArtifactSchema
});

export const linkClaimEvidenceSchema = z.object({
  bundle: evidenceBundleSchema,
  claimId: z.string().min(1),
  evidenceRefs: z.array(z.string()).min(1)
});

export const verifyClaimInputSchema = z.object({
  bundle: evidenceBundleSchema,
  claimId: z.string().min(1)
});

export const compareEvidenceBundlesSchema = z.object({
  before: evidenceBundleSchema,
  after: evidenceBundleSchema
});
