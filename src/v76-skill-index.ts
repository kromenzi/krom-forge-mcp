import { createHash } from 'node:crypto';
import { V75_SKILL_NAMES } from './v75-agent-capability-fabric';

export type V76SkillMetadata = {
  name: (typeof V75_SKILL_NAMES)[number];
  description: string;
  domains: string[];
  preferredAgents: string[];
  instructionContract: string[];
  evidenceExpectations: string[];
  sha256: string;
};

function profile(name: string) {
  const n = name.toLowerCase();
  if (n.includes('uiux') || n.includes('accessibility') || n.includes('rtl') || n.includes('vision-command-center')) {
    return {
      description: 'UI/UX engineering skill for responsive, accessible, RTL/LTR-aware product interfaces and evidence-based visual review.',
      domains: ['ui','ux','responsive','accessibility','rtl','frontend'],
      preferredAgents: ['uiux','frontend','qa']
    };
  }
  if (n.includes('database') || n.includes('rbac') || n.includes('rls') || n.includes('backup')) {
    return {
      description: 'Database and data-control engineering skill covering schema integrity, migrations, authorization boundaries, RLS and recoverability.',
      domains: ['database','sql','postgres','supabase','migration','rls','backup'],
      preferredAgents: ['database','security','backend']
    };
  }
  if (n.includes('security') || n.includes('appsec') || n.includes('secret') || n.includes('sast') || n.includes('threat')) {
    return {
      description: 'Application security skill for threat modeling, authorization, secrets, secure code, dependency and supply-chain assurance.',
      domains: ['security','auth','authorization','secrets','threat','sast','dast'],
      preferredAgents: ['security','qa','release-auditor']
    };
  }
  if (n.includes('qa') || n.includes('test') || n.includes('reliability') || n.includes('observability')) {
    return {
      description: 'Quality and reliability engineering skill for regression, E2E, observability, diagnostics and evidence-backed verification.',
      domains: ['qa','test','e2e','regression','observability','reliability'],
      preferredAgents: ['qa','devops','release-auditor']
    };
  }
  if (n.includes('deployment') || n.includes('release') || n.includes('production')) {
    return {
      description: 'Production engineering skill for deployment, release gates, rollback safety, CI/CD and operational readiness.',
      domains: ['deployment','release','ci','cd','production','rollback'],
      preferredAgents: ['devops','release-auditor','orchestrator']
    };
  }
  if (n.includes('vision') || n.includes('computer-vision') || n.includes('esp')) {
    return {
      description: 'Computer-vision and edge safety systems skill covering cameras, ESP devices, vision workflows, reliability and safety evidence.',
      domains: ['vision','camera','computer-vision','esp','safety'],
      preferredAgents: ['architect','backend','security','qa']
    };
  }
  if (n.includes('hse') || n.includes('safety-board') || n.includes('safety')) {
    return {
      description: 'Enterprise HSE and safety-platform engineering skill covering incidents, risks, NCR/CAPA, inspections, workflows, dashboards and safety records.',
      domains: ['HSE','safety','risk','incident','NCR','CAPA','inspection','workflow'],
      preferredAgents: ['orchestrator','architect','backend','frontend']
    };
  }
  if (n.includes('print') || n.includes('pdf') || n.includes('word') || n.includes('powerpoint') || n.includes('excel')) {
    return {
      description: 'Document and reporting skill for structured printable outputs, office artifacts, PDF/report layout and document-quality verification.',
      domains: ['document','print','pdf','report','office'],
      preferredAgents: ['frontend','uiux','qa']
    };
  }
  if (n.includes('skill') || n.includes('prompt') || n.includes('forge')) {
    return {
      description: 'KROM skill and prompt engineering capability for discovery, curation, evaluation, packaging and controlled evolution.',
      domains: ['skill','prompt','capability','tool','registry'],
      preferredAgents: ['orchestrator','architect','researcher','qa']
    };
  }
  if (n.includes('integration') || n.includes('outlook') || n.includes('whatsapp') || n.includes('realtime')) {
    return {
      description: 'Integration and collaboration engineering skill for external services, notifications, realtime workflows and delivery contracts.',
      domains: ['integration','notification','realtime','messaging','api'],
      preferredAgents: ['backend','architect','qa']
    };
  }
  return {
    description: 'Specialized KROM Forge engineering skill with evidence-aware planning, bounded execution and verification requirements.',
    domains: ['engineering','automation','verification'],
    preferredAgents: ['orchestrator','architect','qa']
  };
}

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

export const V76_SKILL_INDEX: V76SkillMetadata[] = V75_SKILL_NAMES.map(name => {
  const p = profile(name);
  const payload = JSON.stringify({name,description:p.description,domains:p.domains,preferredAgents:p.preferredAgents,instructions:BASE_INSTRUCTIONS,evidence:BASE_EVIDENCE});
  return {
    name,
    description:p.description,
    domains:p.domains,
    preferredAgents:p.preferredAgents,
    instructionContract:[...BASE_INSTRUCTIONS],
    evidenceExpectations:[...BASE_EVIDENCE],
    sha256:createHash('sha256').update(payload).digest('hex')
  };
});

const INDEX = new Map(V76_SKILL_INDEX.map(skill => [skill.name, skill] as const));

export function getSkillMetadataV76(name: string) {
  return INDEX.get(name as (typeof V75_SKILL_NAMES)[number]) ?? null;
}

export function auditSkillIndexV76() {
  const names = V76_SKILL_INDEX.map(x=>x.name);
  const duplicates = names.filter((name,index)=>names.indexOf(name)!==index);
  const missing = V75_SKILL_NAMES.filter(name=>!INDEX.has(name));
  const unknown = names.filter(name=>!V75_SKILL_NAMES.includes(name));
  const digestCoverage = V76_SKILL_INDEX.filter(x=>/^[a-f0-9]{64}$/.test(x.sha256)).length;
  const descriptionCoverage = V76_SKILL_INDEX.filter(x=>x.description.trim().length>=20).length;
  const instructionCoverage = V76_SKILL_INDEX.filter(x=>x.instructionContract.length>=5).length;
  const evidenceCoverage = V76_SKILL_INDEX.filter(x=>x.evidenceExpectations.length>=5).length;
  return {
    release:'v76',
    status: duplicates.length || missing.length || unknown.length ||
      digestCoverage!==V75_SKILL_NAMES.length ||
      descriptionCoverage!==V75_SKILL_NAMES.length ||
      instructionCoverage!==V75_SKILL_NAMES.length ||
      evidenceCoverage!==V75_SKILL_NAMES.length ? 'FAIL' : 'PASS',
    expectedCount:V75_SKILL_NAMES.length,
    actualCount:V76_SKILL_INDEX.length,
    digestCoverage,
    descriptionCoverage,
    instructionCoverage,
    evidenceCoverage,
    duplicates,
    missing,
    unknown,
    source:'validated-runtime-manifest',
    executionClaim:false
  };
}
