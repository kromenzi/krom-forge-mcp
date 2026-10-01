import { z } from 'zod';

export const v68IncidentCommandSchema=z.object({
  objective:z.string().min(1),
  evidence:z.array(z.object({
    id:z.string().min(1),
    verified:z.boolean(),
    fresh:z.boolean(),
    confidence:z.number().min(0).max(100)
  })).default([]),
  services:z.array(z.object({
    name:z.string().min(1),
    criticality:z.number().min(0).max(100).default(50),
    healthy:z.boolean().default(true),
    dependencies:z.array(z.string()).default([]),
    evidenceRefs:z.array(z.string()).default([])
  })).default([]),
  incidents:z.array(z.object({
    id:z.string().min(1),
    severity:z.number().min(0).max(100).default(0),
    active:z.boolean().default(true),
    services:z.array(z.string()).default([]),
    startedAtEpoch:z.number().int().min(0).optional(),
    evidenceRefs:z.array(z.string()).default([])
  })).default([]),
  events:z.array(z.object({
    id:z.string().min(1),
    incidentId:z.string().min(1),
    type:z.enum(['DETECTED','ESCALATED','CONTAINED','RECOVERY_STARTED','RECOVERED','VERIFIED']),
    epoch:z.number().int().min(0),
    evidenceRefs:z.array(z.string()).default([])
  })).default([]),
  approvals:z.array(z.object({
    id:z.string().min(1),
    action:z.string().min(1),
    approved:z.boolean(),
    evidenceRefs:z.array(z.string()).default([])
  })).default([]),
  nowEpoch:z.number().int().min(0).default(0),
  escalationSeverity:z.number().min(0).max(100).default(80)
});

export type V68IncidentCommandInput=z.infer<typeof v68IncidentCommandSchema>;
