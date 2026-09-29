import { z } from 'zod';

export const fileEntrySchema = z.object({
  path: z.string().min(1),
  size: z.number().nonnegative().optional(),
  kind: z.enum(['file', 'directory']).optional(),
  sha: z.string().optional()
});

export const routeEntrySchema = z.object({
  path: z.string().min(1),
  file: z.string().optional(),
  methods: z.array(z.string()).optional(),
  status: z.enum(['known-good', 'suspect', 'broken', 'unknown']).optional(),
  evidence: z.string().optional()
});

export const diagnosticEntrySchema = z.object({
  source: z.string().optional(),
  severity: z.enum(['error', 'warning', 'info']).optional(),
  file: z.string().optional(),
  message: z.string().min(1)
});

export const projectSnapshotSchema = z.object({
  projectName: z.string().optional(),
  root: z.string().optional(),
  framework: z.string().optional(),
  language: z.string().optional(),
  files: z.array(fileEntrySchema).default([]),
  packageManifest: z.object({
    name: z.string().optional(),
    version: z.string().optional(),
    scripts: z.record(z.string(), z.string()).optional(),
    dependencies: z.record(z.string(), z.string()).optional(),
    devDependencies: z.record(z.string(), z.string()).optional(),
    engines: z.record(z.string(), z.string()).optional()
  }).optional(),
  routes: z.array(routeEntrySchema).optional(),
  configs: z.record(z.string(), z.unknown()).optional(),
  git: z.object({
    branch: z.string().optional(),
    head: z.string().optional(),
    dirty: z.boolean().optional(),
    changedFiles: z.array(z.string()).optional(),
    recentCommits: z.array(z.object({ sha: z.string().optional(), message: z.string().optional() })).optional()
  }).optional(),
  diagnostics: z.array(diagnosticEntrySchema).optional(),
  database: z.object({
    provider: z.string().optional(),
    migrationFiles: z.array(z.string()).optional(),
    schemaFiles: z.array(z.string()).optional(),
    rlsEvidence: z.array(z.string()).optional()
  }).optional(),
  auth: z.object({
    provider: z.string().optional(),
    evidenceFiles: z.array(z.string()).optional()
  }).optional(),
  buildEvidence: z.object({
    command: z.string().optional(),
    exitCode: z.number().int().optional(),
    summary: z.string().optional()
  }).optional(),
  testEvidence: z.array(z.object({
    command: z.string().optional(),
    exitCode: z.number().int().optional(),
    summary: z.string().optional()
  })).optional()
});
