import { z } from 'zod';
export const v63TrustSchema=z.object({
 objective:z.string().min(1),
 evidence:z.array(z.object({id:z.string().min(1),source:z.string().default('host'),verified:z.boolean().default(false),fresh:z.boolean().default(true),confidence:z.number().min(0).max(100).default(50),parentIds:z.array(z.string()).default([]),artifactHash:z.string().optional()})).default([]),
 attestations:z.array(z.object({id:z.string().min(1),evidenceId:z.string().min(1),issuer:z.string().default('unknown'),verified:z.boolean().default(false),signatureObserved:z.boolean().default(false)})).default([]),
 actors:z.array(z.object({id:z.string().min(1),roles:z.array(z.string()).default([])})).default([]),
 approvals:z.array(z.object({id:z.string().min(1),actorId:z.string().min(1),actionId:z.string().min(1),approved:z.boolean().default(false)})).default([]),
 changes:z.array(z.object({id:z.string().min(1),kind:z.string().default('CHANGE'),risk:z.number().min(0).max(100).default(0),requester:z.string().optional(),approver:z.string().optional(),evidenceRefs:z.array(z.string()).default([])})).default([]),
 policies:z.array(z.object({id:z.string().min(1),actionKind:z.string().default('*'),effect:z.enum(['ALLOW','DENY','REQUIRE_APPROVAL']),priority:z.number().default(0)})).default([]),
 controls:z.array(z.object({id:z.string().min(1),framework:z.string().default('internal'),requirement:z.string().default(''),evidenceRefs:z.array(z.string()).default([])})).default([]),
 waivers:z.array(z.object({id:z.string().min(1),controlId:z.string().min(1),approved:z.boolean().default(false),expires:z.number().int().nonnegative().optional(),reason:z.string().default('')})).default([]),
 artifacts:z.array(z.object({id:z.string().min(1),hash:z.string().default(''),expectedHash:z.string().optional(),verified:z.boolean().default(false)})).default([]),
 releases:z.array(z.object({id:z.string().min(1),changeIds:z.array(z.string()).default([]),risk:z.number().min(0).max(100).default(0),requestedBy:z.string().optional()})).default([]),
 nowEpoch:z.number().int().nonnegative().default(0),
 requiredApprovalCount:z.number().int().positive().default(2)
});
export type V63TrustInput=z.infer<typeof v63TrustSchema>;
