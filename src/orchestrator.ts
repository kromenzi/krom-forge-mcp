export type ToolKind = 'web' | 'files' | 'github' | 'vercel' | 'supabase' | 'figma' | 'browser' | 'execution' | 'none';

export type EvidenceRequirement = {
  type: ToolKind;
  reason: string;
  required: boolean;
};

export type TaskNode = {
  id: string;
  title: string;
  phase: 'INSPECT' | 'RESEARCH' | 'PLAN' | 'IMPLEMENT' | 'VERIFY' | 'RELEASE';
  status: 'PENDING' | 'READY' | 'BLOCKED' | 'DONE' | 'FAILED';
  dependsOn: string[];
  preferredTools: ToolKind[];
  evidenceRequired: string[];
  acceptance: string[];
};

export type RunState = {
  schemaVersion: '1';
  runId: string;
  objective: string;
  mode: string;
  createdAt: string;
  updatedAt: string;
  currentTaskId: string | null;
  tasks: TaskNode[];
  assumptions: string[];
  blockers: string[];
  evidenceLedger: Array<{
    taskId: string;
    claim: string;
    evidence: string;
    sourceType: ToolKind | 'user' | 'unknown';
    verified: boolean;
  }>;
};

const lower = (s: string) => s.toLowerCase();
const contains = (s: string, hints: string[]) => hints.some(h => lower(s).includes(h));

const PROJECT_HINTS = ['project', 'repo', 'repository', 'codebase', 'existing', 'مشروع', 'مستودع', 'كود'];
const CURRENT_HINTS = ['latest', 'current', 'today', 'regulation', 'standard', 'version', 'api', 'docs', 'حالي', 'حديث', 'لائحة', 'اشتراط'];
const GITHUB_HINTS = ['github', 'pull request', 'pr ', 'commit', 'branch', 'actions'];
const VERCEL_HINTS = ['vercel', 'deployment', 'deploy', 'domain', 'runtime log', 'فيرسال', 'نشر'];
const SUPABASE_HINTS = ['supabase', 'postgres', 'rls', 'database', 'migration', 'auth', 'قاعدة', 'سياسة'];
const FIGMA_HINTS = ['figma', 'design system', 'component library', 'فيقما', 'تصميم'];
const BROWSER_HINTS = ['ui', 'ux', 'responsive', 'mobile', 'screen', 'browser', 'واجهة', 'جوال', 'معاينة'];
const EXEC_HINTS = ['build', 'test', 'lint', 'typecheck', 'npm', 'pnpm', 'runtime', 'compile', 'اختبار', 'بناء'];

export function selectTools(request: string, availableTools: ToolKind[] = []): {
  required: EvidenceRequirement[];
  preferredOrder: ToolKind[];
  unavailable: EvidenceRequirement[];
  principle: string;
} {
  const reqs: EvidenceRequirement[] = [];
  const add = (type: ToolKind, reason: string, required = true) => {
    if (!reqs.some(r => r.type === type)) reqs.push({ type, reason, required });
  };

  if (contains(request, PROJECT_HINTS)) add('files', 'Inspect the actual project/codebase before making architectural or implementation claims.');
  if (contains(request, CURRENT_HINTS)) add('web', 'Version-sensitive or jurisdiction-sensitive claims require current primary sources.');
  if (contains(request, GITHUB_HINTS)) add('github', 'Repository, commit, PR, branch and CI evidence should come from GitHub.');
  if (contains(request, VERCEL_HINTS)) add('vercel', 'Deployment and runtime claims require direct Vercel evidence.');
  if (contains(request, SUPABASE_HINTS)) add('supabase', 'Database, Auth, migration and RLS claims require direct backend evidence.');
  if (contains(request, FIGMA_HINTS)) add('figma', 'Editable design-system or design-file work should use the design host when available.', false);
  if (contains(request, BROWSER_HINTS)) add('browser', 'Rendered UI behavior must be verified in an actual browser when implementation is in scope.');
  if (contains(request, EXEC_HINTS) || contains(request, PROJECT_HINTS)) add('execution', 'Build/test/type/runtime claims require deterministic execution evidence.');

  if (!reqs.length) add('none', 'No external evidence source is inherently required for this planning request.', false);

  const order: ToolKind[] = ['files', 'web', 'github', 'supabase', 'vercel', 'figma', 'execution', 'browser'];
  const preferredOrder = order.filter(t => reqs.some(r => r.type === t));
  const unavailable = availableTools.length
    ? reqs.filter(r => r.type !== 'none' && !availableTools.includes(r.type))
    : [];

  return {
    required: reqs,
    preferredOrder,
    unavailable,
    principle: 'Use the minimum sufficient host-authorized tools. Never fabricate a tool call, inspection, test, deployment, or verification result.'
  };
}

function makeTask(id: string, title: string, phase: TaskNode['phase'], dependsOn: string[], preferredTools: ToolKind[], evidenceRequired: string[], acceptance: string[]): TaskNode {
  return { id, title, phase, status: dependsOn.length ? 'PENDING' : 'READY', dependsOn, preferredTools, evidenceRequired, acceptance };
}

export function buildTaskGraph(objective: string, existingProject: boolean, implementationRequested: boolean): TaskNode[] {
  const tasks: TaskNode[] = [];
  let previous: string | null = null;
  const push = (task: TaskNode) => { tasks.push(task); previous = task.id; };

  if (existingProject) {
    push(makeTask('T1', 'Inspect current project and preserve existing work', 'INSPECT', [], ['files'], ['Project structure/config/current-state evidence'], ['Architecture and constraints are based on inspected files, not assumptions']));
  }

  const researchDepends = previous ? [previous] : [];
  push(makeTask(existingProject ? 'T2' : 'T1', 'Resolve current/domain-sensitive requirements', 'RESEARCH', researchDepends, ['web'], ['Primary-source citations when facts are current, regulated, or version-sensitive'], ['Facts, recommendations and assumptions are separated']));
  const researchId = previous!;

  const planId = `T${tasks.length + 1}`;
  push(makeTask(planId, 'Create implementation plan and architecture contract', 'PLAN', [researchId], ['none'], ['Actor/workflow/data/API/UI/security/test maps'], ['Plan contains measurable acceptance criteria and dependencies']));

  if (implementationRequested) {
    const implId = `T${tasks.length + 1}`;
    push(makeTask(implId, 'Implement smallest coherent change set', 'IMPLEMENT', [planId], ['files', 'github', 'supabase'], ['Diff/change evidence'], ['Requested behavior is implemented without unrelated destructive changes']));

    const verifyId = `T${tasks.length + 1}`;
    push(makeTask(verifyId, 'Build, test and verify runtime/UI behavior', 'VERIFY', [implId], ['execution', 'browser'], ['Build/test/runtime/browser evidence'], ['No completion claim exceeds available evidence']));

    const releaseId = `T${tasks.length + 1}`;
    push(makeTask(releaseId, 'Evaluate release readiness', 'RELEASE', [verifyId], ['github', 'vercel', 'supabase'], ['Release-gate evidence'], ['PASS/FAIL/PASS_WITH_GAPS reflects supplied evidence only']));
  }

  return tasks;
}

export function createRunState(objective: string, mode: string, tasks: TaskNode[], assumptions: string[] = []): RunState {
  const now = new Date().toISOString();
  const token = Buffer.from(`${objective}|${now}`).toString('base64url').slice(0, 18);
  return {
    schemaVersion: '1',
    runId: `krom_${token}`,
    objective,
    mode,
    createdAt: now,
    updatedAt: now,
    currentTaskId: tasks.find(t => t.status === 'READY')?.id ?? null,
    tasks,
    assumptions,
    blockers: [],
    evidenceLedger: []
  };
}

export function resumeRun(state: RunState, updates: {
  completedTaskIds?: string[];
  failedTaskIds?: string[];
  blockers?: string[];
  evidence?: RunState['evidenceLedger'];
}): RunState {
  const completed = new Set(updates.completedTaskIds ?? []);
  const failed = new Set(updates.failedTaskIds ?? []);
  const tasks = state.tasks.map(t => ({ ...t }));

  for (const task of tasks) {
    if (completed.has(task.id)) task.status = 'DONE';
    if (failed.has(task.id)) task.status = 'FAILED';
  }

  for (const task of tasks) {
    if (task.status === 'DONE' || task.status === 'FAILED') continue;
    const depStates = task.dependsOn.map(id => tasks.find(t => t.id === id)?.status);
    task.status = depStates.some(s => s === 'FAILED') ? 'BLOCKED' : depStates.every(s => s === 'DONE') ? 'READY' : 'PENDING';
  }

  return {
    ...state,
    updatedAt: new Date().toISOString(),
    tasks,
    blockers: Array.from(new Set([...(state.blockers ?? []), ...(updates.blockers ?? [])])),
    evidenceLedger: [...state.evidenceLedger, ...(updates.evidence ?? [])],
    currentTaskId: tasks.find(t => t.status === 'READY')?.id ?? null
  };
}

export function verifyEvidence(claims: Array<{ claim: string; evidence?: string; sourceType?: string }>) {
  const evaluated = claims.map(c => {
    const text = (c.evidence ?? '').trim();
    const verified = text.length >= 8 && !/^(none|n\/a|unknown|not tested|not verified)$/i.test(text);
    return {
      claim: c.claim,
      status: verified ? 'SUPPORTED' : 'UNVERIFIED',
      evidence: text,
      sourceType: c.sourceType ?? 'unknown',
      rule: verified ? 'Evidence supplied; host should still validate source authenticity when consequential.' : 'No sufficient evidence supplied; do not state this claim as completed.'
    };
  });
  return {
    overall: evaluated.every(e => e.status === 'SUPPORTED') ? 'SUPPORTED' : 'HAS_UNVERIFIED_CLAIMS',
    evaluated
  };
}

export function auditProject(input: {
  projectType?: string;
  files?: string[];
  scripts?: string[];
  routes?: string[];
  knownErrors?: string[];
  hasTests?: boolean;
  hasAuth?: boolean;
  hasDatabase?: boolean;
}) {
  const gaps: string[] = [];
  const risks: string[] = [];
  const files = input.files ?? [];
  const scripts = input.scripts ?? [];

  if (!files.length) gaps.push('No project inventory supplied; structural conclusions remain provisional.');
  if (!scripts.some(s => /build/i.test(s))) gaps.push('No build command identified.');
  if (!scripts.some(s => /test/i.test(s))) gaps.push('No test command identified.');
  if (input.hasDatabase && !files.some(f => /migration|schema|supabase/i.test(f))) risks.push('Database is reported but migration/schema evidence is not represented in the supplied inventory.');
  if (input.hasAuth && !files.some(f => /auth|middleware|policy|rls/i.test(f))) risks.push('Authentication is reported but auth/authorization evidence is not represented in the supplied inventory.');
  if ((input.knownErrors ?? []).length) risks.push(`${input.knownErrors!.length} known error(s) require root-cause verification.`);

  return {
    projectType: input.projectType ?? 'Unknown',
    suppliedInventory: { fileCount: files.length, scripts, routes: input.routes ?? [] },
    gaps,
    risks,
    nextEvidence: [
      'Project tree and package manifest',
      'Build/type/test commands and outputs',
      'Auth/authorization configuration when applicable',
      'Database schema/migrations/RLS when applicable',
      'Rendered browser evidence for UI work',
      'Deployment/runtime evidence when release is in scope'
    ],
    conclusion: gaps.length || risks.length ? 'PROVISIONAL_AUDIT' : 'AUDIT_INPUTS_COMPLETE_FOR_PLANNING'
  };
}
