import { z } from 'zod';

export const agentIdSchema = z.enum([
  'orchestrator','architect','researcher','backend','frontend','uiux','database','security','qa','devops','release-auditor'
]);

export const agentStatusSchema = z.enum(['PENDING','READY','RUNNING','PASS','PASS_WITH_GAPS','FAIL','BLOCKED']);

export const agentHandoffSchema = z.object({
  fromAgent: agentIdSchema,
  toAgent: agentIdSchema,
  status: agentStatusSchema,
  objective: z.string().min(3),
  changes: z.array(z.string()).default([]),
  evidence: z.array(z.object({
    claim: z.string().min(1),
    proof: z.string().min(1),
    sourceType: z.enum(['web','files','github','vercel','supabase','figma','browser','execution','user','unknown']).default('unknown'),
    verified: z.boolean().default(false)
  })).default([]),
  risks: z.array(z.string()).default([]),
  openItems: z.array(z.string()).default([]),
  blockers: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([])
});

export const agentRunSchema = z.object({
  objective: z.string().min(3),
  existingProject: z.boolean().default(true),
  requestedAgents: z.array(agentIdSchema).default([]),
  availableTools: z.array(z.enum(['web','files','github','vercel','supabase','figma','browser','execution','none'])).default([]),
  constraints: z.array(z.string()).default([]),
  evidenceSummary: z.array(z.string()).default([])
});

export type AgentId = z.infer<typeof agentIdSchema>;
export type AgentHandoff = z.infer<typeof agentHandoffSchema>;
export type AgentRunInput = z.infer<typeof agentRunSchema>;
