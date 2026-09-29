import { z } from 'zod';

export const v62DecisionSchema = z.object({
  objective:z.string().min(1),
  evidence:z.array(z.object({
    id:z.string().min(1),topic:z.string().default('general'),stance:z.enum(['SUPPORT','OPPOSE','NEUTRAL']).default('NEUTRAL'),
    verified:z.boolean().default(false),fresh:z.boolean().default(true),confidence:z.number().min(0).max(100).default(50),
    sourceQuality:z.number().min(0).max(100).default(50),age:z.number().nonnegative().default(0)
  })).default([]),
  decisions:z.array(z.object({
    id:z.string().min(1),topic:z.string().default('general'),threshold:z.number().min(0).max(100).default(70),
    impact:z.number().min(0).max(100).default(0),reversibility:z.number().min(0).max(100).default(50),
    evidenceRefs:z.array(z.string()).default([])
  })).default([]),
  releases:z.array(z.object({
    id:z.string().min(1),readiness:z.number().min(0).max(100).default(0),risk:z.number().min(0).max(100).default(0),
    confidence:z.number().min(0).max(100).default(50),rollbackReady:z.boolean().default(false)
  })).default([]),
  agents:z.array(z.object({
    id:z.string().min(1),vote:z.enum(['APPROVE','BLOCK','ABSTAIN']).default('ABSTAIN'),
    reliability:z.number().min(0).max(100).default(50),domainFit:z.number().min(0).max(100).default(50)
  })).default([]),
  tools:z.array(z.object({
    name:z.string().min(1),observedAccuracy:z.number().min(0).max(100).default(50),
    evidenceQuality:z.number().min(0).max(100).default(50),sampleSize:z.number().int().nonnegative().default(0),
    uncertainty:z.number().min(0).max(100).default(50)
  })).default([]),
  scenarios:z.array(z.object({
    id:z.string().min(1),releaseId:z.string().optional(),benefit:z.number().default(0),risk:z.number().default(0),
    verification:z.number().min(0).max(100).default(0),reversible:z.boolean().default(false)
  })).default([]),
  dependencies:z.array(z.object({
    from:z.string().min(1),to:z.string().min(1),risk:z.number().min(0).max(100).default(0)
  })).default([]),
  verificationCapacity:z.number().int().nonnegative().default(4),
  confidenceDecayPerAge:z.number().min(0).max(100).default(2)
});
export type V62DecisionInput = z.infer<typeof v62DecisionSchema>;
