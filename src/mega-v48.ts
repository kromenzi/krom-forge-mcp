import { z } from 'zod';

const gateStatus = z.enum(['PASS', 'FAIL', 'PASS_WITH_GAPS', 'NOT_AVAILABLE', 'NOT_APPLICABLE']);
const controlStatus = z.enum(['PASS', 'ATTENTION', 'BLOCKED', 'UNKNOWN']);
const severity = z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
const evidenceSource = z.enum(['LOCAL', 'CI', 'DEPLOYMENT', 'MANUAL', 'HOST']);
const uniq = <T,>(items: T[]) => [...new Set(items)];

const gateRank: Record<z.infer<typeof gateStatus>, number> = {
  PASS: 0,
  NOT_APPLICABLE: 0,
  PASS_WITH_GAPS: 1,
  NOT_AVAILABLE: 2,
  FAIL: 3
};

const controlRank: Record<z.infer<typeof controlStatus>, number> = {
  PASS: 0,
  ATTENTION: 1,
  UNKNOWN: 2,
  BLOCKED: 3
};

function worstGate(statuses: z.infer<typeof gateStatus>[]) {
  return statuses.sort((a, b) => gateRank[b] - gateRank[a])[0] ?? 'NOT_AVAILABLE';
}

function worstControl(statuses: z.infer<typeof controlStatus>[]) {
  return statuses.sort((a, b) => controlRank[b] - controlRank[a])[0] ?? 'UNKNOWN';
}

function missingRequired(required: string[], present: string[]) {
  return required.filter((item) => !present.includes(item));
}

const evidenceRefSchema = z.object({
  id: z.string(),
  source: evidenceSource.default('HOST'),
  verified: z.boolean().default(false),
  summary: z.string().optional()
});

const verificationGateSchema = z.object({
  name: z.string(),
  status: gateStatus.default('NOT_AVAILABLE'),
  required: z.boolean().default(true),
  blocksRelease: z.boolean().default(true),
  command: z.string().optional(),
  evidenceRefs: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([])
});

export const assuranceVerificationSchema = z.object({
  releaseId: z.string(),
  objective: z.string().optional(),
  gates: z.array(verificationGateSchema).default([]),
  evidence: z.array(evidenceRefSchema).default([]),
  minimumRequiredGates: z.array(z.string()).default([
    'static-registration',
    'capabilities-parity',
    'version-consistency',
    'typecheck',
    'build'
  ]),
  claims: z.array(z.object({
    id: z.string(),
    statement: z.string(),
    evidenceRefs: z.array(z.string()).default([]),
    consequential: z.boolean().default(false)
  })).default([]),
  previous: z.record(z.string(), z.unknown()).optional()
});

export function buildAssuranceVerificationContract(input: z.infer<typeof assuranceVerificationSchema>) {
  const suppliedNames = input.gates.map((gate) => gate.name);
  const missing = missingRequired(input.minimumRequiredGates, suppliedNames);
  return {
    releaseId: input.releaseId,
    objective: input.objective ?? null,
    requiredGates: input.minimumRequiredGates.map((name) => ({
      name,
      supplied: suppliedNames.includes(name),
      evidenceRefs: input.gates.find((gate) => gate.name === name)?.evidenceRefs ?? []
    })),
    missingRequiredGates: missing,
    rule: 'A release claim is only supported by verified evidence attached to explicit gates.'
  };
}

export function evaluateAssuranceEvidence(input: z.infer<typeof assuranceVerificationSchema>) {
  const evidence = new Map(input.evidence.map((item) => [item.id, item]));
  const gateFindings = input.gates.map((gate) => {
    const linked = gate.evidenceRefs.map((id) => evidence.get(id)).filter(Boolean);
    const unverified = linked.filter((item) => item?.verified !== true).map((item) => item?.id);
    const hasVerifiedEvidence = linked.some((item) => item?.verified === true);
    const unsupportedPass = gate.status === 'PASS' && !hasVerifiedEvidence;
    const blocks = gate.required && gate.blocksRelease && (gate.status === 'FAIL' || gate.status === 'NOT_AVAILABLE' || unsupportedPass);
    return {
      name: gate.name,
      status: gate.status,
      blocks,
      unsupportedPass,
      missingEvidence: gate.evidenceRefs.length === 0,
      unverifiedEvidenceRefs: unverified
    };
  });
  const missing = buildAssuranceVerificationContract(input).missingRequiredGates;
  const blockers = [
    ...missing.map((name) => `Missing required gate: ${name}`),
    ...gateFindings.filter((gate) => gate.blocks).map((gate) => `Blocked gate: ${gate.name}`)
  ];
  return {
    status: blockers.length ? 'BLOCKED' : gateFindings.some((gate) => gate.unverifiedEvidenceRefs.length || gate.missingEvidence) ? 'ATTENTION' : 'PASS',
    blockers,
    gateFindings
  };
}

export function detectUnsupportedReleaseClaims(input: z.infer<typeof assuranceVerificationSchema>) {
  const verified = new Set(input.evidence.filter((item) => item.verified).map((item) => item.id));
  const unsupported = input.claims.filter((claim) => !claim.evidenceRefs.length || !claim.evidenceRefs.some((id) => verified.has(id)));
  return {
    unsupportedClaims: unsupported.map((claim) => claim.id),
    consequentialUnsupportedClaims: unsupported.filter((claim) => claim.consequential).map((claim) => claim.id),
    supportedClaims: input.claims.filter((claim) => claim.evidenceRefs.some((id) => verified.has(id))).map((claim) => claim.id)
  };
}

export function buildEvidenceReplayPlan(input: z.infer<typeof assuranceVerificationSchema>) {
  const audit = evaluateAssuranceEvidence(input);
  return {
    releaseId: input.releaseId,
    replay: input.gates
      .filter((gate) => gate.required && (gate.status !== 'PASS' || !gate.evidenceRefs.length))
      .map((gate) => ({
        gate: gate.name,
        command: gate.command ?? null,
        requiredEvidence: gate.evidenceRefs,
        reason: gate.status !== 'PASS' ? `Gate is ${gate.status}` : 'Gate lacks attached evidence'
      })),
    blockers: audit.blockers
  };
}

export function compareAssuranceRuns(input: z.infer<typeof assuranceVerificationSchema>) {
  return {
    current: evaluateAssuranceEvidence(input),
    previous: input.previous ?? null
  };
}

export const toolRegistryIntegritySchema = z.object({
  registeredTools: z.array(z.string()).default([]),
  capabilityTools: z.array(z.string()).default([]),
  expectedToolPrefix: z.string().default('krom_'),
  packageVersion: z.string(),
  serverInfoVersion: z.string().optional(),
  healthVersion: z.string().optional(),
  homepageVersion: z.string().optional(),
  lockfileVersion: z.string().optional(),
  previous: z.record(z.string(), z.unknown()).optional()
});

export function auditToolRegistry(input: z.infer<typeof toolRegistryIntegritySchema>) {
  const registeredUnique = uniq(input.registeredTools);
  const capabilityUnique = uniq(input.capabilityTools);
  const duplicateRegistrations = input.registeredTools.filter((tool, index) => input.registeredTools.indexOf(tool) !== index);
  const duplicateCapabilities = input.capabilityTools.filter((tool, index) => input.capabilityTools.indexOf(tool) !== index);
  const missingCapabilities = registeredUnique.filter((tool) => !capabilityUnique.includes(tool));
  const extraCapabilities = capabilityUnique.filter((tool) => !registeredUnique.includes(tool));
  const invalidPrefixes = registeredUnique.filter((tool) => !tool.startsWith(input.expectedToolPrefix));
  const blockers = [
    ...duplicateRegistrations.map((tool) => `Duplicate registered tool: ${tool}`),
    ...missingCapabilities.map((tool) => `Registered tool missing from capabilities: ${tool}`),
    ...extraCapabilities.map((tool) => `Capability missing registration: ${tool}`),
    ...invalidPrefixes.map((tool) => `Unexpected tool prefix: ${tool}`)
  ];
  return {
    status: blockers.length ? 'BLOCKED' : 'PASS',
    registeredCount: registeredUnique.length,
    capabilityCount: capabilityUnique.length,
    duplicateRegistrations: uniq(duplicateRegistrations),
    duplicateCapabilities: uniq(duplicateCapabilities),
    missingCapabilities,
    extraCapabilities,
    invalidPrefixes,
    blockers
  };
}

export function evaluateVersionConsistency(input: z.infer<typeof toolRegistryIntegritySchema>) {
  const observed = [
    ['package', input.packageVersion],
    ['serverInfo', input.serverInfoVersion],
    ['health', input.healthVersion],
    ['homepage', input.homepageVersion],
    ['lockfile', input.lockfileVersion]
  ].filter(([, version]) => typeof version === 'string' && version.length > 0) as [string, string][];
  const mismatches = observed.filter(([, version]) => version !== input.packageVersion).map(([surface, version]) => ({ surface, version }));
  return {
    status: mismatches.length ? 'BLOCKED' : observed.length < 3 ? 'ATTENTION' : 'PASS',
    packageVersion: input.packageVersion,
    observed,
    mismatches,
    missingSurfaces: ['serverInfo', 'health', 'homepage', 'lockfile'].filter((surface) => !observed.some(([name]) => name === surface))
  };
}

export function buildRegistryRepairPlan(input: z.infer<typeof toolRegistryIntegritySchema>) {
  const registry = auditToolRegistry(input);
  const version = evaluateVersionConsistency(input);
  return {
    actions: [
      ...registry.missingCapabilities.map((tool) => ({ action: 'ADD_CAPABILITY_ENTRY', tool })),
      ...registry.extraCapabilities.map((tool) => ({ action: 'REGISTER_TOOL_OR_REMOVE_CAPABILITY', tool })),
      ...registry.duplicateRegistrations.map((tool) => ({ action: 'DEDUPLICATE_REGISTRATION', tool })),
      ...registry.duplicateCapabilities.map((tool) => ({ action: 'DEDUPLICATE_CAPABILITY', tool })),
      ...version.mismatches.map((item) => ({ action: 'DERIVE_VERSION_FROM_PACKAGE', surface: item.surface, observed: item.version }))
    ],
    registryStatus: registry.status,
    versionStatus: version.status
  };
}

export function buildCapabilityDeltaReport(input: z.infer<typeof toolRegistryIntegritySchema>) {
  return {
    registeredCount: uniq(input.registeredTools).length,
    capabilityCount: uniq(input.capabilityTools).length,
    parityDelta: uniq(input.registeredTools).length - uniq(input.capabilityTools).length,
    registry: auditToolRegistry(input)
  };
}

export function compareRegistrySnapshots(input: z.infer<typeof toolRegistryIntegritySchema>) {
  return {
    current: {
      registry: auditToolRegistry(input),
      version: evaluateVersionConsistency(input)
    },
    previous: input.previous ?? null
  };
}

const ciJobSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  commands: z.array(z.string()).default([]),
  required: z.boolean().default(true),
  producesEvidence: z.boolean().default(false),
  provider: z.string().default('github-actions')
});

export const ciPipelineAssuranceSchema = z.object({
  pipelineId: z.string(),
  triggers: z.array(z.string()).default([]),
  jobs: z.array(ciJobSchema).default([]),
  requiredChecks: z.array(z.string()).default(['npm ci', 'npm run verify:mcp', 'npm run typecheck', 'npm run build']),
  deploymentProvider: z.string().optional(),
  dependsOnDeploymentProviderForBuild: z.boolean().default(false),
  previous: z.record(z.string(), z.unknown()).optional()
});

export function auditCiPipeline(input: z.infer<typeof ciPipelineAssuranceSchema>) {
  const commands = input.jobs.flatMap((job) => job.commands);
  const missingChecks = input.requiredChecks.filter((check) => !commands.some((command) => command.includes(check)));
  const missingPrTrigger = !input.triggers.some((trigger) => /pull_request/i.test(trigger));
  const missingPushTrigger = !input.triggers.some((trigger) => /push/i.test(trigger));
  const requiredJobsWithoutEvidence = input.jobs.filter((job) => job.required && !job.producesEvidence).map((job) => job.id);
  const blockers = [
    ...missingChecks.map((check) => `Missing CI check: ${check}`),
    ...(missingPrTrigger ? ['Missing pull_request trigger'] : []),
    ...(input.dependsOnDeploymentProviderForBuild ? ['Build verification depends on deployment provider'] : [])
  ];
  return {
    status: blockers.length ? 'BLOCKED' : missingPushTrigger || requiredJobsWithoutEvidence.length ? 'ATTENTION' : 'PASS',
    blockers,
    missingChecks,
    missingPrTrigger,
    missingPushTrigger,
    requiredJobsWithoutEvidence
  };
}

export function detectCiGateGaps(input: z.infer<typeof ciPipelineAssuranceSchema>) {
  const audit = auditCiPipeline(input);
  return {
    gaps: [
      ...audit.missingChecks.map((check) => ({ kind: 'MISSING_CHECK', check })),
      ...(audit.missingPrTrigger ? [{ kind: 'MISSING_TRIGGER', trigger: 'pull_request' }] : []),
      ...(audit.missingPushTrigger ? [{ kind: 'MISSING_TRIGGER', trigger: 'push' }] : []),
      ...audit.requiredJobsWithoutEvidence.map((job) => ({ kind: 'MISSING_EVIDENCE_OUTPUT', job }))
    ]
  };
}

export function enforceCiIndependence(input: z.infer<typeof ciPipelineAssuranceSchema>) {
  return {
    status: input.dependsOnDeploymentProviderForBuild ? 'BLOCKED' : 'PASS',
    deploymentProvider: input.deploymentProvider ?? null,
    rule: 'Build, type, and registry verification must run in GitHub CI without requiring Vercel preview capacity.'
  };
}

export function buildCiEvidenceManifest(input: z.infer<typeof ciPipelineAssuranceSchema>) {
  return {
    pipelineId: input.pipelineId,
    evidence: input.jobs.map((job) => ({
      jobId: job.id,
      provider: job.provider,
      required: job.required,
      commands: job.commands,
      producesEvidence: job.producesEvidence
    })),
    audit: auditCiPipeline(input)
  };
}

export function buildCiFailureTriagePlan(input: z.infer<typeof ciPipelineAssuranceSchema>) {
  return {
    triage: input.jobs.map((job) => ({
      jobId: job.id,
      firstDiagnostics: job.commands.map((command) => ({
        command,
        action: command.includes('build') ? 'Inspect framework build output and route compilation errors' :
          command.includes('typecheck') ? 'Inspect TypeScript errors at reported file and symbol' :
          command.includes('verify:mcp') ? 'Inspect registry/capabilities/version drift' :
          'Inspect command log and reproduce locally'
      }))
    }))
  };
}

export function compareCiPipelines(input: z.infer<typeof ciPipelineAssuranceSchema>) {
  return {
    current: auditCiPipeline(input),
    previous: input.previous ?? null
  };
}

export const deliveryHandoffSchema = z.object({
  project: z.string(),
  branch: z.string(),
  baseBranch: z.string(),
  commitSha: z.string().optional(),
  pullRequestUrl: z.string().optional(),
  changedPaths: z.array(z.string()).default([]),
  evidence: z.array(evidenceRefSchema).default([]),
  claims: z.array(z.object({
    id: z.string(),
    statement: z.string(),
    requiredEvidenceRefs: z.array(z.string()).default([]),
    status: controlStatus.default('UNKNOWN')
  })).default([]),
  mergeAllowed: z.boolean().default(false),
  previous: z.record(z.string(), z.unknown()).optional()
});

export function buildDeliveryHandoff(input: z.infer<typeof deliveryHandoffSchema>) {
  return {
    project: input.project,
    branch: input.branch,
    baseBranch: input.baseBranch,
    commitSha: input.commitSha ?? null,
    pullRequestUrl: input.pullRequestUrl ?? null,
    changedPaths: input.changedPaths,
    evidenceCount: input.evidence.length,
    claimCount: input.claims.length,
    mergeAllowed: input.mergeAllowed
  };
}

export function validateDeliveryHandoff(input: z.infer<typeof deliveryHandoffSchema>) {
  const verified = new Set(input.evidence.filter((item) => item.verified).map((item) => item.id));
  const unsupported = input.claims.filter((claim) => claim.status === 'PASS' && !claim.requiredEvidenceRefs.some((id) => verified.has(id)));
  const status = worstControl([
    input.commitSha ? 'PASS' : 'ATTENTION',
    input.pullRequestUrl ? 'PASS' : 'ATTENTION',
    unsupported.length ? 'BLOCKED' : 'PASS',
    input.mergeAllowed ? 'ATTENTION' : 'PASS'
  ]);
  return {
    status,
    unsupportedPassingClaims: unsupported.map((claim) => claim.id),
    missingCommit: !input.commitSha,
    missingPullRequest: !input.pullRequestUrl,
    mergeGuard: buildNoMergeGuard(input)
  };
}

export function buildReviewerChecklist(input: z.infer<typeof deliveryHandoffSchema>) {
  return {
    checklist: [
      { item: 'Confirm base branch', expected: input.baseBranch },
      { item: 'Review changed paths', expected: input.changedPaths },
      { item: 'Verify static MCP registry/capabilities parity', evidenceRefs: input.evidence.filter((e) => /registry|capabil/i.test(e.summary ?? e.id)).map((e) => e.id) },
      { item: 'Verify version consistency', evidenceRefs: input.evidence.filter((e) => /version/i.test(e.summary ?? e.id)).map((e) => e.id) },
      { item: 'Verify CI or local build evidence', evidenceRefs: input.evidence.filter((e) => /build|type|ci/i.test(e.summary ?? e.id)).map((e) => e.id) },
      { item: 'Confirm no merge to main was performed', expected: input.mergeAllowed === false }
    ]
  };
}

export function detectDeliveryClaimGaps(input: z.infer<typeof deliveryHandoffSchema>) {
  const evidenceIds = input.evidence.map((item) => item.id);
  return {
    gaps: input.claims
      .map((claim) => ({
        claimId: claim.id,
        missingEvidenceRefs: claim.requiredEvidenceRefs.filter((id) => !evidenceIds.includes(id)),
        unverifiedEvidenceRefs: claim.requiredEvidenceRefs.filter((id) => input.evidence.find((item) => item.id === id)?.verified !== true)
      }))
      .filter((claim) => claim.missingEvidenceRefs.length || claim.unverifiedEvidenceRefs.length)
  };
}

export function buildNoMergeGuard(input: z.infer<typeof deliveryHandoffSchema>) {
  return {
    status: input.mergeAllowed ? 'BLOCKED' : 'PASS',
    branch: input.branch,
    baseBranch: input.baseBranch,
    rule: 'Feature batch branches must remain unmerged until explicit owner approval and verified CI evidence exist.'
  };
}

export function compareDeliveryHandoffs(input: z.infer<typeof deliveryHandoffSchema>) {
  return {
    current: validateDeliveryHandoff(input),
    previous: input.previous ?? null
  };
}

