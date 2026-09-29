import { z } from 'zod';

export const uiSeveritySchema = z.enum(['CRITICAL','HIGH','MEDIUM','LOW','INFO']);
export const uiCategorySchema = z.enum([
  'HIERARCHY','NAVIGATION','RESPONSIVE','MOBILE','RTL','LTR','ACCESSIBILITY','FORM','TABLE','DIALOG','DRAWER','FEEDBACK','EMPTY_STATE','ERROR_STATE','LOADING_STATE','COLOR','TYPOGRAPHY','SPACING','MOTION','PERFORMANCE','PRINT','CONSISTENCY'
]);

export const uiObservationSchema = z.object({
  id: z.string().min(1),
  route: z.string().min(1),
  viewport: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }).optional(),
  locale: z.string().optional(),
  direction: z.enum(['RTL','LTR']).optional(),
  category: uiCategorySchema,
  severity: uiSeveritySchema,
  element: z.string().optional(),
  issue: z.string().min(3),
  expected: z.string().optional(),
  evidenceRef: z.string().optional(),
  source: z.enum(['BROWSER','SCREENSHOT','DOM','ACCESSIBILITY_TREE','CONSOLE','HOST_OBSERVATION','CODE']).default('HOST_OBSERVATION')
});

export const uiAuditInputSchema = z.object({
  product: z.string().min(2),
  routes: z.array(z.string()).default([]),
  observations: z.array(uiObservationSchema).default([]),
  supportedLocales: z.array(z.string()).default([]),
  requireMobile: z.boolean().default(true),
  requireRtl: z.boolean().default(false),
  requireAccessibility: z.boolean().default(true),
  designIntent: z.string().optional()
});

export const designSystemInputSchema = z.object({
  product: z.string().min(2),
  styleDirection: z.string().optional(),
  existingTokens: z.record(z.string(), z.any()).optional(),
  requirements: z.array(z.string()).default([]),
  bilingualArabicEnglish: z.boolean().default(false)
});

export const uiStateSnapshotSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  observations: z.array(uiObservationSchema).default([]),
  routes: z.array(z.string()).default([]),
  capturedAt: z.string().optional()
});

export const compareUiStatesSchema = z.object({
  before: uiStateSnapshotSchema,
  after: uiStateSnapshotSchema
});

export const uiFixPlanSchema = z.object({
  audit: uiAuditInputSchema,
  allowedPaths: z.array(z.string()).default([]),
  constraints: z.array(z.string()).default([])
});
