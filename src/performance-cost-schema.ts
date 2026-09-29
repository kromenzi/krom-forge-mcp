import { z } from 'zod';
export const performanceSnapshotSchema = z.object({
  project:z.string().min(1),
  environment:z.string().default('unknown'),
  metrics:z.array(z.object({name:z.string(),value:z.number(),unit:z.string(),budget:z.number().optional(),evidenceRef:z.string().optional()})).default([]),
  resources:z.array(z.object({name:z.string(),kind:z.enum(['FUNCTION','DATABASE','BANDWIDTH','STORAGE','BROWSER','BUILD','OTHER']),estimatedCost:z.number().nonnegative().optional(),currency:z.string().default('USD'),usage:z.number().nonnegative().optional(),usageUnit:z.string().optional(),evidenceRef:z.string().optional()})).default([]),
  bundleBytes:z.number().nonnegative().optional(),
  buildSeconds:z.number().nonnegative().optional()
});
export const performanceBudgetSchema = z.object({snapshot:performanceSnapshotSchema, failOnBudgetExceeded:z.boolean().default(true)});
export const costGuardrailSchema = z.object({snapshot:performanceSnapshotSchema, monthlyBudget:z.number().positive(), currency:z.string().default('USD'), warningPercent:z.number().min(1).max(100).default(80)});
export const comparePerformanceSnapshotsSchema = z.object({before:performanceSnapshotSchema,after:performanceSnapshotSchema});
