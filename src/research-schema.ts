import { z } from 'zod';

export const evidenceClassSchema = z.enum([
  'AUTHORITATIVE',
  'COMMON_PRACTICE',
  'BENCHMARK',
  'RECOMMENDATION',
  'ASSUMPTION'
]);

export const sourceRecordSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url().optional(),
  publisher: z.string().optional(),
  publishedAt: z.string().optional(),
  accessedAt: z.string().optional(),
  sourceType: z.enum(['official', 'primary-docs', 'professional-body', 'vendor', 'secondary', 'community', 'internal']).default('secondary'),
  jurisdiction: z.string().optional(),
  excerpt: z.string().optional(),
  notes: z.string().optional(),
  evidenceClass: evidenceClassSchema.optional(),
  confidence: z.number().min(0).max(1).optional(),
  claims: z.array(z.string()).default([])
});

export const researchEvidenceSchema = z.object({
  domain: z.string().min(2),
  objective: z.string().min(3),
  jurisdiction: z.string().optional(),
  industry: z.string().optional(),
  constraints: z.array(z.string()).default([]),
  sources: z.array(sourceRecordSchema).default([]),
  hostNotes: z.array(z.string()).default([])
});

export type ResearchEvidence = z.infer<typeof researchEvidenceSchema>;
export type SourceRecord = z.infer<typeof sourceRecordSchema>;
