import { z } from 'zod';

export const requirementAuthoritySchema = z.enum(['STATUTORY','REGULATORY','CONTRACTUAL','INTERNAL_POLICY','STANDARD','GUIDANCE','BENCHMARK','ASSUMPTION']);
export const requirementStatusSchema = z.enum(['COMPLIANT','PARTIAL','NON_COMPLIANT','NOT_APPLICABLE','UNKNOWN']);
export const obligationSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(3),
  authority: requirementAuthoritySchema,
  jurisdiction: z.string().optional(),
  sourceRef: z.string().optional(),
  mandatory: z.boolean().default(false),
  applies: z.boolean().default(true),
  rationale: z.string().optional(),
  controls: z.array(z.string()).default([]),
  evidenceRefs: z.array(z.string()).default([]),
  status: requirementStatusSchema.default('UNKNOWN'),
  owner: z.string().optional(),
  dueDate: z.string().optional()
});

export const complianceAssessmentSchema = z.object({
  assessmentId: z.string().min(1),
  projectId: z.string().optional(),
  scope: z.string().min(1),
  obligations: z.array(obligationSchema).min(1),
  evidenceCatalog: z.array(z.object({
    id: z.string().min(1),
    kind: z.enum(['DOCUMENT','TEST','LOG','CONFIG','POLICY','APPROVAL','SCREENSHOT','AUDIT','OTHER']),
    verified: z.boolean().default(false),
    summary: z.string().min(1)
  })).default([]),
  assessedAt: z.string().optional()
});

export const complianceExceptionSchema = z.object({
  exceptionId: z.string().min(1),
  requirementId: z.string().min(1),
  reason: z.string().min(3),
  approver: z.string().min(1),
  expiresAt: z.string().min(1),
  compensatingControls: z.array(z.string()).min(1),
  evidenceRefs: z.array(z.string()).min(1),
  status: z.enum(['PROPOSED','APPROVED','REJECTED','EXPIRED']).default('PROPOSED')
});

export const governanceDecisionSchema = z.object({
  assessment: complianceAssessmentSchema,
  exceptions: z.array(complianceExceptionSchema).default([]),
  policy: z.object({
    blockOnMandatoryNonCompliance: z.boolean().default(true),
    blockOnUnknownMandatory: z.boolean().default(true),
    requireVerifiedEvidenceForCompliance: z.boolean().default(true)
  }).default({
    blockOnMandatoryNonCompliance: true,
    blockOnUnknownMandatory: true,
    requireVerifiedEvidenceForCompliance: true
  })
});

export const compareComplianceAssessmentsSchema = z.object({ before: complianceAssessmentSchema, after: complianceAssessmentSchema });
