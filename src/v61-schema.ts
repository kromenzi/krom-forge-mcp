import { z } from 'zod';

export const v61GridSchema = z.object({
  objective:z.string().min(1),
  projects:z.array(z.object({
    id:z.string().min(1),priority:z.number().default(0),capacity:z.number().nonnegative().default(1),
    dependencies:z.array(z.string()).default([]),risk:z.number().min(0).max(100).default(0)
  })).default([]),
  missions:z.array(z.object({
    id:z.string().min(1),projectId:z.string().min(1),priority:z.number().default(0),
    impact:z.number().min(0).max(100).default(0),risk:z.number().min(0).max(100).default(0),
    dependsOn:z.array(z.string()).default([]),state:z.enum(['PENDING','RUNNING','BLOCKED','DONE']).default('PENDING')
  })).default([]),
  evidence:z.array(z.object({
    id:z.string().min(1),claim:z.string().default(''),source:z.string().default('host'),
    verified:z.boolean().default(false),fresh:z.boolean().default(true),confidence:z.number().min(0).max(100).default(50),
    parentIds:z.array(z.string()).default([])
  })).default([]),
  policies:z.array(z.object({
    id:z.string().min(1),action:z.string().default('*'),
    effect:z.enum(['ALLOW','DENY','REQUIRE_APPROVAL']),priority:z.number().default(0)
  })).default([]),
  anomalies:z.array(z.object({
    id:z.string().min(1),projectId:z.string().optional(),kind:z.string().default('GENERIC'),
    severity:z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).default('MEDIUM'),
    signature:z.string().default(''),evidenceRefs:z.array(z.string()).default([])
  })).default([]),
  agents:z.array(z.object({
    id:z.string().min(1),skills:z.array(z.string()).default([]),
    reliability:z.number().min(0).max(100).default(50),available:z.boolean().default(true),cost:z.number().nonnegative().default(1)
  })).default([]),
  tools:z.array(z.object({
    name:z.string().min(1),capabilities:z.array(z.string()).default([]),
    quality:z.number().min(0).max(100).default(50),successRate:z.number().min(0).max(1).default(.5),
    latencyMs:z.number().nonnegative().default(1000),cost:z.number().nonnegative().default(1)
  })).default([]),
  releases:z.array(z.object({
    id:z.string().min(1),projectId:z.string().min(1),risk:z.number().min(0).max(100).default(0),
    readiness:z.number().min(0).max(100).default(0),dependsOn:z.array(z.string()).default([])
  })).default([]),
  decisions:z.array(z.object({
    id:z.string().min(1),kind:z.string().default('DECISION'),projectId:z.string().optional(),
    rationale:z.string().default(''),evidenceRefs:z.array(z.string()).default([])
  })).default([]),
  budget:z.number().nonnegative().default(100)
});
export type V61GridInput = z.infer<typeof v61GridSchema>;
