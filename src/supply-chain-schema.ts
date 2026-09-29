import { z } from 'zod';
export const dependencySnapshotSchema=z.object({project:z.string(),dependencies:z.array(z.object({name:z.string(),currentVersion:z.string(),latestKnownVersion:z.string().optional(),direct:z.boolean().default(true),runtime:z.boolean().default(true),license:z.string().optional(),deprecated:z.boolean().default(false),securitySeverity:z.enum(['NONE','LOW','MEDIUM','HIGH','CRITICAL','UNKNOWN']).default('UNKNOWN'),evidenceRef:z.string().optional()})).default([])});
export const upgradePlanSchema=z.object({snapshot:dependencySnapshotSchema,targetDependencies:z.array(z.string()).default([]),allowMajor:z.boolean().default(false)});
export const compareDependencySnapshotsSchema=z.object({before:dependencySnapshotSchema,after:dependencySnapshotSchema});
