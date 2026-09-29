import { z } from 'zod';

export const capabilityCategorySchema = z.enum([
  'web','files','github','vercel','supabase','figma','browser','execution','image','database','deployment','design','other'
]);

export const hostCapabilitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: capabilityCategorySchema,
  connected: z.boolean().default(true),
  authenticated: z.boolean().default(true),
  operations: z.array(z.enum(['read','write','execute','search','inspect','deploy','verify'])).default([]),
  evidenceKinds: z.array(z.string()).default([]),
  limitations: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.unknown()).default({})
});

export const hostCapabilitySnapshotSchema = z.object({
  schemaVersion: z.literal('1').default('1'),
  hostId: z.string().min(1),
  hostType: z.enum(['CHATGPT','CODEX','CUSTOM_MCP_HOST','OTHER']),
  capturedAt: z.string(),
  capabilities: z.array(hostCapabilitySchema).default([]),
  globalLimitations: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([])
});

export const capabilityRequirementSchema = z.object({
  category: capabilityCategorySchema,
  operation: z.enum(['read','write','execute','search','inspect','deploy','verify']).optional(),
  evidenceKind: z.string().optional(),
  required: z.boolean().default(true),
  reason: z.string().min(1)
});

export const assessCapabilityRequirementsSchema = z.object({
  snapshot: hostCapabilitySnapshotSchema,
  requirements: z.array(capabilityRequirementSchema).min(1)
});

export const adaptLoopToHostSchema = z.object({
  snapshot: hostCapabilitySnapshotSchema,
  loop: z.any()
});

export const compareHostSnapshotsSchema = z.object({
  before: hostCapabilitySnapshotSchema,
  after: hostCapabilitySnapshotSchema
});
