import assert from 'node:assert/strict';
import test from 'node:test';
import {
  releaseProvenanceSchema,
  buildReleaseAttestation,
  auditProvenanceBindings,
  adaptiveVerificationSchema,
  classifyAdaptiveChangeRisk,
  deriveAdaptiveVerificationPlan,
  evaluateAdaptiveVerificationCoverage,
  toolContractCatalogSchema,
  detectToolContractCompatibilityRisk,
  evaluateToolContractResults,
  ciRunEvidenceSchema,
  auditCiRunBinding,
  evaluateCiRunTrust,
  recoveryRehearsalSchema,
  evaluateRecoveryRehearsal,
  buildFailureInjectionMatrix,
  mergePolicySchema,
  evaluateMergePolicy,
  detectMergeBypassRisk
} from '../src/mega-v49';

const commit = 'a'.repeat(40);
const digest = `sha256:${'b'.repeat(64)}`;

test('release attestation passes only with verified commit-bound evidence', () => {
  const input = releaseProvenanceSchema.parse({
    releaseId: 'v49', version: '49.0.0', branch: 'v49', commitSha: commit,
    artifacts: [{ id: 'build', kind: 'BUILD', source: 'ci', commitSha: commit, digest, verified: true }],
    claims: [{ id: 'build-passed', statement: 'Build passed', requiredKinds: ['BUILD'], evidenceRefs: ['build'] }],
    gates: [{ id: 'build', status: 'PASS', evidenceRefs: ['build'] }]
  });
  assert.equal(buildReleaseAttestation(input).status, 'PASS');
});

test('provenance audit rejects evidence from another commit', () => {
  const input = releaseProvenanceSchema.parse({
    releaseId: 'v49', version: '49.0.0', branch: 'v49', commitSha: commit,
    artifacts: [{ id: 'test', kind: 'TEST', source: 'ci', commitSha: 'c'.repeat(40), verified: true }],
    claims: [{ id: 'tests', statement: 'Tests passed', evidenceRefs: ['test'] }]
  });
  assert.equal(auditProvenanceBindings(input).status, 'FAIL');
});

test('adaptive plan escalates auth and irreversible changes', () => {
  const input = adaptiveVerificationSchema.parse({
    changeId: 'auth-change', categories: ['AUTH', 'API'], reversible: false, externallyVisible: true
  });
  assert.equal(classifyAdaptiveChangeRisk(input).effective, 'CRITICAL');
  const gates = deriveAdaptiveVerificationPlan(input).requiredGates;
  assert.ok(gates.includes('security-negative-tests'));
  assert.ok(gates.includes('recovery-rehearsal'));
  assert.ok(gates.includes('independent-approval'));
});

test('adaptive coverage rejects a pass without verified evidence', () => {
  const base = adaptiveVerificationSchema.parse({ changeId: 'code', categories: ['CODE'] });
  const plan = deriveAdaptiveVerificationPlan(base);
  const input = adaptiveVerificationSchema.parse({
    changeId: 'code', categories: ['CODE'],
    gateResults: plan.requiredGates.map((id) => ({ id, status: 'PASS' }))
  });
  assert.equal(evaluateAdaptiveVerificationCoverage(input).status, 'FAIL');
});

test('tool contract compatibility catches required inputs and removed outputs', () => {
  const input = toolContractCatalogSchema.parse({
    tools: [{ name: 'krom_example', title: 'Example', description: 'Example tool', schemaVersion: '2', requiredInputs: ['project', 'token'], outputFields: ['status'], handlerBound: true, capabilityListed: true }],
    previousTools: [{ name: 'krom_example', title: 'Example', description: 'Example tool', schemaVersion: '1', requiredInputs: ['project'], outputFields: ['status', 'details'], handlerBound: true, capabilityListed: true }]
  });
  const result = detectToolContractCompatibilityRisk(input);
  assert.equal(result.status, 'FAIL');
  assert.deepEqual(result.changed[0].addedRequiredInputs, ['token']);
  assert.deepEqual(result.changed[0].removedOutputs, ['details']);
});

test('tool contract results require the complete generated matrix', () => {
  const input = toolContractCatalogSchema.parse({
    tools: [{ name: 'krom_example', title: 'Example', description: 'Example tool', handlerBound: true, capabilityListed: true }]
  });
  const result = evaluateToolContractResults(input);
  assert.equal(result.status, 'PASS_WITH_GAPS');
  assert.equal(result.expected, 4);
  assert.equal(result.missing.length, 4);
});

test('CI run trust rejects a run for the wrong commit', () => {
  const input = ciRunEvidenceSchema.parse({
    runId: '100', branch: 'v49', expectedBranch: 'v49', commitSha: 'c'.repeat(40), expectedCommitSha: commit
  });
  assert.equal(auditCiRunBinding(input).status, 'FAIL');
  assert.equal(evaluateCiRunTrust(input).status, 'FAIL');
});

test('CI run trust passes a fully evidenced run', () => {
  const requiredChecks = ['registry', 'typecheck', 'tests', 'build'];
  const artifacts = requiredChecks.map((name) => ({ id: name, kind: name === 'build' ? 'BUILD' : 'TEST', source: 'github-actions', commitSha: commit, digest, verified: true }));
  const input = ciRunEvidenceSchema.parse({
    runId: '101', runUrl: 'https://example.test/run/101', branch: 'v49', expectedBranch: 'v49', commitSha: commit, expectedCommitSha: commit, conclusion: 'PASS',
    checks: requiredChecks.map((name) => ({ name, status: 'PASS', evidenceRefs: [name] })), artifacts
  });
  assert.equal(evaluateCiRunTrust(input).status, 'PASS');
});

test('recovery rehearsal requires verified recovery evidence', () => {
  const input = recoveryRehearsalSchema.parse({
    releaseId: 'v49', availableCapabilities: ['rollback'],
    scenarios: [{ id: 'bad-release', failureMode: 'runtime regression', requiredCapabilities: ['rollback'], targetRtoMinutes: 10 }],
    results: [{ scenarioId: 'bad-release', status: 'PASS', actualRtoMinutes: 5 }]
  });
  const result = evaluateRecoveryRehearsal(input);
  assert.equal(result.status, 'FAIL');
  assert.deepEqual(result.unsupportedPasses, ['bad-release']);
});

test('failure injection matrix always carries production abort guards', () => {
  const input = recoveryRehearsalSchema.parse({
    releaseId: 'v49', scenarios: [{ id: 'dependency-loss', failureMode: 'dependency unavailable' }]
  });
  const item = buildFailureInjectionMatrix(input).matrix[0];
  assert.equal(item.injectOnlyInIsolatedEnvironment, true);
  assert.equal(item.abortIfProductionTargeted, true);
});

test('merge policy blocks stale approvals and unsupported checks', () => {
  const input = mergePolicySchema.parse({
    policyId: 'strict', branch: 'v49', commitSha: commit,
    checks: ['registry', 'typecheck', 'tests', 'build'].map((name) => ({ name, status: 'PASS' })),
    approvals: [{ id: 'maintainer', role: 'maintainer', status: 'APPROVED', commitSha: 'c'.repeat(40) }]
  });
  assert.equal(detectMergeBypassRisk(input).status, 'FAIL');
  assert.equal(evaluateMergePolicy(input).decision, 'BLOCK');
});

test('merge policy allows exact checks and approvals with verified evidence', () => {
  const checks = ['registry', 'typecheck', 'tests', 'build'];
  const evidence = [
    ...checks.map((name) => ({ id: name, kind: 'TEST', source: 'ci', commitSha: commit, digest, verified: true })),
    { id: 'approval', kind: 'APPROVAL', source: 'review', commitSha: commit, digest, verified: true }
  ];
  const input = mergePolicySchema.parse({
    policyId: 'strict', branch: 'v49', commitSha: commit,
    checks: checks.map((name) => ({ name, status: 'PASS', evidenceRefs: [name] })),
    approvals: [{ id: 'maintainer', role: 'maintainer', actor: 'reviewer', status: 'APPROVED', commitSha: commit, evidenceRefs: ['approval'] }],
    evidence
  });
  assert.equal(evaluateMergePolicy(input).decision, 'ALLOW');
});
