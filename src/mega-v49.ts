import { z } from 'zod';

const passStatus = z.enum(['PASS', 'FAIL', 'PASS_WITH_GAPS', 'NOT_RUN', 'NOT_AVAILABLE']);
const riskLevel = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
const evidenceKind = z.enum([
  'SOURCE', 'DIFF', 'TYPECHECK', 'TEST', 'BUILD', 'SECURITY', 'RUNTIME',
  'DEPLOYMENT', 'RECOVERY', 'APPROVAL', 'CONTRACT', 'OTHER'
]);

const rank: Record<z.infer<typeof riskLevel>, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
const uniq = <T,>(items: T[]) => [...new Set(items)];
const byId = <T extends { id: string }>(items: T[]) => new Map(items.map((item) => [item.id, item]));
const isPassing = (status: z.infer<typeof passStatus>) => status === 'PASS';

const evidenceArtifactSchema = z.object({
  id: z.string().min(1),
  kind: evidenceKind.default('OTHER'),
  source: z.string().min(1),
  commitSha: z.string().optional(),
  digest: z.string().optional(),
  verified: z.boolean().default(false),
  observedAt: z.string().optional(),
  summary: z.string().default('')
});

// Release provenance binds claims and gates to evidence from one exact source revision.
export const releaseProvenanceSchema = z.object({
  releaseId: z.string().min(1),
  version: z.string().min(1),
  branch: z.string().min(1),
  commitSha: z.string().min(7),
  artifacts: z.array(evidenceArtifactSchema).default([]),
  claims: z.array(z.object({
    id: z.string().min(1),
    statement: z.string().min(1),
    requiredKinds: z.array(evidenceKind).default([]),
    evidenceRefs: z.array(z.string()).default([])
  })).default([]),
  gates: z.array(z.object({
    id: z.string().min(1),
    status: passStatus.default('NOT_RUN'),
    evidenceRefs: z.array(z.string()).default([]),
    required: z.boolean().default(true)
  })).default([]),
  previous: z.object({
    version: z.string(),
    branch: z.string(),
    commitSha: z.string(),
    artifactDigests: z.record(z.string(), z.string()).default({})
  }).optional()
});

type ReleaseProvenance = z.infer<typeof releaseProvenanceSchema>;

export function buildReleaseProvenance(input: ReleaseProvenance) {
  return {
    releaseId: input.releaseId,
    identity: { version: input.version, branch: input.branch, commitSha: input.commitSha },
    artifactIds: input.artifacts.map((artifact) => artifact.id),
    claimIds: input.claims.map((claim) => claim.id),
    gateIds: input.gates.map((gate) => gate.id),
    rule: 'Every release claim and passing gate must resolve to verified evidence bound to the release commit.'
  };
}

export function auditProvenanceBindings(input: ReleaseProvenance) {
  const artifacts = byId(input.artifacts);
  const findings = [...input.claims, ...input.gates].map((item) => {
    const refs = item.evidenceRefs.map((ref) => artifacts.get(ref));
    const missingRefs = item.evidenceRefs.filter((ref) => !artifacts.has(ref));
    const unverifiedRefs = refs.filter((artifact) => artifact && !artifact.verified).map((artifact) => artifact!.id);
    const wrongCommitRefs = refs.filter((artifact) => artifact?.commitSha && artifact.commitSha !== input.commitSha).map((artifact) => artifact!.id);
    return { id: item.id, missingRefs, unverifiedRefs, wrongCommitRefs };
  });
  const blockers = findings.filter((finding) => finding.missingRefs.length || finding.wrongCommitRefs.length);
  const gaps = findings.filter((finding) => finding.unverifiedRefs.length);
  return { status: blockers.length ? 'FAIL' : gaps.length ? 'PASS_WITH_GAPS' : 'PASS', findings };
}

export function detectProvenanceDrift(input: ReleaseProvenance) {
  const wrongCommit = input.artifacts.filter((artifact) => artifact.commitSha && artifact.commitSha !== input.commitSha);
  const previous = input.previous;
  const digestChanges = previous
    ? input.artifacts.filter((artifact) => artifact.digest && previous.artifactDigests[artifact.id] && previous.artifactDigests[artifact.id] !== artifact.digest)
      .map((artifact) => ({ id: artifact.id, before: previous.artifactDigests[artifact.id], after: artifact.digest }))
    : [];
  return {
    status: wrongCommit.length ? 'FAIL' : digestChanges.length ? 'PASS_WITH_GAPS' : 'PASS',
    wrongCommitArtifacts: wrongCommit.map((artifact) => artifact.id),
    digestChanges,
    releaseIdentityChanged: previous ? previous.commitSha !== input.commitSha || previous.version !== input.version : false
  };
}

export function evaluateArtifactIntegrity(input: ReleaseProvenance) {
  const malformedDigests = input.artifacts.filter((artifact) => artifact.digest && !/^sha256:[a-f0-9]{64}$/i.test(artifact.digest));
  const missingDigests = input.artifacts.filter((artifact) => !artifact.digest).map((artifact) => artifact.id);
  const unverified = input.artifacts.filter((artifact) => !artifact.verified).map((artifact) => artifact.id);
  return {
    status: malformedDigests.length ? 'FAIL' : missingDigests.length || unverified.length ? 'PASS_WITH_GAPS' : 'PASS',
    malformedDigests: malformedDigests.map((artifact) => artifact.id),
    missingDigests,
    unverified,
    note: 'Digest shape is validated; digest computation and source authenticity remain host responsibilities.'
  };
}

export function buildReleaseAttestation(input: ReleaseProvenance) {
  const bindings = auditProvenanceBindings(input);
  const integrity = evaluateArtifactIntegrity(input);
  const artifactMap = byId(input.artifacts);
  const unsupportedClaims = input.claims.filter((claim) => {
    const linked = claim.evidenceRefs.map((ref) => artifactMap.get(ref)).filter(Boolean);
    const verifiedKinds = new Set(linked.filter((artifact) => artifact?.verified && artifact.commitSha === input.commitSha).map((artifact) => artifact!.kind));
    return !claim.evidenceRefs.length || claim.requiredKinds.some((kind) => !verifiedKinds.has(kind));
  });
  const unsupportedPassGates = input.gates.filter((gate) => isPassing(gate.status) && !gate.evidenceRefs.some((ref) => {
    const artifact = artifactMap.get(ref);
    return artifact?.verified && artifact.commitSha === input.commitSha;
  }));
  return {
    identity: buildReleaseProvenance(input).identity,
    status: bindings.status === 'FAIL' || unsupportedPassGates.length ? 'FAIL' : unsupportedClaims.length || integrity.status !== 'PASS' ? 'PASS_WITH_GAPS' : 'PASS',
    unsupportedClaims: unsupportedClaims.map((claim) => claim.id),
    unsupportedPassGates: unsupportedPassGates.map((gate) => gate.id),
    verifiedArtifactCount: input.artifacts.filter((artifact) => artifact.verified && artifact.commitSha === input.commitSha).length
  };
}

export function compareReleaseProvenance(input: ReleaseProvenance) {
  return { current: buildReleaseAttestation(input), drift: detectProvenanceDrift(input), previous: input.previous ?? null };
}

const changeCategory = z.enum(['CODE', 'API', 'AUTH', 'DATA', 'SCHEMA', 'DEPENDENCY', 'CI', 'RUNTIME', 'UI', 'SECURITY', 'DOCUMENTATION']);
const gateResultSchema = z.object({
  id: z.string(),
  status: passStatus.default('NOT_RUN'),
  evidenceRefs: z.array(z.string()).default([]),
  command: z.string().optional()
});

export const adaptiveVerificationSchema = z.object({
  changeId: z.string().min(1),
  paths: z.array(z.string()).default([]),
  categories: z.array(changeCategory).default([]),
  destructive: z.boolean().default(false),
  externallyVisible: z.boolean().default(false),
  reversible: z.boolean().default(true),
  touchesSharedContract: z.boolean().default(false),
  suppliedRisk: riskLevel.optional(),
  availableCapabilities: z.array(z.string()).default([]),
  gateResults: z.array(gateResultSchema).default([]),
  evidence: z.array(evidenceArtifactSchema).default([]),
  previousRequiredGates: z.array(z.string()).default([])
});

type AdaptiveVerification = z.infer<typeof adaptiveVerificationSchema>;

export function classifyAdaptiveChangeRisk(input: AdaptiveVerification) {
  let score = 1;
  if (input.destructive) score += 4;
  if (!input.reversible) score += 3;
  if (input.externallyVisible) score += 2;
  if (input.touchesSharedContract) score += 2;
  if (input.categories.some((category) => ['AUTH', 'DATA', 'SCHEMA', 'SECURITY'].includes(category))) score += 3;
  if (input.categories.includes('DEPENDENCY') || input.categories.includes('CI')) score += 1;
  const computed = score >= 9 ? 'CRITICAL' : score >= 6 ? 'HIGH' : score >= 3 ? 'MEDIUM' : 'LOW';
  const effective = input.suppliedRisk && rank[input.suppliedRisk] > rank[computed] ? input.suppliedRisk : computed;
  return { score, computed, supplied: input.suppliedRisk ?? null, effective };
}

export function deriveAdaptiveVerificationPlan(input: AdaptiveVerification) {
  const gates = new Set(['static-registration', 'capabilities-parity', 'version-consistency', 'typecheck', 'unit-tests', 'build']);
  if (input.categories.some((category) => ['API', 'AUTH', 'DATA', 'SCHEMA'].includes(category))) gates.add('integration-tests');
  if (input.categories.includes('AUTH') || input.categories.includes('SECURITY')) gates.add('security-negative-tests');
  if (input.categories.includes('DEPENDENCY')) gates.add('dependency-audit');
  if (input.categories.includes('CI')) gates.add('ci-workflow-validation');
  if (input.categories.includes('UI')) gates.add('browser-verification');
  if (input.externallyVisible || input.categories.includes('RUNTIME')) gates.add('runtime-smoke');
  if (input.destructive || !input.reversible) gates.add('recovery-rehearsal');
  if (classifyAdaptiveChangeRisk(input).effective === 'CRITICAL') gates.add('independent-approval');
  const requiredGates = [...gates];
  return {
    changeId: input.changeId,
    risk: classifyAdaptiveChangeRisk(input),
    requiredGates,
    unavailableGates: requiredGates.filter((gate) => input.availableCapabilities.length && !input.availableCapabilities.includes(gate))
  };
}

export function evaluateAdaptiveVerificationCoverage(input: AdaptiveVerification) {
  const plan = deriveAdaptiveVerificationPlan(input);
  const results = byId(input.gateResults);
  const missing = plan.requiredGates.filter((gate) => !results.has(gate));
  const failed = plan.requiredGates.filter((gate) => results.get(gate)?.status === 'FAIL');
  const notRun = plan.requiredGates.filter((gate) => ['NOT_RUN', 'NOT_AVAILABLE'].includes(results.get(gate)?.status ?? 'NOT_RUN'));
  const evidence = byId(input.evidence);
  const unsupportedPasses = plan.requiredGates.filter((gate) => {
    const result = results.get(gate);
    return result?.status === 'PASS' && !result.evidenceRefs.some((ref) => evidence.get(ref)?.verified);
  });
  return { status: failed.length || unsupportedPasses.length ? 'FAIL' : missing.length || notRun.length ? 'PASS_WITH_GAPS' : 'PASS', missing, failed, notRun, unsupportedPasses };
}

export function detectVerificationShortcuts(input: AdaptiveVerification) {
  const coverage = evaluateAdaptiveVerificationCoverage(input);
  return {
    shortcuts: [
      ...coverage.unsupportedPasses.map((gate) => ({ gate, issue: 'PASS_WITHOUT_VERIFIED_EVIDENCE' })),
      ...input.gateResults.filter((gate) => gate.status === 'PASS' && !gate.command && !gate.evidenceRefs.length).map((gate) => ({ gate: gate.id, issue: 'PASS_WITHOUT_COMMAND_OR_EVIDENCE' })),
      ...(input.destructive && !deriveAdaptiveVerificationPlan(input).requiredGates.includes('recovery-rehearsal') ? [{ gate: 'recovery-rehearsal', issue: 'DESTRUCTIVE_CHANGE_WITHOUT_RECOVERY_GATE' }] : [])
    ]
  };
}

export function prioritizeVerificationGaps(input: AdaptiveVerification) {
  const coverage = evaluateAdaptiveVerificationCoverage(input);
  const priority = [...coverage.failed, ...coverage.unsupportedPasses, ...coverage.missing, ...coverage.notRun];
  return {
    actions: uniq(priority).map((gate, index) => ({ order: index + 1, gate, action: coverage.failed.includes(gate) ? 'FIX_AND_RERUN' : coverage.unsupportedPasses.includes(gate) ? 'ATTACH_VERIFIED_EVIDENCE' : 'RUN_GATE' })),
    risk: classifyAdaptiveChangeRisk(input).effective
  };
}

export function compareAdaptiveVerificationPlans(input: AdaptiveVerification) {
  const current = deriveAdaptiveVerificationPlan(input).requiredGates;
  return {
    current,
    added: current.filter((gate) => !input.previousRequiredGates.includes(gate)),
    removed: input.previousRequiredGates.filter((gate) => !current.includes(gate)),
    coverage: evaluateAdaptiveVerificationCoverage(input)
  };
}

const toolContractSchema = z.object({
  name: z.string().min(1),
  title: z.string().default(''),
  description: z.string().default(''),
  schemaVersion: z.string().default('1'),
  requiredInputs: z.array(z.string()).default([]),
  outputFields: z.array(z.string()).default([]),
  handlerBound: z.boolean().default(false),
  capabilityListed: z.boolean().default(false)
});

export const toolContractCatalogSchema = z.object({
  catalogVersion: z.string().default('1'),
  tools: z.array(toolContractSchema).default([]),
  results: z.array(z.object({
    id: z.string(),
    tool: z.string(),
    kind: z.enum(['SCHEMA_ACCEPTS_VALID', 'SCHEMA_REJECTS_INVALID', 'HANDLER_RETURNS_CONTENT', 'CAPABILITY_PARITY', 'BACKWARD_COMPATIBILITY']),
    status: passStatus.default('NOT_RUN'),
    evidenceRefs: z.array(z.string()).default([])
  })).default([]),
  evidence: z.array(evidenceArtifactSchema).default([]),
  previousTools: z.array(toolContractSchema).default([])
});

type ToolCatalog = z.infer<typeof toolContractCatalogSchema>;

export function buildToolContractCatalog(input: ToolCatalog) {
  return { catalogVersion: input.catalogVersion, toolCount: uniq(input.tools.map((tool) => tool.name)).length, tools: input.tools.map((tool) => ({ name: tool.name, schemaVersion: tool.schemaVersion, inputs: tool.requiredInputs, outputs: tool.outputFields })) };
}

export function auditToolContractCoverage(input: ToolCatalog) {
  const names = input.tools.map((tool) => tool.name);
  const duplicates = uniq(names.filter((name, index) => names.indexOf(name) !== index));
  const incomplete = input.tools.filter((tool) => !tool.title || !tool.description || !tool.handlerBound || !tool.capabilityListed).map((tool) => ({ name: tool.name, missing: [!tool.title && 'title', !tool.description && 'description', !tool.handlerBound && 'handler', !tool.capabilityListed && 'capability'].filter(Boolean) }));
  return { status: duplicates.length ? 'FAIL' : incomplete.length ? 'PASS_WITH_GAPS' : 'PASS', duplicates, incomplete };
}

export function detectToolContractCompatibilityRisk(input: ToolCatalog) {
  const current = byId(input.tools.map((tool) => ({ ...tool, id: tool.name })));
  const removed = input.previousTools.filter((tool) => !current.has(tool.name)).map((tool) => tool.name);
  const changed = input.previousTools.flatMap((before) => {
    const after = current.get(before.name);
    if (!after) return [];
    const addedRequiredInputs = after.requiredInputs.filter((field) => !before.requiredInputs.includes(field));
    const removedOutputs = before.outputFields.filter((field) => !after.outputFields.includes(field));
    return addedRequiredInputs.length || removedOutputs.length ? [{ tool: before.name, addedRequiredInputs, removedOutputs }] : [];
  });
  return { status: removed.length || changed.length ? 'FAIL' : 'PASS', removed, changed };
}

export function generateToolContractTestPlan(input: ToolCatalog) {
  const kinds = ['SCHEMA_ACCEPTS_VALID', 'SCHEMA_REJECTS_INVALID', 'HANDLER_RETURNS_CONTENT', 'CAPABILITY_PARITY'] as const;
  return { tests: input.tools.flatMap((tool) => kinds.map((kind) => ({ id: `${tool.name}:${kind}`, tool: tool.name, kind }))), total: input.tools.length * kinds.length };
}

export function evaluateToolContractResults(input: ToolCatalog) {
  const evidence = byId(input.evidence);
  const expected = generateToolContractTestPlan(input).tests;
  const resultMap = byId(input.results);
  const missing = expected.filter((test) => !resultMap.has(test.id)).map((test) => test.id);
  const failed = input.results.filter((result) => result.status === 'FAIL').map((result) => result.id);
  const unsupportedPasses = input.results.filter((result) => result.status === 'PASS' && !result.evidenceRefs.some((ref) => evidence.get(ref)?.verified)).map((result) => result.id);
  return { status: failed.length || unsupportedPasses.length ? 'FAIL' : missing.length ? 'PASS_WITH_GAPS' : 'PASS', expected: expected.length, observed: input.results.length, missing, failed, unsupportedPasses };
}

export function compareToolContractCatalogs(input: ToolCatalog) {
  const previousNames = input.previousTools.map((tool) => tool.name);
  const currentNames = input.tools.map((tool) => tool.name);
  return { added: currentNames.filter((name) => !previousNames.includes(name)), removed: previousNames.filter((name) => !currentNames.includes(name)), compatibility: detectToolContractCompatibilityRisk(input), coverage: auditToolContractCoverage(input) };
}

const ciCheckSchema = z.object({
  name: z.string(),
  status: passStatus.default('NOT_RUN'),
  command: z.string().optional(),
  evidenceRefs: z.array(z.string()).default([])
});

export const ciRunEvidenceSchema = z.object({
  provider: z.string().default('github-actions'),
  runId: z.string().min(1),
  runUrl: z.string().optional(),
  branch: z.string().min(1),
  commitSha: z.string().min(7),
  expectedBranch: z.string().min(1),
  expectedCommitSha: z.string().min(7),
  conclusion: passStatus.default('NOT_RUN'),
  checks: z.array(ciCheckSchema).default([]),
  requiredChecks: z.array(z.string()).default(['registry', 'typecheck', 'tests', 'build']),
  artifacts: z.array(evidenceArtifactSchema).default([]),
  previousChecks: z.array(ciCheckSchema).default([])
});

type CiRunEvidence = z.infer<typeof ciRunEvidenceSchema>;

export function auditCiRunBinding(input: CiRunEvidence) {
  const mismatches = [input.branch !== input.expectedBranch && 'branch', input.commitSha !== input.expectedCommitSha && 'commit'].filter(Boolean);
  return { status: mismatches.length ? 'FAIL' : 'PASS', mismatches, actual: { branch: input.branch, commitSha: input.commitSha }, expected: { branch: input.expectedBranch, commitSha: input.expectedCommitSha } };
}

export function buildCiEvidenceBundle(input: CiRunEvidence) {
  return { provider: input.provider, runId: input.runId, runUrl: input.runUrl ?? null, identity: { branch: input.branch, commitSha: input.commitSha }, conclusion: input.conclusion, checks: input.checks, artifactIds: input.artifacts.map((artifact) => artifact.id) };
}

export function detectCiEvidenceGaps(input: CiRunEvidence) {
  const checks = byId(input.checks.map((check) => ({ ...check, id: check.name })));
  const evidence = byId(input.artifacts);
  const missingChecks = input.requiredChecks.filter((name) => !checks.has(name));
  const unsupportedPasses = input.checks.filter((check) => check.status === 'PASS' && !check.evidenceRefs.some((ref) => evidence.get(ref)?.verified && (!evidence.get(ref)?.commitSha || evidence.get(ref)?.commitSha === input.commitSha))).map((check) => check.name);
  return { missingChecks, unsupportedPasses, missingRunUrl: !input.runUrl, missingArtifactDigests: input.artifacts.filter((artifact) => !artifact.digest).map((artifact) => artifact.id) };
}

export function evaluateCiRunTrust(input: CiRunEvidence) {
  const binding = auditCiRunBinding(input);
  const gaps = detectCiEvidenceGaps(input);
  const failed = input.checks.filter((check) => check.status === 'FAIL').map((check) => check.name);
  const incomplete = input.requiredChecks.filter((name) => input.checks.find((check) => check.name === name)?.status !== 'PASS');
  return { status: binding.status === 'FAIL' || input.conclusion === 'FAIL' || failed.length || gaps.unsupportedPasses.length ? 'FAIL' : incomplete.length || gaps.missingChecks.length ? 'PASS_WITH_GAPS' : 'PASS', binding, gaps, failed, incomplete };
}

export function buildCiFailureTriage(input: CiRunEvidence) {
  const attention = input.checks.filter((check) => check.status !== 'PASS');
  return { actions: attention.map((check, index) => ({ order: index + 1, check: check.name, action: check.status === 'FAIL' ? 'REPRODUCE_LOCALLY_AND_FIX' : 'RUN_AND_CAPTURE_EVIDENCE', command: check.command ?? null })) };
}

export function compareCiRunEvidence(input: CiRunEvidence) {
  const previous = byId(input.previousChecks.map((check) => ({ ...check, id: check.name })));
  return { regressions: input.checks.filter((check) => check.status === 'FAIL' && previous.get(check.name)?.status === 'PASS').map((check) => check.name), recoveries: input.checks.filter((check) => check.status === 'PASS' && previous.get(check.name)?.status === 'FAIL').map((check) => check.name), trust: evaluateCiRunTrust(input) };
}

const recoveryScenarioSchema = z.object({
  id: z.string(),
  failureMode: z.string(),
  severity: riskLevel.default('HIGH'),
  rollbackSteps: z.array(z.string()).default([]),
  requiredCapabilities: z.array(z.string()).default([]),
  targetRtoMinutes: z.number().nonnegative().optional(),
  targetRpoMinutes: z.number().nonnegative().optional()
});

export const recoveryRehearsalSchema = z.object({
  releaseId: z.string(),
  scenarios: z.array(recoveryScenarioSchema).default([]),
  availableCapabilities: z.array(z.string()).default([]),
  results: z.array(z.object({
    scenarioId: z.string(),
    status: passStatus.default('NOT_RUN'),
    actualRtoMinutes: z.number().nonnegative().optional(),
    actualRpoMinutes: z.number().nonnegative().optional(),
    evidenceRefs: z.array(z.string()).default([])
  })).default([]),
  evidence: z.array(evidenceArtifactSchema).default([]),
  previousResults: z.record(z.string(), passStatus).default({})
});

type RecoveryRehearsal = z.infer<typeof recoveryRehearsalSchema>;

export function buildRecoveryRehearsalPlan(input: RecoveryRehearsal) {
  return { releaseId: input.releaseId, scenarios: input.scenarios.map((scenario) => ({ ...scenario, missingCapabilities: scenario.requiredCapabilities.filter((capability) => !input.availableCapabilities.includes(capability)) })) };
}

export function auditRecoveryDependencies(input: RecoveryRehearsal) {
  const gaps = buildRecoveryRehearsalPlan(input).scenarios.filter((scenario) => scenario.missingCapabilities.length).map((scenario) => ({ scenarioId: scenario.id, missingCapabilities: scenario.missingCapabilities }));
  return { status: gaps.length ? 'FAIL' : 'PASS', gaps };
}

export function buildFailureInjectionMatrix(input: RecoveryRehearsal) {
  return { matrix: input.scenarios.map((scenario) => ({ scenarioId: scenario.id, failureMode: scenario.failureMode, severity: scenario.severity, injectOnlyInIsolatedEnvironment: true, abortIfProductionTargeted: true, verify: ['service-state', 'data-integrity', 'rollback-completion', 'post-recovery-smoke'] })) };
}

export function evaluateRecoveryObjectives(input: RecoveryRehearsal) {
  const results = byId(input.results.map((result) => ({ ...result, id: result.scenarioId })));
  const violations = input.scenarios.flatMap((scenario) => {
    const result = results.get(scenario.id);
    const issues: string[] = [];
    if (!result || result.status !== 'PASS') issues.push('SCENARIO_NOT_PASSED');
    if (scenario.targetRtoMinutes !== undefined && (result?.actualRtoMinutes === undefined || result.actualRtoMinutes > scenario.targetRtoMinutes)) issues.push('RTO_MISSED');
    if (scenario.targetRpoMinutes !== undefined && (result?.actualRpoMinutes === undefined || result.actualRpoMinutes > scenario.targetRpoMinutes)) issues.push('RPO_MISSED');
    return issues.length ? [{ scenarioId: scenario.id, issues }] : [];
  });
  return { status: violations.length ? 'FAIL' : 'PASS', violations };
}

export function evaluateRecoveryRehearsal(input: RecoveryRehearsal) {
  const evidence = byId(input.evidence);
  const unsupportedPasses = input.results.filter((result) => result.status === 'PASS' && !result.evidenceRefs.some((ref) => evidence.get(ref)?.verified && evidence.get(ref)?.kind === 'RECOVERY')).map((result) => result.scenarioId);
  const dependencyAudit = auditRecoveryDependencies(input);
  const objectives = evaluateRecoveryObjectives(input);
  return { status: dependencyAudit.status === 'FAIL' || objectives.status === 'FAIL' || unsupportedPasses.length ? 'FAIL' : input.results.length < input.scenarios.length ? 'PASS_WITH_GAPS' : 'PASS', dependencyAudit, objectives, unsupportedPasses };
}

export function compareRecoveryRehearsals(input: RecoveryRehearsal) {
  return { regressions: input.results.filter((result) => result.status === 'FAIL' && input.previousResults[result.scenarioId] === 'PASS').map((result) => result.scenarioId), recoveries: input.results.filter((result) => result.status === 'PASS' && input.previousResults[result.scenarioId] === 'FAIL').map((result) => result.scenarioId), current: evaluateRecoveryRehearsal(input) };
}

const approvalSchema = z.object({
  id: z.string(),
  role: z.string(),
  actor: z.string().optional(),
  status: z.enum(['APPROVED', 'REJECTED', 'PENDING', 'EXPIRED']).default('PENDING'),
  commitSha: z.string().optional(),
  evidenceRefs: z.array(z.string()).default([])
});

export const mergePolicySchema = z.object({
  policyId: z.string(),
  branch: z.string(),
  baseBranch: z.string().default('main'),
  commitSha: z.string().min(7),
  risk: riskLevel.default('MEDIUM'),
  requiredChecks: z.array(z.string()).default(['registry', 'typecheck', 'tests', 'build']),
  checks: z.array(ciCheckSchema).default([]),
  requiredRoles: z.array(z.string()).default(['maintainer']),
  approvals: z.array(approvalSchema).default([]),
  evidence: z.array(evidenceArtifactSchema).default([]),
  allowSelfApproval: z.boolean().default(false),
  author: z.string().optional(),
  emergencyException: z.object({ id: z.string(), approved: z.boolean(), expiresAt: z.string().optional(), evidenceRefs: z.array(z.string()).default([]) }).optional(),
  previousDecision: z.enum(['ALLOW', 'BLOCK', 'CONDITIONAL']).optional()
});

type MergePolicy = z.infer<typeof mergePolicySchema>;

export function compileMergePolicy(input: MergePolicy) {
  const requiredRoles = new Set(input.requiredRoles);
  if (input.risk === 'HIGH' || input.risk === 'CRITICAL') requiredRoles.add('release-auditor');
  if (input.risk === 'CRITICAL') requiredRoles.add('security');
  return { policyId: input.policyId, requiredChecks: uniq(input.requiredChecks), requiredRoles: [...requiredRoles], selfApprovalAllowed: input.allowSelfApproval, emergencyExceptionConfigured: Boolean(input.emergencyException) };
}

export function deriveRequiredApprovers(input: MergePolicy) {
  const compiled = compileMergePolicy(input);
  return { requiredRoles: compiled.requiredRoles, satisfiedRoles: compiled.requiredRoles.filter((role) => input.approvals.some((approval) => approval.role === role && approval.status === 'APPROVED' && approval.commitSha === input.commitSha)), pendingRoles: compiled.requiredRoles.filter((role) => !input.approvals.some((approval) => approval.role === role && approval.status === 'APPROVED' && approval.commitSha === input.commitSha)) };
}

export function buildApprovalEvidenceMatrix(input: MergePolicy) {
  const evidence = byId(input.evidence);
  return { approvals: input.approvals.map((approval) => ({ id: approval.id, role: approval.role, status: approval.status, boundToCommit: approval.commitSha === input.commitSha, verifiedEvidenceRefs: approval.evidenceRefs.filter((ref) => evidence.get(ref)?.verified && evidence.get(ref)?.kind === 'APPROVAL') })) };
}

export function detectMergeBypassRisk(input: MergePolicy) {
  const checks = byId(input.checks.map((check) => ({ ...check, id: check.name })));
  const missingChecks = input.requiredChecks.filter((check) => !checks.has(check));
  const bypasses = [
    ...missingChecks.map((check) => `MISSING_REQUIRED_CHECK:${check}`),
    ...input.checks.filter((check) => check.status !== 'PASS').map((check) => `CHECK_NOT_PASSING:${check.name}`),
    ...input.approvals.filter((approval) => approval.status === 'APPROVED' && approval.commitSha !== input.commitSha).map((approval) => `STALE_APPROVAL:${approval.id}`),
    ...(input.author && !input.allowSelfApproval && input.approvals.some((approval) => approval.status === 'APPROVED' && approval.actor === input.author) ? ['SELF_APPROVAL'] : [])
  ];
  return { status: bypasses.length ? 'FAIL' : 'PASS', bypasses };
}

export function evaluateMergePolicy(input: MergePolicy) {
  const bypass = detectMergeBypassRisk(input);
  const approvers = deriveRequiredApprovers(input);
  const evidence = byId(input.evidence);
  const unsupportedChecks = input.checks.filter((check) => check.status === 'PASS' && !check.evidenceRefs.some((ref) => evidence.get(ref)?.verified && (!evidence.get(ref)?.commitSha || evidence.get(ref)?.commitSha === input.commitSha))).map((check) => check.name);
  const validException = input.emergencyException?.approved === true && input.emergencyException.evidenceRefs.some((ref) => evidence.get(ref)?.verified);
  const blockers = [...bypass.bypasses, ...approvers.pendingRoles.map((role) => `MISSING_APPROVAL:${role}`), ...unsupportedChecks.map((check) => `UNSUPPORTED_CHECK:${check}`)];
  return { decision: blockers.length ? validException ? 'CONDITIONAL' : 'BLOCK' : 'ALLOW', blockers, exceptionApplied: Boolean(validException), approvers };
}

export function compareMergePolicyDecisions(input: MergePolicy) {
  const current = evaluateMergePolicy(input);
  return { previousDecision: input.previousDecision ?? null, currentDecision: current.decision, changed: Boolean(input.previousDecision && input.previousDecision !== current.decision), current };
}
