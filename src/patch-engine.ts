import type { DiffReview, PatchRequest } from './patch-schema';

function pathMatches(path: string, rule: string) {
  if (!rule) return false;
  if (rule.endsWith('/**')) return path.startsWith(rule.slice(0, -3));
  if (rule.endsWith('/*')) return path.startsWith(rule.slice(0, -1));
  return path === rule || path.startsWith(rule.endsWith('/') ? rule : `${rule}/`);
}

export function planCodeChange(input: PatchRequest) {
  const touched = input.proposedChanges.map(c => c.path);
  const unknownScope = input.allowedPaths.length === 0;
  return {
    objective: input.objective,
    strategy: input.existingProject ? 'SMALLEST_COHERENT_DIFF' : 'GREENFIELD_COHERENT_SLICE',
    proposedFiles: input.proposedChanges,
    scope: { allowedPaths: input.allowedPaths, forbiddenPaths: input.forbiddenPaths, unknownScope },
    impacts: { database: input.databaseImpact, auth: input.authImpact, deployment: input.deploymentImpact },
    constraints: input.constraints,
    requiredPreconditions: [
      input.existingProject ? 'Inspect current project and recent changes before editing.' : 'Confirm target architecture and module boundaries.',
      'Confirm allowed and forbidden paths.',
      input.databaseImpact !== 'NONE' ? 'Review migration/data safety before applying database changes.' : 'No declared database mutation.',
      input.authImpact === 'HIGH' ? 'Require explicit authorization/security review.' : 'Authorization review proportional to change.'
    ],
    implementationOrder: touched.length ? touched.map((path, index) => ({ order: index + 1, path })) : [],
    evidenceRequired: ['host-applied file diff', 'type/build evidence', 'focused tests', 'regression evidence proportional to risk']
  };
}

export function preparePatch(input: PatchRequest) {
  return {
    contractVersion: '1.0',
    objective: input.objective,
    mutationAuthority: 'HOST_ONLY',
    executionRule: 'KROM Forge describes the patch contract; an authorized host edits files.',
    files: input.proposedChanges,
    allowedPaths: input.allowedPaths,
    forbiddenPaths: input.forbiddenPaths,
    invariants: [
      'Preserve unrelated user work.',
      'Do not modify forbidden paths.',
      'Do not widen scope without reporting it.',
      'Do not delete data or migrations implicitly.',
      'Do not claim success until post-change evidence is supplied.'
    ],
    rollback: input.proposedChanges.map(c => ({ path: c.path, action: c.action, requirement: 'Retain or recover pre-change content/state for rollback.' }))
  };
}

export function validateChangeScope(input: PatchRequest) {
  const findings = input.proposedChanges.map(change => {
    const forbidden = input.forbiddenPaths.some(rule => pathMatches(change.path, rule));
    const allowed = input.allowedPaths.length === 0 || input.allowedPaths.some(rule => pathMatches(change.path, rule));
    return {
      path: change.path,
      status: forbidden ? 'FORBIDDEN' : allowed ? 'IN_SCOPE' : 'OUT_OF_SCOPE',
      reason: forbidden ? 'Matches forbidden path rule.' : allowed ? 'Within declared scope.' : 'Not covered by allowed path rules.'
    };
  });
  const blockers = findings.filter(f => f.status !== 'IN_SCOPE');
  return { valid: blockers.length === 0, findings, blockers, scopeWasExplicit: input.allowedPaths.length > 0 };
}

export function assessPatchRisk(input: PatchRequest) {
  let score = 0;
  const reasons: string[] = [];
  const deletions = input.proposedChanges.filter(c => c.action === 'DELETE').length;
  const fileCount = input.proposedChanges.length;
  if (fileCount > 10) { score += 2; reasons.push('Touches more than 10 files.'); }
  if (fileCount > 30) { score += 2; reasons.push('Touches more than 30 files.'); }
  if (deletions) { score += 2; reasons.push(`Deletes ${deletions} file(s).`); }
  if (input.databaseImpact === 'SCHEMA' || input.databaseImpact === 'DATA') { score += 3; reasons.push('Database mutation involved.'); }
  if (input.authImpact === 'HIGH') { score += 3; reasons.push('High authentication/authorization impact.'); }
  else if (input.authImpact === 'MEDIUM') { score += 2; reasons.push('Moderate authentication/authorization impact.'); }
  if (input.deploymentImpact === 'HIGH') { score += 2; reasons.push('High deployment impact.'); }
  if (!input.allowedPaths.length) { score += 1; reasons.push('Allowed scope not explicitly declared.'); }
  const level = score >= 7 ? 'CRITICAL' : score >= 5 ? 'HIGH' : score >= 3 ? 'MEDIUM' : 'LOW';
  return { level, score, reasons, requiredReview: level === 'CRITICAL' || level === 'HIGH' ? ['architecture', 'security', 'rollback', 'focused regression'] : ['focused regression'] };
}

export function generateMigrationPlan(input: PatchRequest) {
  const required = input.databaseImpact === 'SCHEMA' || input.databaseImpact === 'DATA';
  return {
    required,
    databaseImpact: input.databaseImpact,
    steps: required ? [
      'Capture current schema/data assumptions.',
      'Create forward migration with explicit invariant checks.',
      'Define rollback or forward-fix path before production apply.',
      'Test migration on non-production data/environment.',
      'Run integrity and authorization/RLS checks after migration.',
      'Record migration evidence and deployment ordering.'
    ] : ['No database migration declared. Reassess if implementation changes persistence.'],
    blockers: input.databaseImpact === 'UNKNOWN' ? ['Database impact is UNKNOWN; inspect persistence before editing.'] : []
  };
}

export function generateTestPlan(input: PatchRequest) {
  const paths = input.proposedChanges.map(c => c.path.toLowerCase());
  const hasUi = paths.some(p => p.includes('app/') || p.includes('components/') || p.endsWith('.tsx') || p.endsWith('.css'));
  const hasApi = paths.some(p => p.includes('api') || p.includes('route.ts') || p.includes('server'));
  const hasDb = input.databaseImpact !== 'NONE';
  const hasAuth = input.authImpact !== 'NONE';
  const tests = [
    { gate: 'TYPECHECK', required: true, evidence: 'TypeScript/compiler output' },
    { gate: 'BUILD', required: true, evidence: 'Production build exit status/output' },
    { gate: 'FOCUSED_TESTS', required: true, evidence: 'Tests covering changed behavior' },
    { gate: 'UI_BROWSER', required: hasUi, evidence: 'Rendered desktop/mobile behavior and console' },
    { gate: 'API_INTEGRATION', required: hasApi, evidence: 'Request/response and error-path evidence' },
    { gate: 'DB_MIGRATION_INTEGRITY', required: hasDb, evidence: 'Migration/invariant evidence' },
    { gate: 'AUTH_NEGATIVE_TESTS', required: hasAuth, evidence: 'Unauthorized/forbidden access tests' },
    { gate: 'REGRESSION', required: true, evidence: 'Relevant unaffected critical flow checks' }
  ];
  return { objective: input.objective, tests, releaseBlockedUntil: tests.filter(t => t.required).map(t => t.gate) };
}

export function reviewDiff(input: DiffReview) {
  const scope = validateChangeScope({
    objective: input.objective,
    existingProject: true,
    allowedPaths: input.allowedPaths,
    forbiddenPaths: input.forbiddenPaths,
    proposedChanges: input.changes,
    constraints: [], databaseImpact: 'UNKNOWN', authImpact: 'UNKNOWN', deploymentImpact: 'UNKNOWN'
  });
  const errors = input.diagnostics.filter(d => d.severity === 'ERROR' || d.severity === 'FATAL');
  const unproven = [] as string[];
  if (input.build.status !== 'PASS' || !input.build.evidence.trim()) unproven.push('BUILD');
  if (input.tests.status !== 'PASS' || !input.tests.evidence.trim()) unproven.push('TESTS');
  const blockers = [
    ...scope.blockers.map(b => `${b.path}: ${b.status}`),
    ...errors.map(e => `${e.severity}: ${e.message}`),
    ...(input.build.status === 'FAIL' ? ['Build failed.'] : []),
    ...(input.tests.status === 'FAIL' ? ['Tests failed.'] : [])
  ];
  return {
    verdict: blockers.length ? 'FAIL' : unproven.length ? 'PASS_WITH_GAPS' : 'PASS',
    scope,
    changedFiles: input.changes.length,
    diagnostics: { criticalErrors: errors, total: input.diagnostics.length },
    evidence: { build: input.build, tests: input.tests, unproven },
    blockers,
    note: 'A clean diff review does not prove runtime/deployment success without corresponding host evidence.'
  };
}

export function verifyPatchEvidence(input: DiffReview) {
  const review = reviewDiff(input);
  const claims = [
    { claim: 'Change stayed within declared file scope', verified: review.scope.valid, evidence: `${review.changedFiles} changed file(s) reviewed against scope.` },
    { claim: 'Build passed', verified: input.build.status === 'PASS' && Boolean(input.build.evidence.trim()), evidence: input.build.evidence || 'No build evidence supplied.' },
    { claim: 'Tests passed', verified: input.tests.status === 'PASS' && Boolean(input.tests.evidence.trim()), evidence: input.tests.evidence || 'No test evidence supplied.' },
    { claim: 'No supplied fatal/error diagnostics remain', verified: review.diagnostics.criticalErrors.length === 0, evidence: `${review.diagnostics.criticalErrors.length} ERROR/FATAL diagnostic(s) supplied.` }
  ];
  return { overall: claims.every(c => c.verified) ? 'PASS' : claims.some(c => !c.verified) ? 'PASS_WITH_GAPS' : 'FAIL', claims, reviewVerdict: review.verdict };
}
