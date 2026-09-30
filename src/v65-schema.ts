import { z } from 'zod';

export const v65IdentityDelegationSchema = z.object({
  objective: z.string().min(1),
  evidence: z.array(z.object({
    id:z.string().min(1), verified:z.boolean().default(false), fresh:z.boolean().default(true),
    confidence:z.number().min(0).max(100).default(50), subjectId:z.string().optional()
  })).default([]),
  principals: z.array(z.object({
    id:z.string().min(1), kind:z.enum(['AGENT','TOOL','PROVIDER','OPERATOR','SERVICE']).default('AGENT'),
    authorityLevel:z.number().int().min(0).max(100).default(50),
    capabilities:z.array(z.string()).default([]), scopes:z.array(z.string()).default(['*']),
    active:z.boolean().default(true), parentPrincipalId:z.string().optional()
  })).default([]),
  delegations: z.array(z.object({
    id:z.string().min(1), delegatorId:z.string().min(1), delegateeId:z.string().min(1),
    capabilities:z.array(z.string()).default([]), scopes:z.array(z.string()).default(['*']),
    maxRisk:z.number().min(0).max(100).default(50), issuedAt:z.number().int().nonnegative().default(0),
    expiresAt:z.number().int().nonnegative().optional(), allowSubdelegation:z.boolean().default(false),
    maxDepth:z.number().int().min(0).max(20).default(0), evidenceRefs:z.array(z.string()).default([]),
    revoked:z.boolean().default(false), breakGlass:z.boolean().default(false)
  })).default([]),
  actions: z.array(z.object({
    id:z.string().min(1), principalId:z.string().min(1), capability:z.string().min(1),
    scope:z.string().default('*'), risk:z.number().min(0).max(100).default(0),
    actingFor:z.string().optional(), delegationId:z.string().optional(), evidenceRefs:z.array(z.string()).default([])
  })).default([]),
  identitySignals: z.array(z.object({
    id:z.string().min(1), principalId:z.string().min(1),
    type:z.enum(['VERIFIED_IDENTITY','IDENTITY_MISMATCH','IMPERSONATION_SIGNAL','AUTHORITY_ANOMALY','MANUAL_REVIEW']),
    severity:z.number().min(0).max(100).default(10), observedAt:z.number().int().nonnegative().default(0),
    evidenceRef:z.string().optional()
  })).default([]),
  revocations: z.array(z.object({
    delegationId:z.string().optional(), principalId:z.string().optional(), reason:z.string().default(''),
    active:z.boolean().default(true), observedAt:z.number().int().nonnegative().default(0)
  })).default([]),
  nowEpoch:z.number().int().nonnegative().default(0),
  maxDelegationDepth:z.number().int().min(1).max(20).default(5),
  breakGlassMaxRisk:z.number().min(0).max(100).default(90)
});
export type V65IdentityDelegationInput = z.infer<typeof v65IdentityDelegationSchema>;
