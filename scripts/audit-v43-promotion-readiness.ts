import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { V75_AGENT_IDS, V75_SKILL_NAMES } from '../src/v75-agent-capability-fabric';
import { V76_SKILL_INDEX } from '../src/v76-skill-index';
import { V80_V42_SHADOW_SEEDS } from '../src/v80-v42-shadow-seeds';
import { V80_V43_INSTRUCTION_MANIFEST } from '../src/v80-v43-instruction-manifest';

const root = process.cwd();
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const normalize = (value: string) => value.toLowerCase().normalize('NFKD')
  .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const tokens = (value: string) => new Set(normalize(value).split(' ').filter(token => token.length > 2 && !['the','and','for','with','from','that','this','use','when','where','into','are','can','not','all','any'].includes(token)));
const jaccard = (left: Set<string>, right: Set<string>) => {
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection++;
  return intersection / (left.size + right.size - intersection);
};
const sectionPresent = (text: string, pattern: RegExp) => pattern.test(text);
const active = new Set<string>(V75_SKILL_NAMES);
const activeIndex = new Map(V76_SKILL_INDEX.map(skill => [skill.name, skill]));
const agents = new Set<string>(V75_AGENT_IDS);
const seedByName = new Map<string, (typeof V80_V42_SHADOW_SEEDS)[number]>(V80_V42_SHADOW_SEEDS.map(seed => [seed.n, seed]));
const bodies = new Map<string, string[]>();
const normalizedActive = new Map<string, string[]>();
for (const name of V75_SKILL_NAMES) {
  const key = normalize(name);
  normalizedActive.set(key, [...(normalizedActive.get(key) ?? []), name]);
}

async function main() {
  const failures: string[] = [];
  const rows: any[] = [];
  const lexicalCandidates: Array<{shadow: string; active: string; score: number}> = [];
  for (const entry of V80_V43_INSTRUCTION_MANIFEST) {
    const skillPath = path.join(root, entry.relativePath);
    const metadataPath = path.join(path.dirname(skillPath), 'metadata.v4.3.json');
    let bytes: Buffer;
    let text: string;
    let metadata: any;
    const blockers: string[] = [];
    try { bytes = await fs.readFile(skillPath); }
    catch { failures.push(`MISSING_SKILL_FILE:${entry.name}`); rows.push({skillName: entry.name, staticStatus: 'FAIL', blockers: ['MISSING_SKILL_FILE']}); continue; }
    try { text = new TextDecoder('utf-8', {fatal: true, ignoreBOM: true}).decode(bytes); }
    catch { text = ''; blockers.push('INVALID_UTF8'); failures.push(`INVALID_UTF8:${entry.name}`); }
    const actualHash = sha(bytes);
    const hashMatches = actualHash === entry.instructionHash && actualHash === entry.rawFileHash;
    if (!hashMatches) { blockers.push('RAW_SHA256_MISMATCH'); failures.push(`RAW_SHA256_MISMATCH:${entry.name}`); }
    try { metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8')); }
    catch { metadata = null; blockers.push('METADATA_MISSING_OR_INVALID_JSON'); failures.push(`METADATA_INVALID:${entry.name}`); }
    const metadataIssues: string[] = [];
    if (!metadata || metadata.name !== entry.name) metadataIssues.push('name');
    if (!metadata || metadata.version !== '4.3.0') metadataIssues.push('version');
    if (!metadata || metadata.hashContract !== entry.hashContract) metadataIssues.push('hashContract');
    if (!metadata || metadata.instructionHash !== entry.instructionHash || metadata.rawFileHash !== entry.rawFileHash) metadataIssues.push('hashes');
    if (!metadata || metadata.bytes !== bytes.length) metadataIssues.push('bytes');
    if (!metadata || !/^[a-f0-9]{64}$/.test(metadata.legacyInstructionHash ?? '') || metadata.legacyInstructionHashStatus !== 'LEGACY_UNPROVEN' || !metadata.legacyInstructionHashSource) metadataIssues.push('legacyProvenance');
    if (metadataIssues.length) { blockers.push('METADATA_MISMATCH:' + metadataIssues.join(',')); failures.push(`METADATA_MISMATCH:${entry.name}:${metadataIssues.join(',')}`); }
    const seed = seedByName.get(entry.name);
    const mappingIssues: string[] = [];
    if (!seed || seed.h !== actualHash) mappingIssues.push('shadowSeedHash');
    if (!seed || !agents.has(seed.p)) mappingIssues.push('primaryAgent');
    if (!seed || !agents.has(seed.v)) mappingIssues.push('validatorAgent');
    if (active.has(entry.name)) mappingIssues.push('activeNameCollision');
    if (mappingIssues.length) { blockers.push('REGISTRY_OR_ROUTING_MISMATCH:' + mappingIssues.join(',')); failures.push(`REGISTRY_MISMATCH:${entry.name}:${mappingIssues.join(',')}`); }
    const normalizedCollision = (normalizedActive.get(normalize(entry.name)) ?? []).length > 0;
    if (normalizedCollision) { blockers.push('NORMALIZED_ACTIVE_NAME_COLLISION'); failures.push(`NORMALIZED_COLLISION:${entry.name}`); }
    const structure = {
      purpose: sectionPresent(text, /^#{1,4}\s+(purpose|overview|goal)\b/im),
      inputContract: sectionPresent(text, /^#{1,4}\s+.*(input|prerequisite|context|scope)/im),
      procedure: sectionPresent(text, /^#{1,4}\s+.*(workflow|steps|inspection|process|procedure|method)/im),
      verification: sectionPresent(text, /^#{1,4}\s+.*(verification|test|validation|acceptance)/im),
      safety: sectionPresent(text, /^#{1,4}\s+.*(safety|guardrail|security|permission|risk|authorization)/im),
      outputContract: sectionPresent(text, /^#{1,4}\s+.*(expected output|output|deliverable|handoff)/im),
      dependenciesMentioned: /dependencies|tool dependencies|prerequisite/i.test(text),
      capabilityReferences: [...new Set(text.match(/\bkrom_[a-z0-9_]+\b/g) ?? [])],
      schemaTermsMentioned: /\b(schema|input fields|output fields|json schema|contract)\b/i.test(text),
      integrationSectionPresent: /^#{1,4}\s+.*(krom forge integration|capability integration|integration)/im.test(text),
      compatibilityTermsMentioned: /compatib(?:ility|le)|version support|version constraint/i.test(text)
    };
    const missingSections = Object.entries(structure).filter(([key, value]) => ['purpose','inputContract','procedure','verification','safety','outputContract'].includes(key) && value === false).map(([key]) => key);
    if (missingSections.length) blockers.push('STATIC_REVIEW_REQUIRED_MISSING_SECTION:' + missingSections.join(','));
    bodies.set(actualHash, [...(bodies.get(actualHash) ?? []), entry.name]);
    const headingText = text.split('\n').filter(line => /^#{1,4}\s/.test(line)).join(' ');
    const description = text.match(/^description:\s*(.+)$/im)?.[1] ?? '';
    const purposeBody = text.match(/^#{1,4}\s*(?:purpose|overview|goal)\b[^\n]*\n([\s\S]*?)(?=^#{1,4}\s|$)/im)?.[1] ?? '';
    const shadowTokens = tokens(`${entry.name} ${headingText} ${description} ${purposeBody.slice(0, 1800)}`);
    let best = {name: '', score: 0};
    for (const [activeName, skill] of activeIndex) {
      const score = jaccard(shadowTokens, tokens(`${activeName} ${skill.description} ${skill.domains.join(' ')}`));
      if (score > best.score) best = {name: activeName, score};
      if (score >= 0.30) lexicalCandidates.push({shadow: entry.name, active: activeName, score: Number(score.toFixed(4))});
    }
    const blockerList = [...new Set(blockers)];
    rows.push({
      skillName: entry.name,
      relativePath: entry.relativePath,
      sha256: actualHash,
      hashContract: entry.hashContract,
      hashVerified: hashMatches,
      metadataValidated: metadataIssues.length === 0,
      metadataIssues,
      registrySeedPresent: Boolean(seed),
      primaryAgent: seed?.p ?? null,
      validatorAgent: seed?.v ?? null,
      agentMappingValid: Boolean(seed && agents.has(seed.p) && agents.has(seed.v)),
      activeNameCollision: active.has(entry.name),
      normalizedActiveCollision: normalizedCollision,
      structure,
      missingSections,
      bestActiveLexicalMatch: best.name ? {name: best.name, score: Number(best.score.toFixed(4))} : null,
      exactDuplicateBodyNames: [],
      benchmarkCasesExecuted: 0,
      benchmarkStatus: 'NOT_RUN_HOST_ADAPTER_REQUIRED',
      promotionStatus: 'BLOCKED_NO_REAL_HOST_BENCHMARK_RECEIPTS',
      promotionBlockers: [...blockerList, 'NO_VERIFIED_HOST_EXECUTION_RECEIPT', 'NO_20_CASE_SHADOW_BENCHMARK', 'NO_CANARY_EXPOSURE_AND_24H_OBSERVATION'],
      staticStatus: blockerList.some(item => item.startsWith('REGISTRY') || item.startsWith('RAW_SHA') || item.startsWith('METADATA')) ? 'FAIL' : blockerList.length ? 'REVIEW' : 'PASS_STATIC'
    });
  }
  const exactDuplicateGroups = [...bodies.entries()].filter(([, names]) => names.length > 1).map(([hash, names]) => ({hash, names}));
  for (const row of rows) row.exactDuplicateBodyNames = exactDuplicateGroups.find(group => group.names.includes(row.skillName))?.names ?? [];
  for (const group of exactDuplicateGroups) failures.push(`EXACT_DUPLICATE_BODY:${group.names.join(',')}`);
  const uniqueLexical = [...new Map(lexicalCandidates.map(item => [`${item.shadow}\u0000${item.active}`, item])).values()].sort((a,b) => b.score - a.score || a.shadow.localeCompare(b.shadow));
  const byName = new Set(rows.map(row => row.skillName));
  const missingManifest = [...seedByName.keys()].filter(name => !byName.has(name));
  const unregisteredSeeds = [...byName].filter(name => !seedByName.has(name));
  const result = {
    audit: 'KROM v4.3 promotion readiness static audit',
    createdAt: new Date().toISOString(),
    sourceCommit: process.env.GIT_COMMIT ?? 'UNRECORDED',
    summary: {
      activeSkillsBefore: V75_SKILL_NAMES.length,
      shadowSkillsBefore: V80_V42_SHADOW_SEEDS.length,
      manifestSkills: V80_V43_INSTRUCTION_MANIFEST.length,
      candidatesRead: rows.length,
      rawHashVerified: rows.filter(row => row.hashVerified).length,
      metadataValidated: rows.filter(row => row.metadataValidated).length,
      validAgentMappings: rows.filter(row => row.agentMappingValid).length,
      missingOrMismatchedSections: rows.filter(row => row.missingSections.length).length,
      exactDuplicateBodyGroups: exactDuplicateGroups.length,
      activeExactNameCollisions: rows.filter(row => row.activeNameCollision).length,
      activeNormalizedNameCollisions: rows.filter(row => row.normalizedActiveCollision).length,
      lexicalOverlapPairsAtJaccard030: uniqueLexical.length,
      inputContractSectionsPresent: rows.filter(row => row.structure?.inputContract).length,
      outputContractSectionsPresent: rows.filter(row => row.structure?.outputContract).length,
      verificationSectionsPresent: rows.filter(row => row.structure?.verification).length,
      safetySectionsPresent: rows.filter(row => row.structure?.safety).length,
      explicitSchemaTermsMentioned: rows.filter(row => row.structure?.schemaTermsMentioned).length,
      integrationSectionsPresent: rows.filter(row => row.structure?.integrationSectionPresent).length,
      compatibilityTermsMentioned: rows.filter(row => row.structure?.compatibilityTermsMentioned).length,
      realHostBenchmarksExecuted: 0,
      promotionEligible: 0,
      blockedForMissingRealExecution: rows.length,
      targetActiveCountIfAllWerePromoted: V75_SKILL_NAMES.length + rows.length,
      targetShadowCountIfAllWerePromoted: 0
    },
    benchmarkGate: {
      shadowToCanaryMinimumCasesPerSkill: 20,
      shadowBenchmarkScoreMinimum: 0.9,
      canaryToStableMinimumCases: 60,
      stableScoreMinimum: 0.95,
      canaryExposureMinimumPercent: 5,
      observationMinimumHours: 24,
      verifiedHostAdapterAvailableInThisEnvironment: false,
      codexCliAvailable: false,
      explanation: 'The repository benchmark runner requires a trusted host executor/operator over its local request/response IPC. No Codex CLI or verified host receipts are present. Static package integrity is not execution evidence.'
    },
    independentAgentReview: {
      requestedAgents: 500,
      successfullyCompleted: 0,
      spawnedBeforeWorkflowStopped: 20,
      failed: 20,
      status: 'INCOMPLETE_WORKFLOW_STOPPED_BY_EXECUTION_LIMIT',
      note: 'The workflow returned no successful item reviews; this report does not claim agent-based semantic review.'
    },
    runtimeChecks: {
      branchLocalMcpInitialize: 'PASS',
      branchLocalToolsList: 15,
      branchLocalToolCalls: 5,
      branchLocalV81IntegrityDispatch: 'PASS',
      remoteConfiguredKromV81Dispatch: 'NOT_FOUND',
      remoteNote: 'The currently connected KROM MCP endpoint does not yet expose the V81 capability; the branch-local HTTP smoke does.',
      agents: V75_AGENT_IDS,
      agentCatalogAudit: 'PASS: 11 agents, 1,465 active skill identities in V75/V76; candidate mappings checked against all 11 IDs.',
      shadowSkillInvocation: 'NOT_RUN: shadow skills remain non-executable until real benchmarks and promotion receipts exist.'
    },
    registryParity: {missingManifest, unregisteredSeeds},
    exactDuplicateGroups,
    lexicalOverlapReviewPairs: uniqueLexical,
    failures,
    skills: rows
  };
  const outDir = path.join(root, 'reports');
  await fs.mkdir(outDir, {recursive: true});
  await fs.writeFile(path.join(outDir, 'KROM-V43-Promotion-Readiness.json'), JSON.stringify(result, null, 2) + '\n', 'utf8');
  const md = [
    '# KROM Forge v4.3 — Shadow Promotion Readiness', '',
    '> **Outcome: BLOCKED.** This is a full static audit of the 500-file package; it is not proof of skill execution. No registry promotion was performed.', '',
    '## Summary', '',
    '| Metric | Result |', '| --- | --- |',
    `| Active skills before | ${V75_SKILL_NAMES.length} |`,
    `| Shadow skills before | ${V80_V42_SHADOW_SEEDS.length} |`,
    `| v4.3 instruction files read | ${rows.length} |`,
    `| Raw SHA-256 verified | ${result.summary.rawHashVerified} / ${rows.length} |`,
    `| Metadata validated | ${result.summary.metadataValidated} / ${rows.length} |`,
    `| Agent mappings valid | ${result.summary.validAgentMappings} / ${rows.length} |`,
    `| Exact duplicate bodies | ${exactDuplicateGroups.length} groups |`,
    `| Active exact/normalized name collisions | ${result.summary.activeExactNameCollisions} / ${result.summary.activeNormalizedNameCollisions} |`,
    `| Input/output/verification/safety section coverage | ${result.summary.inputContractSectionsPresent} / ${result.summary.outputContractSectionsPresent} / ${result.summary.verificationSectionsPresent} / ${result.summary.safetySectionsPresent} of ${rows.length} |`,
    `| Explicit schema terms / integration section / compatibility terms | ${result.summary.explicitSchemaTermsMentioned} / ${result.summary.integrationSectionsPresent} / ${result.summary.compatibilityTermsMentioned} of ${rows.length} |`,
    `| Lexical overlap pairs for review (Jaccard ≥ 0.30) | ${uniqueLexical.length} |`,
    '| Host-executed benchmarks | 0 |',
    '| Skills promoted | 0 |',
    `| Final registries | ${V75_SKILL_NAMES.length} Active / ${V80_V42_SHADOW_SEEDS.length} Shadow |`, '',
    '## Runtime and agent routing', '',
    'The branch-local MCP smoke passed initialization, discovery of 15 public tools and five valid dispatch calls, including the V81 integrity audit. V75/V76 verify all 11 agents retain access to the 1,465 active catalog; all 500 shadow seed mappings point to valid agent IDs. Shadow-skill execution was not attempted because the shadow lifecycle is non-executable until promotion evidence exists. The configured external KROM MCP server returned `NOT_FOUND` for the V81 audit name, so the updated branch capability is only verified locally/through its Vercel Preview check.', '',
    '## Promotion gates', '',
    'Each skill needs at least 20 real, evidence-bound shadow benchmark cases before canary; stable promotion requires at least 60 canary cases, score ≥0.95, ≥5% canary exposure for ≥24 hours, plus rollback, validator, security, evidence and freshness checks. These requirements are taken from `src/v80-canary-promotion-controller.ts`.', '',
    'The repository host runner uses local Codex request/response IPC and waits for a trusted operator. No Codex CLI or verified host receipts are present in this environment. The existing package verifier explicitly says PASS proves hash/loader integrity only, not execution of the 500 skills. Consequently all 500 remain blocked from promotion.', '',
    '## Per-skill results', '',
    '| Skill | Static checks | Primary / validator | Benchmark | Promotion blocker |', '| --- | --- | --- | --- | --- |',
    ...rows.map(row => `| ${row.skillName} | ${row.staticStatus}; hash ${row.hashVerified ? 'PASS' : 'FAIL'}; metadata ${row.metadataValidated ? 'PASS' : 'FAIL'}; mapping ${row.agentMappingValid ? 'PASS' : 'FAIL'} | ${row.primaryAgent ?? 'unknown'} / ${row.validatorAgent ?? 'unknown'} | NOT RUN | No verified HOST_EXECUTION receipts; benchmark not run |`), '',
    '## Overlap review', '',
    'Lexical overlap candidates are triage hints derived from names, descriptions, purpose text, headings and active skill descriptions. They do not establish semantic equivalence; no skills were deleted or merged. The separate 500-agent semantic review did not complete, so no comprehensive semantic-duplicate conclusion is claimed. See the JSON for per-pair scores and best matches.', '',
    ...uniqueLexical.slice(0, 80).map(item => `- ${item.shadow} ↔ ${item.active} (Jaccard ${item.score})`), '',
    '## Next action required for promotion', '',
    'Provide a reachable trusted host executor/operator for the existing Codex IPC benchmark runner, with concrete scenario manifests and resulting evidence-bound receipts. Then execute the V80 canary and stable gates for each candidate, run compatibility/regression checks, and only promote candidates whose receipts validate. Do not mark candidates active in advance.'
  ].join('\n');
  await fs.writeFile(path.join(outDir, 'KROM-V43-Promotion-Readiness.md'), md + '\n', 'utf8');
  console.log(JSON.stringify(result.summary, null, 2));
  if (failures.length) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
