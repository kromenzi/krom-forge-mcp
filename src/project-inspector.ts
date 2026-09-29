export type FileEntry = {
  path: string;
  size?: number;
  kind?: 'file' | 'directory';
  sha?: string;
};

export type RouteEntry = {
  path: string;
  file?: string;
  methods?: string[];
  status?: 'known-good' | 'suspect' | 'broken' | 'unknown';
  evidence?: string;
};

export type DiagnosticEntry = {
  source?: string;
  severity?: 'error' | 'warning' | 'info';
  file?: string;
  message: string;
};

export type ProjectSnapshot = {
  projectName?: string;
  root?: string;
  framework?: string;
  language?: string;
  files: FileEntry[];
  packageManifest?: {
    name?: string;
    version?: string;
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    engines?: Record<string, string>;
  };
  routes?: RouteEntry[];
  configs?: Record<string, unknown>;
  git?: {
    branch?: string;
    head?: string;
    dirty?: boolean;
    changedFiles?: string[];
    recentCommits?: Array<{ sha?: string; message?: string }>;
  };
  diagnostics?: DiagnosticEntry[];
  database?: {
    provider?: string;
    migrationFiles?: string[];
    schemaFiles?: string[];
    rlsEvidence?: string[];
  };
  auth?: {
    provider?: string;
    evidenceFiles?: string[];
  };
  buildEvidence?: {
    command?: string;
    exitCode?: number;
    summary?: string;
  };
  testEvidence?: Array<{
    command?: string;
    exitCode?: number;
    summary?: string;
  }>;
};

const lower = (s: string) => s.toLowerCase();
const normalize = (p: string) => p.replace(/\\/g, '/').replace(/^\.\//, '');

function uniq<T>(items: T[]): T[] {
  return [...new Set(items)];
}

function topLevel(path: string): string {
  const n = normalize(path);
  return n.split('/')[0] || n;
}

function ext(path: string): string {
  const m = normalize(path).match(/\.([a-zA-Z0-9]+)$/);
  return m?.[1]?.toLowerCase() ?? '';
}

export function buildProjectInventory(snapshot: ProjectSnapshot) {
  const files = snapshot.files.filter(f => (f.kind ?? 'file') === 'file');
  const byExt: Record<string, number> = {};
  const byTopLevel: Record<string, number> = {};
  for (const f of files) {
    const e = ext(f.path) || '(none)';
    byExt[e] = (byExt[e] ?? 0) + 1;
    const t = topLevel(f.path);
    byTopLevel[t] = (byTopLevel[t] ?? 0) + 1;
  }

  const scripts = snapshot.packageManifest?.scripts ?? {};
  const deps = snapshot.packageManifest?.dependencies ?? {};
  const devDeps = snapshot.packageManifest?.devDependencies ?? {};
  const routeCount = snapshot.routes?.length ?? 0;
  const diagnostics = snapshot.diagnostics ?? [];

  return {
    identity: {
      projectName: snapshot.projectName ?? snapshot.packageManifest?.name ?? 'Unknown',
      root: snapshot.root ?? 'Not supplied',
      framework: snapshot.framework ?? inferFramework(snapshot),
      language: snapshot.language ?? inferLanguage(snapshot)
    },
    counts: {
      files: files.length,
      routes: routeCount,
      dependencies: Object.keys(deps).length,
      devDependencies: Object.keys(devDeps).length,
      scripts: Object.keys(scripts).length,
      diagnostics: diagnostics.length,
      errors: diagnostics.filter(d => d.severity === 'error').length,
      warnings: diagnostics.filter(d => d.severity === 'warning').length
    },
    byExtension: byExt,
    byTopLevel,
    scripts,
    git: snapshot.git ?? null,
    database: snapshot.database ?? null,
    auth: snapshot.auth ?? null,
    evidenceCompleteness: assessEvidenceCompleteness(snapshot)
  };
}

export function inferFramework(snapshot: ProjectSnapshot): string {
  const deps = {
    ...(snapshot.packageManifest?.dependencies ?? {}),
    ...(snapshot.packageManifest?.devDependencies ?? {})
  };
  if (deps.next) return 'Next.js';
  if (deps['@remix-run/react']) return 'Remix';
  if (deps.nuxt) return 'Nuxt';
  if (deps.svelte || deps['@sveltejs/kit']) return 'SvelteKit';
  if (deps.vite) return 'Vite';
  if (deps.react) return 'React';
  return snapshot.framework ?? 'Unknown';
}

export function inferLanguage(snapshot: ProjectSnapshot): string {
  const paths = snapshot.files.map(f => lower(f.path));
  if (paths.some(p => p.endsWith('.ts') || p.endsWith('.tsx'))) return 'TypeScript';
  if (paths.some(p => p.endsWith('.js') || p.endsWith('.jsx'))) return 'JavaScript';
  if (paths.some(p => p.endsWith('.py'))) return 'Python';
  if (paths.some(p => p.endsWith('.go'))) return 'Go';
  return 'Unknown';
}

export function assessEvidenceCompleteness(snapshot: ProjectSnapshot) {
  const checks = [
    { key: 'files', ok: snapshot.files.length > 0, reason: 'Project file inventory supplied' },
    { key: 'manifest', ok: !!snapshot.packageManifest, reason: 'Package manifest supplied' },
    { key: 'routes', ok: (snapshot.routes?.length ?? 0) > 0, reason: 'Route inventory supplied' },
    { key: 'git', ok: !!snapshot.git, reason: 'Git state supplied' },
    { key: 'diagnostics', ok: !!snapshot.diagnostics, reason: 'Diagnostics channel supplied, even if empty' },
    { key: 'build', ok: !!snapshot.buildEvidence, reason: 'Build evidence supplied' }
  ];
  const supplied = checks.filter(c => c.ok).length;
  return {
    score: Math.round((supplied / checks.length) * 100),
    checks,
    conclusion: supplied === checks.length ? 'HIGH' : supplied >= 4 ? 'MEDIUM' : 'LOW'
  };
}

export function mapArchitecture(snapshot: ProjectSnapshot) {
  const files = snapshot.files.map(f => normalize(f.path));
  const modules: Array<{ name: string; evidence: string[] }> = [];
  const add = (name: string, patterns: RegExp[]) => {
    const evidence = files.filter(p => patterns.some(rx => rx.test(lower(p)))).slice(0, 20);
    if (evidence.length) modules.push({ name, evidence });
  };

  add('App / Routes', [/^app\//, /^pages\//, /routes?\//]);
  add('Components / UI', [/components?\//, /ui\//]);
  add('Domain / Features', [/features?\//, /modules?\//, /domain\//]);
  add('API / Server', [/api\//, /server\//, /actions?\//]);
  add('Database', [/supabase\//, /migrations?\//, /schema/, /prisma\//]);
  add('Authentication / Authorization', [/auth/, /middleware/, /rls/, /polic/]);
  add('Tests', [/__tests__\//, /\.test\./, /\.spec\./, /tests?\//]);
  add('Configuration / Deployment', [/vercel/, /next\.config/, /vite\.config/, /tsconfig/, /eslint/, /docker/, /github\/workflows/]);

  const risks: string[] = [];
  if (!modules.some(m => m.name === 'Tests')) risks.push('No test layer is visible in the supplied file inventory.');
  if (snapshot.database && !modules.some(m => m.name === 'Database')) risks.push('Database metadata was supplied, but database/migration files are not visible in the file inventory.');
  if (snapshot.auth && !modules.some(m => m.name === 'Authentication / Authorization')) risks.push('Auth metadata was supplied, but auth/authorization files are not visible in the inventory.');

  return {
    framework: inferFramework(snapshot),
    language: inferLanguage(snapshot),
    modules,
    trustBoundaries: [
      'Browser/client ↔ server/API boundary',
      snapshot.database ? 'Server/API ↔ database boundary' : 'Database boundary not evidenced',
      'Application ↔ external providers/integrations boundary'
    ],
    architectureRisks: risks,
    limitation: 'Architecture map is derived only from the host-supplied snapshot; unsupplied files are not assumed.'
  };
}

export function inventoryDependencies(snapshot: ProjectSnapshot) {
  const prod = snapshot.packageManifest?.dependencies ?? {};
  const dev = snapshot.packageManifest?.devDependencies ?? {};
  const all = { ...prod, ...dev };

  const categories: Record<string, string[]> = {
    framework: [],
    ui: [],
    database: [],
    auth: [],
    testing: [],
    build: [],
    observability: [],
    other: []
  };

  for (const name of Object.keys(all).sort()) {
    const n = lower(name);
    if (/next|react|remix|nuxt|svelte|vue|angular/.test(n)) categories.framework.push(name);
    else if (/tailwind|radix|shadcn|mui|chakra|lucide|heroicons/.test(n)) categories.ui.push(name);
    else if (/supabase|prisma|drizzle|sequelize|postgres|pg$|mongodb/.test(n)) categories.database.push(name);
    else if (/auth|clerk|passport|next-auth/.test(n)) categories.auth.push(name);
    else if (/vitest|jest|playwright|cypress|testing-library/.test(n)) categories.testing.push(name);
    else if (/vite|webpack|turbopack|typescript|eslint|prettier|tsx|swc/.test(n)) categories.build.push(name);
    else if (/sentry|otel|opentelemetry|datadog/.test(n)) categories.observability.push(name);
    else categories.other.push(name);
  }

  const duplicateFamilies: string[] = [];
  if (categories.testing.filter(n => /vitest|jest/.test(lower(n))).length > 1) duplicateFamilies.push('Multiple unit-test runners detected; verify intentional coexistence.');
  if (categories.database.filter(n => /prisma|drizzle|sequelize/.test(lower(n))).length > 1) duplicateFamilies.push('Multiple ORM/data layers detected; verify architectural intent.');
  if (categories.ui.filter(n => /mui|chakra/.test(lower(n))).length > 1) duplicateFamilies.push('Multiple heavyweight UI systems detected; verify design-system consolidation.');

  return {
    production: prod,
    development: dev,
    categories,
    duplicateFamilyWarnings: duplicateFamilies,
    engineRequirements: snapshot.packageManifest?.engines ?? {},
    limitation: 'Version freshness and vulnerability status require current registry/advisory evidence from the host; this tool does not perform network lookup.'
  };
}

function routeLooksBacked(route: RouteEntry, files: string[]): boolean {
  if (route.file) return files.includes(normalize(route.file));
  const p = route.path.replace(/^\//, '').replace(/\[[^\]]+\]/g, '');
  if (!p) return true;
  const segments = p.split('/').filter(Boolean);
  return files.some(f => segments.every(seg => lower(f).includes(lower(seg))));
}

export function detectBrokenRoutes(snapshot: ProjectSnapshot) {
  const files = snapshot.files.map(f => normalize(f.path));
  const routes = snapshot.routes ?? [];
  const findings = routes.map(route => {
    const explicitBroken = route.status === 'broken';
    const missingBacking = !routeLooksBacked(route, files);
    const diagnostic = (snapshot.diagnostics ?? []).find(d => route.file && d.file && normalize(d.file) === normalize(route.file) && d.severity === 'error');
    let status: 'BROKEN' | 'SUSPECT' | 'NO_EVIDENCE_OF_BREAKAGE' = 'NO_EVIDENCE_OF_BREAKAGE';
    const reasons: string[] = [];
    if (explicitBroken) { status = 'BROKEN'; reasons.push('Host marked the route broken.'); }
    if (diagnostic) { status = 'BROKEN'; reasons.push(`Error diagnostic: ${diagnostic.message}`); }
    if (missingBacking && status !== 'BROKEN') { status = 'SUSPECT'; reasons.push('No backing file could be correlated from the supplied inventory.'); }
    if (route.status === 'suspect' && status === 'NO_EVIDENCE_OF_BREAKAGE') { status = 'SUSPECT'; reasons.push('Host marked route suspect.'); }
    return { route: route.path, file: route.file ?? null, status, reasons, evidence: route.evidence ?? '' };
  });

  return {
    total: findings.length,
    broken: findings.filter(f => f.status === 'BROKEN'),
    suspect: findings.filter(f => f.status === 'SUSPECT'),
    clearFromSuppliedEvidence: findings.filter(f => f.status === 'NO_EVIDENCE_OF_BREAKAGE'),
    limitation: routes.length ? 'Static correlation only; runtime/browser evidence is still required before declaring a route operational.' : 'No route inventory supplied.'
  };
}

function stem(path: string): string {
  return normalize(path).split('/').pop()?.replace(/\.[^.]+$/, '').toLowerCase() ?? '';
}

export function detectDuplicates(snapshot: ProjectSnapshot) {
  const files = snapshot.files.filter(f => (f.kind ?? 'file') === 'file');
  const byStem = new Map<string, string[]>();
  const bySha = new Map<string, string[]>();

  for (const f of files) {
    const s = stem(f.path);
    if (s && !['index', 'page', 'layout', 'route', 'types', 'utils'].includes(s)) {
      byStem.set(s, [...(byStem.get(s) ?? []), normalize(f.path)]);
    }
    if (f.sha) bySha.set(f.sha, [...(bySha.get(f.sha) ?? []), normalize(f.path)]);
  }

  const sameContent = [...bySha.entries()].filter(([, paths]) => paths.length > 1).map(([sha, paths]) => ({ sha, paths }));
  const sameName = [...byStem.entries()].filter(([, paths]) => paths.length > 1).map(([name, paths]) => ({ name, paths }));

  return {
    exactContentDuplicates: sameContent,
    nameCollisionsForReview: sameName,
    limitation: 'Exact duplicate detection requires host-supplied content hashes. Name collisions are review candidates, not proof of duplication.'
  };
}

export function findProjectRisks(snapshot: ProjectSnapshot) {
  const risks: Array<{ severity: 'HIGH' | 'MEDIUM' | 'LOW'; area: string; finding: string; evidence: string }> = [];
  const scripts = snapshot.packageManifest?.scripts ?? {};
  const files = snapshot.files.map(f => lower(normalize(f.path)));

  const add = (severity: 'HIGH' | 'MEDIUM' | 'LOW', area: string, finding: string, evidence: string) => risks.push({ severity, area, finding, evidence });

  if (!Object.keys(scripts).some(s => /build/i.test(s))) add('HIGH', 'Build', 'No build script was supplied.', 'packageManifest.scripts');
  if (!Object.keys(scripts).some(s => /test/i.test(s))) add('MEDIUM', 'Testing', 'No test script was supplied.', 'packageManifest.scripts');
  if ((snapshot.diagnostics ?? []).some(d => d.severity === 'error')) add('HIGH', 'Diagnostics', 'Host supplied one or more error diagnostics.', `${snapshot.diagnostics!.filter(d => d.severity === 'error').length} error(s)`);
  if (snapshot.git?.dirty) add('MEDIUM', 'Change Safety', 'Working tree is dirty; unrelated user work may be at risk during broad edits.', (snapshot.git.changedFiles ?? []).join(', ') || 'dirty=true');
  if (snapshot.database && !(snapshot.database.migrationFiles?.length || snapshot.database.schemaFiles?.length)) add('HIGH', 'Database', 'Database is in scope but no migration/schema files were supplied.', snapshot.database.provider ?? 'database');
  if (snapshot.auth && !(snapshot.auth.evidenceFiles?.length)) add('HIGH', 'Authorization', 'Auth is in scope but no auth evidence files were supplied.', snapshot.auth.provider ?? 'auth');
  if (snapshot.database?.provider?.toLowerCase().includes('supabase') && !(snapshot.database.rlsEvidence?.length)) add('HIGH', 'RLS', 'Supabase database supplied without RLS evidence.', 'database.rlsEvidence is empty');
  if (!files.some(f => /test|spec|__tests__/.test(f))) add('MEDIUM', 'Regression', 'No test files are visible in the supplied inventory.', 'file inventory');
  if (!snapshot.buildEvidence) add('MEDIUM', 'Evidence', 'No deterministic build evidence was supplied.', 'buildEvidence missing');
  if (snapshot.buildEvidence && snapshot.buildEvidence.exitCode !== 0) add('HIGH', 'Build', 'Most recent supplied build evidence failed.', snapshot.buildEvidence.summary ?? `exit ${snapshot.buildEvidence.exitCode}`);

  const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
  risks.sort((a, b) => rank[a.severity] - rank[b.severity]);
  return {
    risks,
    blockers: risks.filter(r => r.severity === 'HIGH'),
    conclusion: risks.some(r => r.severity === 'HIGH') ? 'HIGH_RISK_GAPS' : risks.length ? 'RISKS_REQUIRE_REVIEW' : 'NO_MATERIAL_RISK_IDENTIFIED_FROM_SUPPLIED_SNAPSHOT',
    limitation: 'Absence of a finding is not proof of safety when evidence was not supplied.'
  };
}

export function inspectProject(snapshot: ProjectSnapshot) {
  return {
    inventory: buildProjectInventory(snapshot),
    architecture: mapArchitecture(snapshot),
    dependencies: inventoryDependencies(snapshot),
    routes: detectBrokenRoutes(snapshot),
    duplicates: detectDuplicates(snapshot),
    risks: findProjectRisks(snapshot),
    nextActions: [
      'Fill missing snapshot evidence before making unsupported architectural claims.',
      'Resolve HIGH-risk findings before broad feature work.',
      'Use execution evidence for build/type/test claims.',
      'Use browser evidence for rendered UI claims.',
      'Use provider-specific tools for GitHub, database and deployment state.'
    ]
  };
}

export function compareProjectState(before: ProjectSnapshot, after: ProjectSnapshot) {
  const b = buildProjectInventory(before);
  const a = buildProjectInventory(after);
  const beforeFiles = new Set(before.files.map(f => normalize(f.path)));
  const afterFiles = new Set(after.files.map(f => normalize(f.path)));
  const added = [...afterFiles].filter(f => !beforeFiles.has(f));
  const removed = [...beforeFiles].filter(f => !afterFiles.has(f));
  const changedBySha = after.files
    .filter(f => f.sha && before.files.some(bf => normalize(bf.path) === normalize(f.path) && bf.sha && bf.sha !== f.sha))
    .map(f => normalize(f.path));

  return {
    summary: {
      filesBefore: b.counts.files,
      filesAfter: a.counts.files,
      routesBefore: b.counts.routes,
      routesAfter: a.counts.routes,
      diagnosticsBefore: b.counts.diagnostics,
      diagnosticsAfter: a.counts.diagnostics
    },
    addedFiles: added,
    removedFiles: removed,
    changedFilesWithHashes: uniq(changedBySha),
    build: {
      before: before.buildEvidence ?? null,
      after: after.buildEvidence ?? null
    },
    tests: {
      before: before.testEvidence ?? [],
      after: after.testEvidence ?? []
    },
    caution: 'File hashes are required to identify modified same-path files reliably. This comparison does not infer unsupplied changes.'
  };
}
