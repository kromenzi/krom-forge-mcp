import { z } from 'zod';
export const requirementSchema=z.object({id:z.string(),statement:z.string(),source:z.string().default(''),priority:z.enum(['MUST','SHOULD','COULD']).default('MUST'),acceptanceCriteria:z.array(z.string()).default([]),designRefs:z.array(z.string()).default([]),codeRefs:z.array(z.string()).default([]),testRefs:z.array(z.string()).default([]),evidenceRefs:z.array(z.string()).default([]),releaseRefs:z.array(z.string()).default([]),status:z.enum(['PROPOSED','APPROVED','IMPLEMENTED','VERIFIED','REJECTED']).default('PROPOSED')});
export const traceabilityModelSchema=z.object({project:z.string(),requirements:z.array(requirementSchema).min(1)});
export const compareTraceabilitySchema=z.object({before:traceabilityModelSchema,after:traceabilityModelSchema});
