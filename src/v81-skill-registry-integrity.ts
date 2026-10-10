import { createHash } from 'node:crypto';
import { z } from 'zod';
import { V75_AGENT_IDS, V75_SKILL_NAMES } from './v75-agent-capability-fabric';
import { V76_SKILL_INDEX } from './v76-skill-index';
import { V80_V42_SHADOW_SEEDS } from './v80-v42-shadow-seeds';
import { V80_V43_INSTRUCTION_MANIFEST } from './v80-v43-instruction-manifest';

const unique = <T>(items: readonly T[]) => [...new Set(items)];
const duplicateStrings = (items: readonly string[]) => unique(items.filter((value, index) => items.indexOf(value) !== index)).sort();
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export const V81_SKILL_REGISTRY_AUDIT_CONTRACT = 'krom-skill-registry-integrity-v1' as const;

const v81DocumentAuditSchema = z.object({
  physicalSkillFiles: z.number().int().min(0),
  managedInstructionFiles: z.number().int().min(0),
  rawHashMatches: z.number().int().min(0),
  invalidUtf8: z.number().int().min(0).default(0),
  metadataMismatches: z.number().int().min(0).default(0),
  schemaDefects: z.number().int().min(0).default(0),
  exactDuplicateBodies: z.number().int().min(0).default(0),
  nearDuplicateCandidates: z.number().int().min(0).default(0),
  policyConflicts: z.number().int().min(0).default(0),
  securityFindings: z.number().int().min(0).default(0),
  unavailableSourceRequests: z.number().int().min(0).default(0),
  evidenceLabel: z.string().min(1).default('host-supplied document audit')
});

export const v81SkillRegistryAuditSchema = z.object({
  expectedActiveSkillCount: z.number().int().min(1).default(V75_SKILL_NAMES.length),
  expectedShadowSkillCount: z.number().int().min(0).default(V80_V43_INSTRUCTION_MANIFEST.length),
  expectedAgentCount: z.number().int().min(1).default(V75_AGENT_IDS.length),
  documentAudit: v81DocumentAuditSchema.optional()
});

export type V81SkillRegistryAuditInput = z.input<typeof v81SkillRegistryAuditSchema>;

export type V81DuplicateCandidate = Readonly<{
  left: string;
  right: string;
  classification: 'A_TRUE_DUPLICATE' | 'B_NEAR_DUPLICATE' | 'C_COMPLEMENTARY';
  nameSimilarity: number;
  purposeSimilarity: number;
  workflowSimilarity: number;
  recommendation: 'MERGE_REQUIRES_HUMAN_EVIDENCE' | 'REVIEW_BOUNDARIES' | 'KEEP_DISTINCT';
}>;

export type V81SkillSignature = Readonly<{
  name: string;
  sha256: string;
  purpose: string;
  workflow: string;
}>;

function tokens(value: string) {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9\u0600-\u06ff]+/u)
      .filter(token => token.length > 2)
  );
}

function jaccard(left: string, right: string) {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size && !b.size) return 1;
  if (!a.size || !b.size) return 0;
  const overlap = [...a].filter(token => b.has(token)).length;
  return Number((overlap / (a.size + b.size - overlap)).toFixed(4));
}

/**
 * Produces conservative review candidates. A non-exact result is never an
 * automatic merge/delete instruction; purpose and workflow evidence must be
 * reviewed by a human before lifecycle changes.
 */
export function classifyDuplicateCandidateV81(left: V81SkillSignature, right: V81SkillSignature): V81DuplicateCandidate | null {
  const nameSimilarity = jaccard(left.name, right.name);
  const purposeSimilarity = jaccard(left.purpose, right.purpose);
  const workflowSimilarity = jaccard(left.workflow, right.workflow);

  if (left.sha256 === right.sha256) {
    return {
      left: left.name,
      right: right.name,
      classification: 'A_TRUE_DUPLICATE',
      nameSimilarity,
      purposeSimilarity,
      workflowSimilarity,
      recommendation: 'MERGE_REQUIRES_HUMAN_EVIDENCE'
    };
  }

  if (purposeSimilarity >= 0.92 && workflowSimilarity >= 0.86) {
    return {
      left: left.name,
      right: right.name,
      classification: 'B_NEAR_DUPLICATE',
      nameSimilarity,
      purposeSimilarity,
      workflowSimilarity,
      recommendation: 'REVIEW_BOUNDARIES'
    };
  }

  if (purposeSimilarity >= 0.68 && workflowSimilarity >= 0.45) {
    return {
      left: left.name,
      right: right.name,
      classification: 'C_COMPLEMENTARY',
      nameSimilarity,
      purposeSimilarity,
      workflowSimilarity,
      recommendation: 'KEEP_DISTINCT'
    };
  }

  return null;
}

export function buildAgentSkillMappingV81() {
  const agents = [...V75_AGENT_IDS];
  const activeByAgent = Object.fromEntries(agents.map(agent => [
    agent,
    V76_SKILL_INDEX.filter(skill => skill.preferredAgents.includes(agent)).map(skill => skill.name).sort()
  ]));
  const shadowPrimaryByAgent = Object.fromEntries(agents.map(agent => [
    agent,
    V80_V42_SHADOW_SEEDS.filter(skill => skill.p === agent).map(skill => skill.n).sort()
  ]));
  const shadowValidatorByAgent = Object.fromEntries(agents.map(agent => [
    agent,
    V80_V42_SHADOW_SEEDS.filter(skill => skill.v === agent).map(skill => skill.n).sort()
  ]));

  return {
    contract: V81_SKILL_REGISTRY_AUDIT_CONTRACT,
    accessModel: {
      activeCatalogAccess: 'ALL_ACTIVE_SKILLS_FOR_ALL_AGENTS',
      shadowCatalogAccess: 'DISCOVERY_AND_EVALUATION_ONLY',
      shadowExecution: false,
      hostAuthorizationStillRequired: true
    },
    activeSkillCount: V75_SKILL_NAMES.length,
    shadowSkillCount: V80_V42_SHADOW_SEEDS.length,
    agents: agents.map(agent => ({
      agent,
      activeCatalogAccess: 'ALL_ACTIVE_SKILLS',
      activePreferredSkills: activeByAgent[agent],
      shadowPrimarySkills: shadowPrimaryByAgent[agent],
      shadowValidatorSkills: shadowValidatorByAgent[agent]
    }))
  } as const;
}

export function auditSkillRegistryIntegrityV81(input: V81SkillRegistryAuditInput = {}) {
  const parsed = v81SkillRegistryAuditSchema.parse(input);
  const failures: string[] = [];
  const activeNames = [...V75_SKILL_NAMES];
  const runtimeNames = V76_SKILL_INDEX.map(skill => skill.name);
  const shadowNames = V80_V42_SHADOW_SEEDS.map(skill => skill.n);
  const manifestNames = V80_V43_INSTRUCTION_MANIFEST.map(skill => skill.name);
  const agentIds = new Set<string>(V75_AGENT_IDS);
  const activeSet = new Set<string>(activeNames);
  const runtimeSet = new Set<string>(runtimeNames);
  const shadowSet = new Set<string>(shadowNames);
  const manifestByName = new Map(V80_V43_INSTRUCTION_MANIFEST.map(skill => [skill.name, skill]));

  const duplicateActiveNames = duplicateStrings(activeNames);
  const duplicateRuntimeNames = duplicateStrings(runtimeNames);
  const duplicateShadowNames = duplicateStrings(shadowNames);
  const activeWithoutRuntime = activeNames.filter(name => !runtimeSet.has(name)).sort();
  const runtimeWithoutActive = runtimeNames.filter(name => !activeSet.has(name)).sort();
  const shadowRuntimeCollisions = shadowNames.filter(name => activeSet.has(name)).sort();
  const shadowWithoutManifest = shadowNames.filter(name => !manifestByName.has(name)).sort();
  const manifestWithoutShadow = manifestNames.filter(name => !shadowSet.has(name)).sort();
  const shadowHashMismatch = V80_V42_SHADOW_SEEDS
    .filter(seed => manifestByName.get(seed.n)?.instructionHash !== seed.h)
    .map(seed => seed.n)
    .sort();
  const invalidShadowAgents = V80_V42_SHADOW_SEEDS
    .filter(seed => !agentIds.has(seed.p) || !agentIds.has(seed.v) || seed.p === seed.v)
    .map(seed => seed.n)
    .sort();
  const invalidRuntimeAgents = V76_SKILL_INDEX
    .filter(skill => !skill.preferredAgents.length || skill.preferredAgents.some(agent => !agentIds.has(agent)))
    .map(skill => skill.name)
    .sort();
  const invalidRuntimeHashes = V76_SKILL_INDEX
    .filter(skill => !/^[a-f0-9]{64}$/.test(skill.sha256))
    .map(skill => skill.name)
    .sort();

  if (activeNames.length !== parsed.expectedActiveSkillCount) failures.push(`ACTIVE_COUNT:${activeNames.length}`);
  if (shadowNames.length !== parsed.expectedShadowSkillCount) failures.push(`SHADOW_COUNT:${shadowNames.length}`);
  if (V75_AGENT_IDS.length !== parsed.expectedAgentCount) failures.push(`AGENT_COUNT:${V75_AGENT_IDS.length}`);
  if (duplicateActiveNames.length) failures.push('DUPLICATE_ACTIVE_NAMES');
  if (duplicateRuntimeNames.length) failures.push('DUPLICATE_RUNTIME_NAMES');
  if (duplicateShadowNames.length) failures.push('DUPLICATE_SHADOW_NAMES');
  if (activeWithoutRuntime.length || runtimeWithoutActive.length) failures.push('ACTIVE_RUNTIME_PARITY');
  if (shadowRuntimeCollisions.length) failures.push('SHADOW_ACTIVE_COLLISION');
  if (shadowWithoutManifest.length || manifestWithoutShadow.length) failures.push('SHADOW_MANIFEST_PARITY');
  if (shadowHashMismatch.length) failures.push('SHADOW_HASH_PARITY');
  if (invalidShadowAgents.length) failures.push('SHADOW_AGENT_MAPPING');
  if (invalidRuntimeAgents.length) failures.push('RUNTIME_AGENT_MAPPING');
  if (invalidRuntimeHashes.length) failures.push('RUNTIME_HASH_FORMAT');

  const documentAudit = parsed.documentAudit;
  if (documentAudit) {
    if (documentAudit.managedInstructionFiles !== shadowNames.length) failures.push('DOCUMENT_MANAGED_COUNT');
    if (documentAudit.rawHashMatches !== shadowNames.length) failures.push('DOCUMENT_HASH_MATCHES');
    if (documentAudit.invalidUtf8 || documentAudit.metadataMismatches || documentAudit.schemaDefects) failures.push('DOCUMENT_INTEGRITY');
    if (documentAudit.exactDuplicateBodies || documentAudit.policyConflicts || documentAudit.securityFindings) failures.push('DOCUMENT_REVIEW_BLOCKERS');
  }

  const mapping = buildAgentSkillMappingV81();
  const agentCoverageGaps = mapping.agents
    .filter(agent => agent.activePreferredSkills.length === 0 && agent.shadowPrimarySkills.length === 0 && agent.shadowValidatorSkills.length === 0)
    .map(agent => agent.agent);
  if (agentCoverageGaps.length) failures.push('AGENT_MAPPING_COVERAGE');

  const payload = {
    activeNames,
    shadowNames,
    manifestNames,
    mapping: mapping.agents.map(agent => ({
      agent: agent.agent,
      activePreferredCount: agent.activePreferredSkills.length,
      shadowPrimaryCount: agent.shadowPrimarySkills.length,
      shadowValidatorCount: agent.shadowValidatorSkills.length
    }))
  };

  return {
    release: 'v81',
    contract: V81_SKILL_REGISTRY_AUDIT_CONTRACT,
    status: failures.length ? 'FAIL' : documentAudit ? 'PASS' : 'PASS_WITH_DOCUMENT_AUDIT_REQUIRED',
    decision: failures.length ? 'BLOCKED' : documentAudit ? 'READY' : 'CONDITIONAL',
    catalog: {
      active: { count: activeNames.length, lifecycle: 'STABLE', executable: true },
      shadow: { count: shadowNames.length, lifecycle: 'SHADOW', executable: false },
      knownTotal: activeNames.length + shadowNames.length,
      activeCatalogAccess: 'ALL_ACTIVE_SKILLS_FOR_ALL_AGENTS',
      shadowCatalogAccess: 'DISCOVERY_AND_EVALUATION_ONLY'
    },
    parity: {
      duplicateActiveNames,
      duplicateRuntimeNames,
      duplicateShadowNames,
      activeWithoutRuntime,
      runtimeWithoutActive,
      shadowRuntimeCollisions,
      shadowWithoutManifest,
      manifestWithoutShadow,
      shadowHashMismatch,
      invalidShadowAgents,
      invalidRuntimeAgents,
      invalidRuntimeHashes
    },
    mapping: {
      agentCount: V75_AGENT_IDS.length,
      agentCoverageGaps,
      digest: digest(payload)
    },
    documentAudit: documentAudit ?? {
      status: 'NOT_SUPPLIED',
      requirement: 'Run npm run audit:skills -- --check on the repository that contains skills/**/SKILL.md.'
    },
    promotionBoundary: {
      shadowSkillsRequireBenchmarkEvidence: true,
      automaticPromotion: false,
      automaticMergeOrDeletion: false,
      source: 'v80 shadow lifecycle governance'
    },
    failures,
    executionClaim: false
  } as const;
}
