import { z } from 'zod';
export const testCaseSchema=z.object({id:z.string(),name:z.string(),type:z.enum(['UNIT','INTEGRATION','E2E','CONTRACT','SECURITY','PERFORMANCE','ACCESSIBILITY','MIGRATION','MANUAL']),covers:z.array(z.string()).default([]),risk:z.enum(['CRITICAL','HIGH','MEDIUM','LOW']).default('MEDIUM'),status:z.enum(['PASS','FAIL','SKIP','NOT_RUN','FLAKY']).default('NOT_RUN'),durationMs:z.number().nonnegative().optional(),evidenceRefs:z.array(z.string()).default([]),failureSignature:z.string().optional()});
export const testSuiteSchema=z.object({project:z.string(),tests:z.array(testCaseSchema).default([]),changedAreas:z.array(z.string()).default([]),criticalAreas:z.array(z.string()).default([])});
export const testSelectionSchema=z.object({suite:testSuiteSchema,maxTests:z.number().int().positive().default(50)});
export const compareTestSuitesSchema=z.object({before:testSuiteSchema,after:testSuiteSchema});
