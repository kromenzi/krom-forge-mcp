import { z } from 'zod';

export const missionStageSchema = z.enum(['INTAKE','CONTEXT','PLAN','IMPLEMENT','VERIFY','RELEASE','OBSERVE','COMPLETE']);
export const missionStatusSchema = z.enum(['PENDING','READY','IN_PROGRESS','BLOCKED','DONE','FAILED']);
export const gateStatusSchema = z.enum(['PASS','PASS_WITH_GAPS','FAIL','UNKNOWN','NOT_APPLICABLE']);

export const missionGateSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['PLAN','ARCHITECTURE','SECURITY','COMPLIANCE','DATA','API','TEST','PERFORMANCE','EVIDENCE','RECOVERY','RUNTIME','RELEASE','OTHER']),
  status: gateStatusSchema,
  required: z.boolean().default(true),
  evidenceRefs: z.array(z.string()).default([]),
  blockers: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([])
});

export const missionActionSchema = z.object({
  id: z.string().min(1),
  stage: missionStageSchema,
  description: z.string().min(1),
  capability: z.string().min(1),
  mutatesExternalState: z.boolean().default(false),
  requiresApproval: z.boolean().default(false),
  requiredEvidence: z.array(z.string()).default([]),
  dependsOn: z.array(z.string()).default([]),
  status: z.enum(['PENDING','READY','RUNNING','PASS','FAIL','BLOCKED','SKIPPED']).default('PENDING')
});

export const engineeringMissionSchema = z.object({
  missionId: z.string().min(1),
  projectId: z.string().min(1),
  objective: z.string().min(3),
  createdAt: z.string().optional(),
  currentStage: missionStageSchema.default('INTAKE'),
  status: missionStatusSchema.default('PENDING'),
  constraints: z.array(z.string()).default([]),
  assumptions: z.array(z.string()).default([]),
  acceptanceCriteria: z.array(z.string()).default([]),
  requiredCapabilities: z.array(z.string()).default([]),
  availableCapabilities: z.array(z.string()).default([]),
  evidenceRequirements: z.array(z.string()).default([]),
  gates: z.array(missionGateSchema).default([]),
  actions: z.array(missionActionSchema).default([]),
  blockers: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  decisions: z.array(z.string()).default([]),
  evidenceRefs: z.array(z.string()).default([]),
  artifacts: z.array(z.string()).default([]),
  deploymentRefs: z.array(z.string()).default([]),
  runtimeRefs: z.array(z.string()).default([])
});

export const createMissionSchema = engineeringMissionSchema.pick({
  missionId:true, projectId:true, objective:true, constraints:true, assumptions:true,
  acceptanceCriteria:true, requiredCapabilities:true, availableCapabilities:true,
  evidenceRequirements:true
});

export const missionContextPackSchema = z.object({
  mission: engineeringMissionSchema,
  projectFacts: z.array(z.string()).default([]),
  architectureFacts: z.array(z.string()).default([]),
  requirementRefs: z.array(z.string()).default([]),
  riskRefs: z.array(z.string()).default([]),
  decisionRefs: z.array(z.string()).default([]),
  evidenceRefs: z.array(z.string()).default([]),
  unresolvedQuestions: z.array(z.string()).default([])
});

export const executionManifestSchema = z.object({
  mission: engineeringMissionSchema,
  actions: z.array(missionActionSchema).min(1),
  rollbackRequired: z.boolean().default(false),
  rollbackEvidenceRequired: z.array(z.string()).default([]),
  releaseTarget: z.enum(['NONE','PREVIEW','PRODUCTION']).default('NONE')
});

export const hostResultSchema = z.object({
  mission: engineeringMissionSchema,
  actionId: z.string().min(1),
  status: z.enum(['PASS','FAIL','BLOCKED']),
  evidenceRefs: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([]),
  blocker: z.string().optional()
});

export const blockerArbitrationSchema = z.object({
  mission: engineeringMissionSchema,
  blockers: z.array(z.object({
    id: z.string().min(1),
    description: z.string().min(1),
    severity: z.enum(['LOW','MEDIUM','HIGH','CRITICAL']),
    category: z.string().min(1),
    reversible: z.boolean().default(true),
    evidenceRefs: z.array(z.string()).default([])
  })).default([])
});

export const crossEngineGateSchema = z.object({
  mission: engineeringMissionSchema,
  gates: z.array(missionGateSchema).min(1),
  requireAllMandatoryPass: z.boolean().default(true)
});

export const deliveryManifestSchema = z.object({
  mission: engineeringMissionSchema,
  changedArtifacts: z.array(z.string()).default([]),
  tests: z.array(z.object({name:z.string(),status:z.enum(['PASS','FAIL','NOT_RUN']),evidenceRefs:z.array(z.string()).default([])})).default([]),
  releaseEvidenceRefs: z.array(z.string()).default([]),
  deploymentRef: z.string().optional(),
  runtimeEvidenceRefs: z.array(z.string()).default([]),
  knownGaps: z.array(z.string()).default([])
});

export const postDeployWatchSchema = z.object({
  mission: engineeringMissionSchema,
  deploymentRef: z.string().min(1),
  checks: z.array(z.object({name:z.string().min(1),requiredEvidence:z.array(z.string()).default([]),blocking:z.boolean().default(true)})).default([]),
  rollbackTriggers: z.array(z.string()).default([]),
  observationWindowMinutes: z.number().int().positive().default(30)
});

export const compareMissionsSchema = z.object({before:engineeringMissionSchema,after:engineeringMissionSchema});
