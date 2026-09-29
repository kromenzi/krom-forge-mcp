import { z } from 'zod';

export const securitySeveritySchema = z.enum(['CRITICAL','HIGH','MEDIUM','LOW','INFO']);
export const securityStatusSchema = z.enum(['OPEN','MITIGATED','ACCEPTED','FALSE_POSITIVE','UNKNOWN']);
export const securityDomainSchema = z.enum([
  'AUTHENTICATION','AUTHORIZATION','RLS','SECRETS','DEPENDENCIES','INPUT_VALIDATION','SESSION','DATA_PROTECTION','NETWORK','CONFIGURATION','AUDIT','SUPPLY_CHAIN','OTHER'
]);

export const securityFindingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(3),
  domain: securityDomainSchema,
  severity: securitySeveritySchema,
  status: securityStatusSchema.default('OPEN'),
  confidence: z.enum(['HIGH','MEDIUM','LOW']).default('MEDIUM'),
  affectedAssets: z.array(z.string()).default([]),
  description: z.string().min(3),
  exploitability: z.enum(['CONFIRMED','PLAUSIBLE','UNPROVEN','NOT_APPLICABLE']).default('UNPROVEN'),
  evidenceRefs: z.array(z.string()).default([]),
  requiredControls: z.array(z.string()).default([]),
  remediation: z.string().optional()
});

export const securityAssessmentSchema = z.object({
  assessmentId: z.string().min(1),
  projectId: z.string().optional(),
  scope: z.string().min(1),
  findings: z.array(securityFindingSchema).default([]),
  controlEvidence: z.array(z.object({
    control: z.string().min(1),
    status: z.enum(['VERIFIED','PARTIAL','MISSING','NOT_APPLICABLE']),
    evidenceRefs: z.array(z.string()).default([]),
    notes: z.string().optional()
  })).default([]),
  hostVerifiedAt: z.string().optional()
});

export const rlsAuditSchema = z.object({
  tables: z.array(z.object({
    name: z.string().min(1),
    rlsEnabled: z.boolean().optional(),
    policies: z.array(z.object({name:z.string().min(1),command:z.string().optional(),roles:z.array(z.string()).default([])})).default([]),
    negativeTests: z.array(z.object({name:z.string().min(1),status:z.enum(['PASS','FAIL','NOT_RUN']),evidenceRef:z.string().optional()})).default([])
  })).min(1)
});

export const authzAuditSchema = z.object({
  resources: z.array(z.object({
    resource: z.string().min(1),
    actions: z.array(z.string()).min(1),
    roles: z.array(z.string()).default([]),
    serverEnforced: z.boolean().optional(),
    negativeTests: z.array(z.object({scenario:z.string().min(1),status:z.enum(['PASS','FAIL','NOT_RUN']),evidenceRef:z.string().optional()})).default([])
  })).min(1)
});

export const secretsAuditSchema = z.object({
  observations: z.array(z.object({
    location: z.string().min(1),
    kind: z.enum(['ENV','SOURCE','LOG','CLIENT_BUNDLE','CONFIG','CI','OTHER']),
    secretLikeValuePresent: z.boolean(),
    redacted: z.boolean().default(true),
    evidenceRef: z.string().optional()
  })).min(1)
});

export const dependencyAuditSchema = z.object({
  packages: z.array(z.object({
    name: z.string().min(1),
    version: z.string().min(1),
    advisorySeverity: z.enum(['CRITICAL','HIGH','MEDIUM','LOW','NONE','UNKNOWN']).default('UNKNOWN'),
    direct: z.boolean().default(true),
    evidenceRef: z.string().optional()
  })).min(1)
});

export const compareSecurityAssessmentsSchema = z.object({before: securityAssessmentSchema, after: securityAssessmentSchema});
