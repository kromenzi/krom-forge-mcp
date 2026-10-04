import { V76_SKILL_INDEX_0 } from './part-0';
import { V76_SKILL_INDEX_1 } from './part-1';
import { V76_SKILL_INDEX_2 } from './part-2';
import { V76_SKILL_INDEX_3 } from './part-3';
import { V76_SKILL_INDEX_4 } from './part-4';
import { V76_SKILL_INDEX_5 } from './part-5';
import { V76_SKILL_INDEX_6 } from './part-6';
import { V76_SKILL_INDEX_7 } from './part-7';
import { V76_SKILL_INDEX_8 } from './part-8';
import { V76_SKILL_INDEX_9 } from './part-9';
import { V75_SKILL_NAMES } from '../v75-agent-capability-fabric';

export type V76SkillMetadata = {
  name: string;
  description: string;
  sha256: string;
  domains: string[];
  preferredAgents: string[];
  instructionContract: string[];
  evidenceExpectations: string[];
};

const BASE_INSTRUCTIONS = [
  'Inspect current evidence before proposing destructive or state-changing work.',
  'Separate observed facts, assumptions, recommendations and execution claims.',
  'Prefer the smallest coherent change set that preserves existing behavior.',
  'Validate tool input contracts and host authorization before side effects.',
  'Require build/test/runtime evidence before claiming implementation success.'
];

const BASE_EVIDENCE = [
  'Inspected source/configuration evidence',
  'Changed-file or diff evidence for implementation',
  'Focused test evidence for changed behavior',
  'Build/typecheck evidence when code changes',
  'Runtime or deployment evidence before production-success claims'
];

function profile(name: string) {
  const n = name.toLowerCase();
  if (n.includes('root-cause-debugger') || n.includes('typescript-build') || n.includes('module-import-export') || n.includes('package-dependency') || n.includes('monorepo-workspace')) {
    return { domains:['debugging','build','typescript','module','dependency','repair','verification'], preferredAgents:['backend','architect','qa','devops'] };
  }
  if (n.includes('auth-permission') || n.includes('security-') || n.includes('secrets-credential') || n.includes('session-cookie') || n.includes('token-jwt') || n.includes('mfa-') || n.includes('rbac') || n.includes('multitenancy') || n.includes('rls-policy')) {
    return { domains:['security','auth','authorization','rbac','rls','session','secrets','repair'], preferredAgents:['security','backend','database','qa'] };
  }
  if (n.includes('database-') || n.includes('schema-migration') || n.includes('rpc-function') || n.includes('trigger-event') || n.includes('transaction-') || n.includes('query-performance') || n.includes('connection-pool') || n.includes('storage-bucket') || n.includes('backup-restore')) {
    return { domains:['database','postgres','supabase','migration','transaction','storage','repair'], preferredAgents:['database','backend','security','qa'] };
  }
  if (n.includes('react-ui') || n.includes('hydration') || n.includes('component-props') || n.includes('modal-dialog') || n.includes('table-grid') || n.includes('chart-') || n.includes('responsive-mobile') || n.includes('css-layout') || n.includes('theme-darkmode') || n.includes('accessibility-repair') || n.includes('design-system-consistency')) {
    return { domains:['frontend','ui','ux','react','responsive','accessibility','repair'], preferredAgents:['frontend','uiux','qa'] };
  }
  if (n.includes('api-') || n.includes('webhook') || n.includes('third-party-sdk') || n.includes('integration-contract') || n.includes('realtime-websocket') || n.includes('notification-system') || n.includes('email-delivery') || n.includes('push-notification')) {
    return { domains:['api','integration','network','webhook','realtime','notification','repair'], preferredAgents:['backend','architect','qa','security'] };
  }
  if (n.includes('ci-pipeline') || n.includes('cd-release') || n.includes('deployment-runtime') || n.includes('release-versioning') || n.includes('environment-config') || n.includes('feature-flag')) {
    return { domains:['devops','ci','cd','deployment','release','environment','repair'], preferredAgents:['devops','release-auditor','qa','orchestrator'] };
  }
  if (n.includes('unit-test') || n.includes('integration-test') || n.includes('e2e-browser') || n.includes('test-coverage') || n.includes('flaky-test') || n.includes('regression-hunter')) {
    return { domains:['qa','test','e2e','regression','coverage','repair'], preferredAgents:['qa','backend','frontend','release-auditor'] };
  }
  if (n.includes('print-') || n.includes('pdf-') || n.includes('font-rendering') || n.includes('image-processing') || n.includes('file-upload') || n.includes('file-import-export') || n.includes('data-export-report')) {
    return { domains:['document','print','pdf','asset','file','report','repair'], preferredAgents:['frontend','uiux','qa','backend'] };
  }
  if (n.includes('performance') || n.includes('memory-leak') || n.includes('cpu-event-loop') || n.includes('cache-invalidation') || n.includes('rate-limit')) {
    return { domains:['performance','reliability','runtime','cache','repair'], preferredAgents:['devops','backend','qa'] };
  }
    if (n.includes('function-audit') || n.includes('function-repair')) {
    return { domains:['debugging','function','code-quality','repair','api','supabase','postgres','verification'], preferredAgents:['backend','qa','security','architect'] };
  }
  if (n.includes('3d-design') || n.includes('3d')) {
    return { domains:['ui','ux','3d','design','webgl','r3f','responsive','accessibility','performance'], preferredAgents:['uiux','frontend','qa','architect'] };
  }
  if (n.includes('uiux') || n.includes('accessibility') || n.includes('rtl') || n.includes('vision-command-center')) {
    return { domains:['ui','ux','responsive','accessibility','rtl','frontend'], preferredAgents:['uiux','frontend','qa'] };
  }
  if (n.includes('database') || n.includes('rbac') || n.includes('rls') || n.includes('backup')) {
    return { domains:['database','sql','postgres','supabase','migration','rls','backup'], preferredAgents:['database','security','backend'] };
  }
  if (n.includes('security') || n.includes('appsec') || n.includes('secret') || n.includes('sast') || n.includes('threat')) {
    return { domains:['security','auth','authorization','secrets','threat','sast','dast'], preferredAgents:['security','qa','release-auditor'] };
  }
  if (n.includes('qa') || n.includes('test') || n.includes('reliability') || n.includes('observability')) {
    return { domains:['qa','test','e2e','regression','observability','reliability'], preferredAgents:['qa','devops','release-auditor'] };
  }
  if (n.includes('deployment') || n.includes('release') || n.includes('production')) {
    return { domains:['deployment','release','ci','cd','production','rollback'], preferredAgents:['devops','release-auditor','orchestrator'] };
  }
  if (n.includes('vision') || n.includes('computer-vision') || n.includes('esp')) {
    return { domains:['vision','camera','computer-vision','esp','safety'], preferredAgents:['architect','backend','security','qa'] };
  }
  if (n.includes('hse') || n.includes('safety-board') || n.includes('safety')) {
    return { domains:['hse','safety','risk','incident','ncr','capa','inspection','workflow'], preferredAgents:['orchestrator','architect','backend','frontend'] };
  }
  if (n.includes('print') || n.includes('pdf') || n.includes('word') || n.includes('powerpoint') || n.includes('excel') || n.includes('typst')) {
    return { domains:['document','print','pdf','report','office'], preferredAgents:['frontend','uiux','qa'] };
  }
  if (n.includes('skill') || n.includes('prompt') || n.includes('forge')) {
    return { domains:['skill','prompt','capability','tool','registry'], preferredAgents:['orchestrator','architect','researcher','qa'] };
  }
  if (n.includes('integration') || n.includes('outlook') || n.includes('whatsapp') || n.includes('realtime')) {
    return { domains:['integration','notification','realtime','messaging','api'], preferredAgents:['backend','architect','qa'] };
  }
  return { domains:['engineering','automation','verification'], preferredAgents:['orchestrator','architect','qa'] };
}

const RAW_SKILLS = [
  ...V76_SKILL_INDEX_0,
  ...V76_SKILL_INDEX_1,
  ...V76_SKILL_INDEX_2,
  ...V76_SKILL_INDEX_3,
  ...V76_SKILL_INDEX_4,
  ...V76_SKILL_INDEX_5,
  ...V76_SKILL_INDEX_6,
  ...V76_SKILL_INDEX_7,
  ...V76_SKILL_INDEX_8,
  ...V76_SKILL_INDEX_9
];

export const V76_SKILL_INDEX: readonly V76SkillMetadata[] = RAW_SKILLS.map(skill => {
  const p = profile(skill.name);
  return {
    name: skill.name,
    description: skill.description,
    sha256: skill.sha256,
    domains: p.domains,
    preferredAgents: p.preferredAgents,
    instructionContract: [...BASE_INSTRUCTIONS],
    evidenceExpectations: [...BASE_EVIDENCE]
  };
});

const SKILL_MAP = new Map(V76_SKILL_INDEX.map(skill => [skill.name, skill]));

export function getSkillMetadataV76(name: string) {
  return SKILL_MAP.get(name) ?? null;
}

export function listSkillMetadataV76() {
  return V76_SKILL_INDEX.map(skill => ({
    ...skill,
    domains:[...skill.domains],
    preferredAgents:[...skill.preferredAgents],
    instructionContract:[...skill.instructionContract],
    evidenceExpectations:[...skill.evidenceExpectations]
  }));
}

export function auditSkillIndexV76() {
  const names = V76_SKILL_INDEX.map(x => x.name);
  const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
  const expected = new Set<string>(V75_SKILL_NAMES as readonly string[]);
  const actual = new Set<string>(names);
  const missing = [...expected].filter(name => !actual.has(name));
  const extra = [...actual].filter(name => !expected.has(name));
  const invalidHashes = V76_SKILL_INDEX.filter(skill => !/^[a-f0-9]{64}$/.test(skill.sha256)).map(skill => skill.name);
  const emptyDescriptions = V76_SKILL_INDEX.filter(skill => !skill.description.trim()).map(skill => skill.name);
  const missingInstructionContracts = V76_SKILL_INDEX.filter(skill => skill.instructionContract.length < 5).map(skill => skill.name);
  const missingEvidenceExpectations = V76_SKILL_INDEX.filter(skill => skill.evidenceExpectations.length < 5).map(skill => skill.name);
  const missingPreferredAgents = V76_SKILL_INDEX.filter(skill => !skill.preferredAgents.length).map(skill => skill.name);

  return {
    release:'v76',
    status: duplicateNames.length || missing.length || extra.length || invalidHashes.length || emptyDescriptions.length ||
      missingInstructionContracts.length || missingEvidenceExpectations.length || missingPreferredAgents.length ? 'FAIL' : 'PASS',
    expectedCount:V75_SKILL_NAMES.length,
    actualCount:V76_SKILL_INDEX.length,
    duplicateNames,
    missing,
    extra,
    invalidHashes,
    emptyDescriptions,
    missingInstructionContracts,
    missingEvidenceExpectations,
    missingPreferredAgents,
    digestCoverage:V76_SKILL_INDEX.length-invalidHashes.length,
    descriptionCoverage:V76_SKILL_INDEX.length-emptyDescriptions.length,
    instructionCoverage:V76_SKILL_INDEX.length-missingInstructionContracts.length,
    evidenceCoverage:V76_SKILL_INDEX.length-missingEvidenceExpectations.length,
    source:'User-provided SKILL.md archives + v76 runtime contracts',
    integrityModel:'Original SKILL.md SHA-256 is preserved; runtime contracts are additive metadata.',
    executionClaim:false
  };
}
