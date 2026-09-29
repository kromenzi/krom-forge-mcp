import { z } from 'zod';

export const fileChangeSchema = z.object({
  path: z.string().min(1),
  action: z.enum(['CREATE','MODIFY','DELETE','RENAME']),
  reason: z.string().default(''),
  beforeHash: z.string().optional(),
  afterHash: z.string().optional(),
  additions: z.number().int().nonnegative().optional(),
  deletions: z.number().int().nonnegative().optional(),
  diffSummary: z.string().optional()
});

export const patchRequestSchema = z.object({
  objective: z.string().min(3),
  existingProject: z.boolean().default(true),
  allowedPaths: z.array(z.string()).default([]),
  forbiddenPaths: z.array(z.string()).default([]),
  proposedChanges: z.array(fileChangeSchema).default([]),
  constraints: z.array(z.string()).default([]),
  databaseImpact: z.enum(['NONE','READ_ONLY','SCHEMA','DATA','UNKNOWN']).default('UNKNOWN'),
  authImpact: z.enum(['NONE','LOW','MEDIUM','HIGH','UNKNOWN']).default('UNKNOWN'),
  deploymentImpact: z.enum(['NONE','LOW','MEDIUM','HIGH','UNKNOWN']).default('UNKNOWN')
});

export const diffReviewSchema = z.object({
  objective: z.string().min(3),
  allowedPaths: z.array(z.string()).default([]),
  forbiddenPaths: z.array(z.string()).default([]),
  changes: z.array(fileChangeSchema).default([]),
  diagnostics: z.array(z.object({
    source: z.string().default('unknown'),
    severity: z.enum(['INFO','WARNING','ERROR','FATAL']).default('INFO'),
    message: z.string(),
    file: z.string().optional(),
    line: z.number().int().positive().optional()
  })).default([]),
  build: z.object({ status: z.enum(['PASS','FAIL','NOT_RUN','UNKNOWN']).default('UNKNOWN'), evidence: z.string().default('') }).default({ status: 'UNKNOWN', evidence: '' }),
  tests: z.object({ status: z.enum(['PASS','FAIL','NOT_RUN','UNKNOWN']).default('UNKNOWN'), evidence: z.string().default('') }).default({ status: 'UNKNOWN', evidence: '' })
});

export type PatchRequest = z.infer<typeof patchRequestSchema>;
export type DiffReview = z.infer<typeof diffReviewSchema>;
