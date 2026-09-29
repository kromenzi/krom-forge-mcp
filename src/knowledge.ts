export type WorkflowRoute = {
  mode: string;
  skills: string[];
  recommendedEvidence: string[];
  deliverables: string[];
};

const DOMAIN_HINTS = [
  'hse', 'ehs', 'safety', 'سلامة', 'hr', 'human resources', 'موارد بشرية',
  'crm', 'erp', 'healthcare', 'finance', 'fintech', 'manufacturing', 'mes',
  'education', 'lms', 'logistics', 'field service', 'compliance'
];
const UI_HINTS = ['ui', 'ux', 'واجهة', 'dashboard', 'responsive', 'mobile', 'figma', 'design', 'تصميم'];
const DEBUG_HINTS = ['error', 'bug', '403', '401', '500', 'failed', 'broken', 'خطأ', 'ما يشتغل', 'اصلح', 'صلح'];
const RELEASE_HINTS = ['release', 'deploy', 'publish', 'submission', 'ready', 'نشر', 'جاهز', 'vercel', 'فيرسال'];
const PROMPT_HINTS = ['prompt', 'برومبت', 'master prompt', 'system prompt'];

function hasAny(text: string, words: string[]) {
  const q = text.toLowerCase();
  return words.some(w => q.includes(w));
}

export function routeRequest(request: string): WorkflowRoute {
  const skills = new Set<string>();
  const evidence = new Set<string>();
  const deliverables = new Set<string>();

  if (hasAny(request, DOMAIN_HINTS)) {
    skills.add('domain-research-intelligence');
    evidence.add('Current primary/authoritative domain sources when requirements vary by jurisdiction or time');
    deliverables.add('Domain model: actors, workflows, records, permissions, reports, integrations, edge cases');
  }
  if (hasAny(request, PROMPT_HINTS)) {
    skills.add('prompt-architect');
    deliverables.add('Implementation-ready master prompt with measurable acceptance criteria');
  }
  if (hasAny(request, UI_HINTS)) {
    skills.add('elite-ui-ux');
    evidence.add('Rendered UI/browser evidence when implementing or reviewing a real interface');
    deliverables.add('Responsive UI/UX specification with states, tokens, RTL/LTR and accessibility');
  }
  if (hasAny(request, DEBUG_HINTS)) {
    skills.add('debug-verification');
    evidence.add('Exact error/log/request/runtime evidence and relevant project files');
    deliverables.add('Root-cause diagnosis, minimal fix strategy and regression checks');
  }
  if (hasAny(request, RELEASE_HINTS)) {
    skills.add('release-auditor');
    evidence.add('Build/test/runtime/deployment evidence');
    deliverables.add('Release gate with verified passes, blockers, risks and evidence gaps');
  }

  if (skills.size === 0 || skills.size >= 2) skills.add('krom-forge-orchestrator');
  if (!skills.has('debug-verification') && !skills.has('release-auditor')) skills.add('fullstack-engineering');

  let mode = 'Product / Engineering Orchestration';
  if (skills.has('debug-verification')) mode = 'Inspect → Root Cause → Fix → Verify';
  else if (skills.has('release-auditor')) mode = 'Release Audit';
  else if (skills.has('prompt-architect')) mode = 'Research / Architecture → Master Prompt';
  else if (skills.has('elite-ui-ux')) mode = 'UI/UX Architecture';

  return { mode, skills: [...skills], recommendedEvidence: [...evidence], deliverables: [...deliverables] };
}

export const researchDimensions = [
  'Mission and measurable business outcomes',
  'Actors, departments, external parties and permission boundaries',
  'End-to-end workflows, states, approvals, escalations and SLAs',
  'Entities, records, fields, attachments, signatures and audit evidence',
  'Dashboards, KPIs, reports, exports and audit history',
  'Integrations and systems of record',
  'Security, privacy, retention, authorization and jurisdictional constraints',
  'Mobile, offline, accessibility, localization and RTL/LTR where relevant',
  'Failure modes, abuse cases, unusual edge cases and recovery',
  'Current product and interaction patterns from credible benchmarks'
];

export const researchSourceHierarchy = [
  'Official regulators, governments, standards bodies and statutory guidance',
  'Primary technical/API/platform documentation',
  'Recognized professional or industry bodies',
  'Primary vendor documentation for product benchmarking',
  'High-quality secondary analysis',
  'Community evidence only for usability pain points or implementation experience'
];

export const acceptanceDimensions = [
  'Functional behavior', 'Roles and permissions', 'Data integrity and lifecycle states',
  'Build/type/static correctness', 'Runtime behavior and failure states',
  'Responsive UI/UX and accessibility', 'Security and authorization',
  'Regression safety', 'Deployment/release readiness when in scope'
];
