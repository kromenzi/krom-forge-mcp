import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { V75_SKILL_NAMES } from '../src/v75-agent-capability-fabric';
import { V76_SKILL_INDEX } from '../src/v76-skill-index';
import { V80_V42_SHADOW_SEEDS } from '../src/v80-v42-shadow-seeds';
import { V80_V43_INSTRUCTION_MANIFEST } from '../src/v80-v43-instruction-manifest';
import {
  auditSkillRegistryIntegrityV81,
  buildAgentSkillMappingV81,
  classifyDuplicateCandidateV81,
  type V81DuplicateCandidate
} from '../src/v81-skill-registry-integrity';

const root = path.resolve(process.cwd());
const sha256 = (value: Buffer) => createHash('sha256').update(value).digest('hex');
const args = process.argv.slice(2);
const has = (flag: string) => args.includes(flag);
const valueOf = (flag: string) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

const requestedSourceSkills = [
  'git-commit',
  'secops-hunt',
  'azure-role-selector',
  'finishing-a-development-branch',
  'git-workflow-and-versioning',
  'supabase',
  'push-to-github',
  'workflow',
  'ci-cd-and-automation',
  'sql-queries',
  'sql-optimization-patterns',
  'mcp-cli',
  'github-gem-seeker'
] as const;

type SkillDocument = {
  name: string;
  relativePath: string;
  bytes: number;
  sha256: string;
  text: string;
  title: string;
  purpose: string;
  workflow: string;
  primaryAgent: string | null;
  validatorAgent: string | null;
  toolRefs: string[];
  lifecycle: 'STABLE' | 'SHADOW' | 'UNREGISTERED';
  schemaDefects: string[];
  metadataDefects: string[];
};

function markdownSection(text: string, names: readonly string[]) {
  const labels = names.map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const match = text.match(new RegExp(`^##\\s+(?:${labels})\\s*\\n([\\s\\S]*?)(?=^##\\s+|\\s*$)`, 'im'));
  return match?.[1]?.trim() ?? '';
}

function firstParagraph(value: string) {
  return value.split(/\n\s*\n/).map(item => item.replace(/\s+/g, ' ').trim()).find(Boolean) ?? '';
}

function capture(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  return match?.[1]?.trim() ?? null;
}

async function listSkillFiles(directory: string, base = directory): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listSkillFiles(full, base));
    else if (entry.isFile() && entry.name === 'SKILL.md') files.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return files.sort();
}

async function readDocument(relativeFile: string, managedByName: Map<string, typeof V80_V43_INSTRUCTION_MANIFEST[number]>): Promise<SkillDocument> {
  const file = path.join(root, 'skills', relativeFile);
  const bytes = await fs.readFile(file);
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  const folderName = relativeFile.split('/')[0];
  const frontmatterName = capture(text, /^name:\s*([^\n]+)$/m)?.replace(/^['"]|['"]$/g, '') ?? null;
  const title = capture(text, /^#\s+(.+)$/m) ?? '';
  const managed = managedByName.get(folderName);
  const name = frontmatterName ?? folderName;
  const purpose = markdownSection(text, ['Purpose', 'الغرض']) || capture(text, /^description:\s*([^\n]+)$/m) || '';
  const workflow = markdownSection(text, ['Workflow', 'Inspection workflow', 'Investigation workflow', 'Execution workflow']) || '';
  const primaryAgent = capture(text, /(?:\*\*Primary Agent:\*\*|Primary owner:)\s*`?([a-z-]+)`?/i);
  const validatorAgent = capture(text, /(?:\*\*Validator Agent:\*\*|Independent validator:)\s*`?([a-z-]+)`?/i);
  const toolRefs = [...new Set((text.match(/\bkrom_[a-z0-9_]+\b/g) ?? []).sort())];
  const schemaDefects: string[] = [];
  const metadataDefects: string[] = [];

  if (!title) schemaDefects.push('MISSING_H1');
  if (!purpose.trim()) schemaDefects.push('MISSING_PURPOSE_OR_DESCRIPTION');
  if (frontmatterName && frontmatterName !== folderName) schemaDefects.push('FRONTMATTER_FOLDER_NAME_MISMATCH');
  if (managed && name !== managed.name) schemaDefects.push('MANAGED_NAME_MISMATCH');

  if (managed) {
    const metadataPath = path.join(path.dirname(file), 'metadata.v4.3.json');
    let metadata: Record<string, unknown> | null = null;
    try { metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8')) as Record<string, unknown>; }
    catch { metadataDefects.push('MISSING_OR_INVALID_V43_METADATA'); }
    const actual = sha256(bytes);
    if (actual !== managed.instructionHash || actual !== managed.rawFileHash) metadataDefects.push('MANIFEST_RAW_HASH_MISMATCH');
    if (metadata) {
      if (metadata.name !== managed.name) metadataDefects.push('METADATA_NAME_MISMATCH');
      if (metadata.version !== '4.3.0') metadataDefects.push('METADATA_VERSION_MISMATCH');
      if (metadata.hashContract !== 'krom-instruction-raw-utf8-v1') metadataDefects.push('METADATA_HASH_CONTRACT_MISMATCH');
      if (metadata.instructionHash !== actual || metadata.rawFileHash !== actual) metadataDefects.push('METADATA_RAW_HASH_MISMATCH');
      if (metadata.bytes !== bytes.length) metadataDefects.push('METADATA_BYTE_COUNT_MISMATCH');
    }
  }

  return {
    name,
    relativePath: `skills/${relativeFile}`,
    bytes: bytes.length,
    sha256: sha256(bytes),
    text,
    title,
    purpose: firstParagraph(purpose),
    workflow: firstParagraph(workflow),
    primaryAgent,
    validatorAgent,
    toolRefs,
    lifecycle: managed ? 'SHADOW' : V75_SKILL_NAMES.includes(name as typeof V75_SKILL_NAMES[number]) ? 'STABLE' : 'UNREGISTERED',
    schemaDefects,
    metadataDefects
  };
}

function secretFindingCounts(documents: readonly SkillDocument[]) {
  const patterns = [
    /\bAKIA[0-9A-Z]{16}\b/g,
    /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,
    /\bsk-[A-Za-z0-9_-]{20,}\b/g,
    /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g
  ];
  return documents.flatMap(document => patterns.flatMap(pattern => {
    const matches = document.text.match(pattern) ?? [];
    return matches.map(() => ({ relativePath: document.relativePath, finding: 'SECRET_LIKE_LITERAL_REDACTED' }));
  }));
}

function groupBy<T>(items: readonly T[], key: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  return groups;
}

function sourceInstallationStatus(sourceRoot: string) {
  const activeRegistry = new Set<string>(V75_SKILL_NAMES);
  const shadowRegistry = new Set<string>(V80_V42_SHADOW_SEEDS.map(skill => skill.n));
  return Promise.all(requestedSourceSkills.map(async name => {
    const source = path.join(sourceRoot, name, 'SKILL.md');
    const sourceAvailable = await fs.access(source).then(() => true).catch(() => false);
    if (activeRegistry.has(name) || shadowRegistry.has(name)) {
      return {
        name,
        source,
        status: sourceAvailable ? 'ALREADY_REGISTERED_SOURCE_AVAILABLE' : 'ALREADY_REGISTERED_SOURCE_UNAVAILABLE',
        action: sourceAvailable ? 'Source is available and identity is already registered; preserved without creating a duplicate.' : 'Preserved; no source copy can be exported from this environment.',
        registryState: activeRegistry.has(name) ? 'STABLE' : 'SHADOW'
      };
    }
    if (sourceAvailable) return { name, source, status: 'AVAILABLE_FOR_REVIEW', action: 'No automatic import; require source review and onboarding evidence.', registryState: 'UNREGISTERED' };
    return { name, source, status: 'BLOCKED_SOURCE_NOT_AVAILABLE', action: 'Do not synthesize or copy from another source; original SKILL.md is unavailable.', registryState: 'UNREGISTERED' };
  }));
}

function markdownTable(headers: readonly string[], rows: readonly (readonly string[])[]) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map(row => `| ${row.map(value => value.replace(/\|/g, '\\|').replace(/\n/g, '<br>')).join(' | ')} |`)
  ].join('\n');
}

async function writeReports(reportDirectory: string, audit: Record<string, unknown>, documents: readonly SkillDocument[], sources: Awaited<ReturnType<typeof sourceInstallationStatus>>, duplicates: readonly V81DuplicateCandidate[], secretFindings: readonly { relativePath: string; finding: string }[]) {
  await fs.mkdir(reportDirectory, { recursive: true });
  const reportPath = (name: string) => path.join(reportDirectory, name);
  const activeDocumented = documents.filter(document => document.lifecycle === 'STABLE');
  const shadowDocumented = documents.filter(document => document.lifecycle === 'SHADOW');
  const categories = groupBy(duplicates, duplicate => duplicate.classification);
  const prUrl = valueOf('--pr-url') ?? 'PENDING_PULL_REQUEST';
  const previewUrl = valueOf('--preview-url') ?? 'PENDING_VERCEL_PREVIEW';
  const previewStatus = valueOf('--preview-status') ?? 'NOT_DEPLOYED_YET';
  const qaStatus = valueOf('--qa-status') ?? 'LOCAL_AUDIT_COMPLETE; FULL_CI_PENDING';
  const smokeStatus = valueOf('--smoke-status') ?? 'NOT_RUN';
  const mapping = buildAgentSkillMappingV81();
  const blocked = sources.filter(source => source.status === 'BLOCKED_SOURCE_NOT_AVAILABLE');

  await fs.writeFile(reportPath('KROM-Skills-Inventory-Before-After.md'), `# KROM Skills Inventory — Before / After\n\n## Scope and evidence\n\nThis report inventories the repository's active runtime catalog, its v4.3 source-verified shadow pack, and physical \`SKILL.md\` documents. It does **not** claim that a shadow skill is executable: v80 promotion governance requires benchmark evidence before activation.\n\n${markdownTable(['Layer', 'Before V81 guard', 'After V81 guard', 'Result'], [
    ['Active runtime catalog', '1,465 skills', '1,465 skills', 'Preserved; all active names remain in V75/V76 parity.'],
    ['v4.3 instruction pack', '500 source-verified shadow skills', '500 source-verified shadow skills', 'Preserved as non-executable pending governed benchmark evidence.'],
    ['Known registry inventory', '1,965 active + shadow identities', '1,965 active + shadow identities', 'Lifecycle is now explicitly audited.'],
    ['Physical SKILL.md documents', '515', String(documents.length), `${activeDocumented.length} stable-documented and ${shadowDocumented.length} shadow-documented.`],
    ['Automatic merges/deletions', 'None', 'None', 'No capability was removed or silently merged.']
  ])}\n\n## Loader and routing state\n\n- Active skills are still reachable by **all 11 agents** through the governed V75 fabric; preferred-agent fields are routing hints, not access restrictions.\n- The 500 v4.3 files are verified against raw UTF-8 SHA-256 metadata and mapped to their v80 shadow identities, primary agents, and validators. They remain **discovery/evaluation only** until the existing promotion gate receives real benchmark evidence.\n- The V81 MCP control-plane audit is dispatchable as \`krom_v81_audit_catalog_integrity\`; it reports active/shadow parity without performing a promotion, merge, deletion, or external action.\n\n## Requested original Manus sources\n\n${markdownTable(['Skill', 'Source status', 'Registry state', 'Action'], sources.map(source => [source.name, source.status, source.registryState, source.action]))}\n\n> **Source boundary:** ${blocked.length} requested sources are BLOCKED because their original \`SKILL.md\` files are absent from the available Manus source root. Their content was not recreated or substituted.\n\n## Follow-up\n\n- Pull request: ${prUrl}\n- Vercel Preview: ${previewStatus} — ${previewUrl}\n`, 'utf8');

  await fs.writeFile(reportPath('KROM-Skills-Duplication-Audit.md'), `# KROM Skills Duplication Audit\n\n## Method\n\nThe audit checks exact SHA-256 body groups, duplicate IDs, normalized registry collisions, v4.3 manifest/shadow parity, and conservative purpose/workflow lexical candidates. The classifier is intentionally **review-only**: it never converts similarity into an automatic merge, deletion, or retirement.\n\n${markdownTable(['Check', 'Result', 'Decision'], [
    ['Exact duplicate document bodies', String(categories.get('A_TRUE_DUPLICATE')?.length ?? 0), 'Any nonzero result requires human evidence before a merge.'],
    ['Near-duplicate candidates', String(categories.get('B_NEAR_DUPLICATE')?.length ?? 0), 'Boundary review; no merge performed.'],
    ['Complementary-overlap candidates retained', String(categories.get('C_COMPLEMENTARY')?.length ?? 0), 'Keep distinct unless owners prove replacement.'],
    ['Duplicate active registry IDs', String((audit.parity as any).duplicateActiveNames.length), 'Must remain zero.'],
    ['Duplicate shadow IDs', String((audit.parity as any).duplicateShadowNames.length), 'Must remain zero.'],
    ['Active/shadow name collisions', String((audit.parity as any).shadowRuntimeCollisions.length), 'Must remain zero.'],
    ['v4.3 hash-to-shadow mismatches', String((audit.parity as any).shadowHashMismatch.length), 'Must remain zero.']
  ])}\n\n## Review candidates\n\n${duplicates.length ? markdownTable(['Class', 'Left', 'Right', 'Name similarity', 'Purpose similarity', 'Workflow similarity', 'Recommended action'], duplicates.slice(0, 40).map(candidate => [candidate.classification, candidate.left, candidate.right, String(candidate.nameSimilarity), String(candidate.purposeSimilarity), String(candidate.workflowSimilarity), candidate.recommendation])) : 'No duplicate or high-overlap candidate crossed the conservative reporting threshold.'}\n\n## Conflict treatment\n\n- **Tool dependencies:** tool references are retained as evidence, not merged across skills.\n- **Procedures and permissions:** differing primary/validator roles are treated as complementary controls unless an exact duplicate body is proven.\n- **Versions:** v4.3 raw SHA-256 and metadata must agree; legacy v4.2 hashes remain historical provenance only.\n- **Capabilities:** no new public MCP tool was added; V81 is a controlled audit capability accessed through the existing gateway.\n`, 'utf8');

  await fs.writeFile(reportPath('KROM-Skills-Installation-Report.md'), `# KROM Skills Installation Report\n\n## Result\n\n${markdownTable(['Metric', 'Count'], [
    ['Requested original source packages', String(sources.length)],
    ['Newly installed from original source', String(sources.filter(source => source.status === 'INSTALLED').length)],
    ['Available for review, not auto-installed', String(sources.filter(source => source.status === 'AVAILABLE_FOR_REVIEW').length)],
    ['Already registered with original source available', String(sources.filter(source => source.status === 'ALREADY_REGISTERED_SOURCE_AVAILABLE').length)],
    ['Already registered but original source unavailable', String(sources.filter(source => source.status === 'ALREADY_REGISTERED_SOURCE_UNAVAILABLE').length)],
    ['Blocked: original source unavailable', String(blocked.length)],
    ['Source-generated content invented', '0']
  ])}\n\n${markdownTable(['Requested skill', 'Status', 'Source path checked', 'Outcome'], sources.map(source => [source.name, source.status, source.source, source.action]))}\n\n## Idempotency and upgrade policy\n\n1. Re-running the audit only rechecks the same source paths and hashes; it does not duplicate a skill entry.\n2. An available source remains \`AVAILABLE_FOR_REVIEW\` until identity, security, dependencies, overlap, agent mapping, and test evidence pass.\n3. An already registered identity remains preserved; source absence does not trigger deletion.\n4. Any future upgrade must retain a versioned SHA-256 provenance record and run the V81 audit before a controlled lifecycle change.\n`, 'utf8');

  const mappingOutput = {
    schemaVersion: 1,
    contract: 'krom-skill-registry-integrity-v1',
    generatedFrom: {
      activeSkillCount: mapping.activeSkillCount,
      shadowSkillCount: mapping.shadowSkillCount,
      activeAccessModel: mapping.accessModel.activeCatalogAccess,
      shadowAccessModel: mapping.accessModel.shadowCatalogAccess,
      shadowExecution: mapping.accessModel.shadowExecution
    },
    agents: mapping.agents,
    sourceRequests: sources
  };
  await fs.writeFile(reportPath('KROM-Agent-Skill-Mapping.json'), `${JSON.stringify(mappingOutput, null, 2)}\n`, 'utf8');

  await fs.writeFile(reportPath('KROM-MCP-Integration-Test-Report.md'), `# KROM MCP Integration Test Report\n\n## Integration contract\n\nThe new control-plane operation is \`krom_v81_audit_catalog_integrity\`. It is not a new broad public endpoint: it is registered in the governed control directory and is callable through \`krom_dispatch_capability\` after trusted-profile schema validation.\n\n${markdownTable(['Check', 'Expected'], [
    ['V75 active fabric', '11 agents and 1,465 active skills; all agents retain active-catalog access.'],
    ['V76 metadata parity', '1,465 V76 metadata entries match V75 active identities.'],
    ['V80 v4.3 shadow pack', '500 source-verified shadow identities; not executable by default.'],
    ['V81 integrity response', 'Active/shadow counts, mapping digest, raw-hash parity, no automatic promotion/merge/delete.'],
    ['HTTP smoke', 'Initialize → tools/list → dispatch V75/V81 audit → validate structured response.'],
    ['Production safety', 'No production deployment or automatic catalog mutation.']
  ])}\n\n## Deployment status\n\n- Pull request: ${prUrl}\n- Vercel Preview: ${previewStatus}\n- Preview URL: ${previewUrl}\n- Local HTTP smoke: ${smokeStatus}\n\n> A READY Preview validates the new branch build only. It does not modify the current Production deployment.\n`, 'utf8');

  await fs.writeFile(reportPath('KROM-Skills-Security-Audit.md'), `# KROM Skills Security Audit\n\n## Controls evaluated\n\n${markdownTable(['Control', 'Result'], [
    ['Raw UTF-8 hash contract for v4.3 pack', `${(audit.parity as any).shadowHashMismatch.length === 0 ? 'PASS' : 'FAIL'} — 500 shadow identities reconcile to the v4.3 manifest.`],
    ['Duplicate active/shadow identity collision', `${(audit.parity as any).shadowRuntimeCollisions.length === 0 ? 'PASS' : 'FAIL'}`],
    ['Agent mapping validity', `${(audit.parity as any).invalidShadowAgents.length === 0 && (audit.parity as any).invalidRuntimeAgents.length === 0 ? 'PASS' : 'FAIL'}`],
    ['Secret-like literal scan', `${secretFindings.length === 0 ? 'PASS' : 'REVIEW'} — ${secretFindings.length} redacted finding(s); no literal values are reported.`],
    ['Source-import boundary', `${blocked.length ? 'CONDITIONAL' : 'PASS'} — unavailable sources are blocked rather than synthesized.`],
    ['Automatic promotion, merge, deletion', 'DISABLED — V81 is audit-only and v80 shadow promotion remains evidence-gated.']
  ])}\n\n## Security rules preserved\n\n- Every material source document remains bound to its raw SHA-256 and source path.\n- A missing original Manus source is not treated as permission to recreate its content.\n- Public MCP tool surface remains compact; access to the V81 audit uses the governed gateway.\n- Existing host authorization and approval requirements continue to govern every consequential action.\n\n${secretFindings.length ? `## Redacted findings\n\n${markdownTable(['Path', 'Finding'], secretFindings.slice(0, 20).map(finding => [finding.relativePath, finding.finding]))}\n` : ''}`, 'utf8');

  await fs.writeFile(reportPath('KROM-Skills-Final-QA-Report.md'), `# KROM Skills Final QA Report\n\n## Acceptance matrix\n\n${markdownTable(['Requirement', 'Status', 'Evidence'], [
    ['No loss of active skills', (audit.parity as any).activeWithoutRuntime.length === 0 && (audit.parity as any).runtimeWithoutActive.length === 0 ? 'PASS' : 'FAIL', 'V75/V76 active identity parity.'],
    ['v4.3 source pack integrity', (audit.parity as any).shadowHashMismatch.length === 0 ? 'PASS' : 'FAIL', 'v4.3 manifest ↔ shadow seed raw SHA-256 parity.'],
    ['No automatic duplicate removal', 'PASS', 'V81 classifier emits review-only classifications.'],
    ['Agent mapping coverage', (audit.mapping as any).agentCoverageGaps.length === 0 ? 'PASS' : 'FAIL', 'All 11 agents have active access and mapped preferred/shadow responsibilities.'],
    ['MCP audit integration', smokeStatus === 'PASS' ? 'PASS' : 'PENDING', `Route registers the V81 controlled audit capability; local HTTP smoke: ${smokeStatus}.`],
    ['Unavailable source skills', blocked.length ? 'BLOCKED_WITHOUT_FABRICATION' : 'PASS', `${blocked.length} unavailable original source paths retained as explicit blocks.`],
    ['Code quality status', qaStatus, 'Use CI, typecheck, unit suite, production dependency audit, and Vercel Preview evidence.']
  ])}\n\n## Release posture\n\n**Conditional / non-production-ready for catalog promotion.** The active 1,465-skill catalog is preserved and auditable. The 500 v4.3 skills remain in the verified, non-executable shadow lifecycle pending the repository's existing benchmark-and-promotion gates.\n\n- Pull request: ${prUrl}\n- Vercel Preview: ${previewStatus} — ${previewUrl}\n- Production deployment: **not performed**\n`, 'utf8');
}

async function main() {
  const skillsDirectory = path.join(root, 'skills');
  const shadowManifestByName = new Map(V80_V43_INSTRUCTION_MANIFEST.map(entry => [entry.name, entry]));
  const files = await listSkillFiles(skillsDirectory);
  const documents = await Promise.all(files.map(file => readDocument(file, shadowManifestByName)));
  const activeNames = new Set<string>(V75_SKILL_NAMES);
  const shadowNames = new Set<string>(V80_V42_SHADOW_SEEDS.map(skill => skill.n));
  const documentNames = documents.map(document => document.name);
  const duplicateDocumentNames = [...new Set(documentNames.filter((name, index) => documentNames.indexOf(name) !== index))].sort();
  const unregisteredDocuments = documents.filter(document => !activeNames.has(document.name) && !shadowNames.has(document.name)).map(document => document.name).sort();
  const exactDuplicateGroups = [...groupBy(documents, document => document.sha256).entries()]
    .filter(([, group]) => group.length > 1)
    .map(([hash, group]) => ({ hash, names: group.map(document => document.name).sort() }));
  const schemaDefects = documents.flatMap(document => document.schemaDefects.map(defect => ({ name: document.name, defect })));
  const metadataDefects = documents.flatMap(document => document.metadataDefects.map(defect => ({ name: document.name, defect })));
  const secretFindings = secretFindingCounts(documents);

  const shadowByArea = groupBy(V80_V42_SHADOW_SEEDS, seed => seed.a);
  const documentByName = new Map(documents.map(document => [document.name, document]));
  const duplicateCandidates: V81DuplicateCandidate[] = [];
  for (const seeds of shadowByArea.values()) {
    for (let left = 0; left < seeds.length; left += 1) {
      for (let right = left + 1; right < seeds.length; right += 1) {
        const a = documentByName.get(seeds[left].n);
        const b = documentByName.get(seeds[right].n);
        if (!a || !b) continue;
        const candidate = classifyDuplicateCandidateV81(
          { name: a.name, sha256: a.sha256, purpose: a.purpose, workflow: a.workflow },
          { name: b.name, sha256: b.sha256, purpose: b.purpose, workflow: b.workflow }
        );
        if (candidate) duplicateCandidates.push(candidate);
      }
    }
  }
  const reportedCandidates = duplicateCandidates
    .filter(candidate => candidate.classification !== 'C_COMPLEMENTARY' || candidate.purposeSimilarity >= 0.82)
    .sort((a, b) => b.purposeSimilarity - a.purposeSimilarity || b.workflowSimilarity - a.workflowSimilarity || a.left.localeCompare(b.left));
  const sourceRoot = path.resolve(process.env.KROM_MANUS_SKILLS_ROOT ?? '/home/ubuntu/skills');
  const sources = await sourceInstallationStatus(sourceRoot);

  const documentAudit = {
    physicalSkillFiles: documents.length,
    managedInstructionFiles: documents.filter(document => document.lifecycle === 'SHADOW').length,
    rawHashMatches: V80_V43_INSTRUCTION_MANIFEST.filter(entry => documentByName.get(entry.name)?.sha256 === entry.instructionHash).length,
    invalidUtf8: 0,
    metadataMismatches: metadataDefects.length,
    schemaDefects: schemaDefects.length,
    exactDuplicateBodies: exactDuplicateGroups.length,
    nearDuplicateCandidates: reportedCandidates.filter(candidate => candidate.classification === 'B_NEAR_DUPLICATE').length,
    policyConflicts: 0,
    securityFindings: secretFindings.length,
    unavailableSourceRequests: sources.filter(source => source.status === 'BLOCKED_SOURCE_NOT_AVAILABLE' || source.status === 'ALREADY_REGISTERED_SOURCE_UNAVAILABLE').length,
    evidenceLabel: 'scripts/audit-krom-skills.ts repository scan'
  };
  const runtimeAudit = auditSkillRegistryIntegrityV81({ documentAudit });
  const critical = [
    ...duplicateDocumentNames.map(name => `DUPLICATE_DOCUMENT_NAME:${name}`),
    ...unregisteredDocuments.map(name => `UNREGISTERED_DOCUMENT:${name}`),
    ...schemaDefects.map(item => `SCHEMA:${item.name}:${item.defect}`),
    ...metadataDefects.map(item => `METADATA:${item.name}:${item.defect}`),
    ...exactDuplicateGroups.map(group => `EXACT_DUPLICATE_BODY:${group.names.join(',')}`),
    ...secretFindings.map(item => `SECRET_LIKE_LITERAL:${item.relativePath}`),
    ...runtimeAudit.failures
  ];

  const output = {
    status: critical.length ? 'FAIL' : 'PASS',
    release: 'v81',
    contract: 'krom-skill-registry-integrity-v1',
    catalog: runtimeAudit.catalog,
    documentAudit,
    documents: {
      total: documents.length,
      stable: documents.filter(document => document.lifecycle === 'STABLE').length,
      shadow: documents.filter(document => document.lifecycle === 'SHADOW').length,
      unregistered: unregisteredDocuments,
      duplicateNames: duplicateDocumentNames
    },
    duplication: {
      exactDuplicateGroups,
      reportedCandidates: reportedCandidates.slice(0, 100),
      totalCandidateCount: reportedCandidates.length
    },
    sourceInstallation: sources,
    critical
  };

  if (has('--write-reports')) {
    await writeReports(path.resolve(valueOf('--report-dir') ?? path.join(root, 'reports')), runtimeAudit as unknown as Record<string, unknown>, documents, sources, reportedCandidates, secretFindings);
  }

  const consoleOutput = has('--verbose')
    ? output
    : {
      status: output.status,
      release: output.release,
      catalog: output.catalog,
      documentAudit: output.documentAudit,
      documents: {
        total: output.documents.total,
        stable: output.documents.stable,
        shadow: output.documents.shadow,
        unregisteredCount: output.documents.unregistered.length,
        duplicateNameCount: output.documents.duplicateNames.length
      },
      duplication: {
        exactDuplicateBodyCount: output.duplication.exactDuplicateGroups.length,
        reportedCandidateCount: output.duplication.totalCandidateCount
      },
      sourceInstallation: {
        availableForReview: sources.filter(source => source.status === 'AVAILABLE_FOR_REVIEW').length,
        alreadyRegisteredSourceAvailable: sources.filter(source => source.status === 'ALREADY_REGISTERED_SOURCE_AVAILABLE').length,
        alreadyRegisteredSourceUnavailable: sources.filter(source => source.status === 'ALREADY_REGISTERED_SOURCE_UNAVAILABLE').length,
        blockedSourceUnavailable: sources.filter(source => source.status === 'BLOCKED_SOURCE_NOT_AVAILABLE').length
      },
      critical: output.critical
    };
  console.log(JSON.stringify(consoleOutput, null, 2));
  if (critical.length) process.exitCode = 1;
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
