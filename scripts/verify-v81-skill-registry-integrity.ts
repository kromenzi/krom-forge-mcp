import { V75_SKILL_NAMES } from '../src/v75-agent-capability-fabric';
import { V80_V42_SHADOW_SEEDS } from '../src/v80-v42-shadow-seeds';
import { V80_V43_INSTRUCTION_MANIFEST } from '../src/v80-v43-instruction-manifest';
import {
  auditSkillRegistryIntegrityV81,
  buildAgentSkillMappingV81,
  classifyDuplicateCandidateV81
} from '../src/v81-skill-registry-integrity';

const audit = auditSkillRegistryIntegrityV81({
  expectedActiveSkillCount: V75_SKILL_NAMES.length,
  expectedShadowSkillCount: V80_V43_INSTRUCTION_MANIFEST.length,
  documentAudit: {
    physicalSkillFiles: 515,
    managedInstructionFiles: V80_V43_INSTRUCTION_MANIFEST.length,
    rawHashMatches: V80_V43_INSTRUCTION_MANIFEST.length,
    invalidUtf8: 0,
    metadataMismatches: 0,
    schemaDefects: 0,
    exactDuplicateBodies: 0,
    nearDuplicateCandidates: 0,
    policyConflicts: 0,
    securityFindings: 0,
    unavailableSourceRequests: 12,
    evidenceLabel: 'deterministic v81 fixture for registry contract verification'
  }
});

if (audit.status !== 'PASS' || audit.decision !== 'READY') {
  throw new Error(`v81 audit failed: ${JSON.stringify(audit)}`);
}
if (audit.catalog.active.count !== 1465 || audit.catalog.shadow.count !== 500 || audit.catalog.knownTotal !== 1965) {
  throw new Error(`Unexpected v81 catalog counts: ${JSON.stringify(audit.catalog)}`);
}
if (audit.parity.shadowHashMismatch.length || audit.parity.shadowRuntimeCollisions.length) {
  throw new Error(`v81 shadow parity failed: ${JSON.stringify(audit.parity)}`);
}
if (audit.mapping.agentCoverageGaps.length) {
  throw new Error(`v81 agent coverage gaps: ${audit.mapping.agentCoverageGaps.join(',')}`);
}

const mapping = buildAgentSkillMappingV81();
if (mapping.agents.length !== 11 || mapping.shadowSkillCount !== V80_V42_SHADOW_SEEDS.length) {
  throw new Error(`v81 mapping contract failed: ${JSON.stringify(mapping)}`);
}
if (mapping.agents.some(agent => agent.activePreferredSkills.length === 0 && agent.shadowPrimarySkills.length === 0 && agent.shadowValidatorSkills.length === 0)) {
  throw new Error('v81 mapping contains an unmapped agent');
}

const exact = classifyDuplicateCandidateV81(
  { name: 'same-skill', sha256: 'a'.repeat(64), purpose: 'same purpose', workflow: 'same workflow' },
  { name: 'same-skill-copy', sha256: 'a'.repeat(64), purpose: 'different', workflow: 'different' }
);
if (exact?.classification !== 'A_TRUE_DUPLICATE') throw new Error('v81 exact duplicate classifier failed');

const near = classifyDuplicateCandidateV81(
  { name: 'policy-review', sha256: 'b'.repeat(64), purpose: 'Review access policy invariants and evidence', workflow: 'inspect policy evidence validate invariant emit result' },
  { name: 'policy-audit', sha256: 'c'.repeat(64), purpose: 'Review access policy invariants and evidence', workflow: 'inspect policy evidence validate invariant emit result' }
);
if (near?.classification !== 'B_NEAR_DUPLICATE') throw new Error('v81 near duplicate classifier failed');

console.log(JSON.stringify({
  status: 'PASS',
  release: 'v81',
  activeSkills: audit.catalog.active.count,
  shadowSkills: audit.catalog.shadow.count,
  knownSkills: audit.catalog.knownTotal,
  agents: mapping.agents.length,
  mappingDigest: audit.mapping.digest,
  promotionBoundary: audit.promotionBoundary
}, null, 2));
