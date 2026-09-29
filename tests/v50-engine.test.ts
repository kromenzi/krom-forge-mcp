import assert from 'node:assert/strict';
import test from 'node:test';
import {
  policyAsCodeSchema, evidenceLineageSchema, verificationPortfolioSchema, confidenceCalibrationSchema,
  incidentCommandSchema, compatibilityLifecycleSchema, agentReliabilitySchema, continuousImprovementSchema
} from '../src/v50-schema';
import {
  evaluatePolicySet, detectPolicyConflicts, evaluateLineageIntegrity, findEvidenceContradictions,
  optimizeVerificationPortfolio, evaluateVerificationPortfolioResults, calculateReleaseConfidence, decideConfidenceGate,
  classifyIncidentSeverity, evaluateIncidentClosure, detectBreakingCompatibilityChanges, evaluateSunsetReadiness,
  detectUnsupportedAgentClaims, routeTaskByReliability, detectSystemicImprovementPatterns, prioritizeImprovementInvestments
} from '../src/v50-engine';

const evidence = (id: string, kind = 'TEST') => ({ id, kind, verified: true, source: 'test' });

test('policy engine blocks a matched deny rule', () => {
  const input = policyAsCodeSchema.parse({
    policySetId: 'release', facts: { branch: 'main' },
    policies: [{ id: 'no-direct-main', effect: 'DENY', condition: { field: 'branch', operator: 'EQUALS', value: 'main' } }]
  });
  assert.equal(evaluatePolicySet(input).decision, 'DENY');
});

test('policy exception needs approval, freshness and verified evidence', () => {
  const base = {
    policySetId: 'release', facts: { emergency: true }, now: '2026-01-01T00:00:00Z',
    policies: [{ id: 'freeze', effect: 'DENY' as const, condition: { field: 'emergency', operator: 'EQUALS' as const, value: true } }],
    evidence: [evidence('approval', 'APPROVAL')],
    exceptions: [{ id: 'ex', policyId: 'freeze', approved: true, expiresAt: '2026-02-01T00:00:00Z', evidenceRefs: ['approval'] }]
  };
  assert.equal(evaluatePolicySet(policyAsCodeSchema.parse(base)).decision, 'CONDITIONAL');
  const conflicting = policyAsCodeSchema.parse({ ...base, policies: [...base.policies, { id: 'allow', effect: 'ALLOW', priority: 0, scope: '*', condition: { field: 'emergency', operator: 'EQUALS', value: true } }] });
  assert.equal(detectPolicyConflicts(conflicting).status, 'FAIL');
});

test('evidence lineage rejects cycles', () => {
  const input = evidenceLineageSchema.parse({
    graphId: 'g', nodes: [{ id: 'a', kind: 'SOURCE' }, { id: 'b', kind: 'CLAIM' }],
    edges: [{ from: 'a', to: 'b', relation: 'SUPPORTS' }, { from: 'b', to: 'a', relation: 'DERIVED_FROM' }]
  });
  assert.equal(evaluateLineageIntegrity(input).status, 'FAIL');
});

test('evidence lineage rejects verified contradictions', () => {
  const input = evidenceLineageSchema.parse({
    graphId: 'g', nodes: [{ id: 'a', kind: 'TEST', verified: true }, { id: 'b', kind: 'TEST', verified: true }],
    edges: [{ from: 'a', to: 'b', relation: 'CONTRADICTS' }]
  });
  assert.equal(findEvidenceContradictions(input).status, 'FAIL');
});

test('verification optimizer keeps required gates and highest value coverage', () => {
  const input = verificationPortfolioSchema.parse({
    portfolioId: 'p', budgetMinutes: 12, changedCategories: ['API'], criticalCategories: ['AUTH'],
    gates: [
      { id: 'types', categories: ['CODE'], costMinutes: 2, riskReduction: 2, required: true },
      { id: 'auth-negative', categories: ['AUTH'], costMinutes: 5, riskReduction: 10 },
      { id: 'api', categories: ['API'], costMinutes: 4, riskReduction: 6 },
      { id: 'slow', categories: ['UI'], costMinutes: 20, riskReduction: 1 }
    ]
  });
  assert.deepEqual(optimizeVerificationPortfolio(input).selectedGateIds.sort(), ['api', 'auth-negative', 'types']);
});

test('verification result rejects unsupported passing gates', () => {
  const input = verificationPortfolioSchema.parse({
    portfolioId: 'p', budgetMinutes: 10, selectedGateIds: ['build'],
    gates: [{ id: 'build', categories: ['CODE'], costMinutes: 5, riskReduction: 5, status: 'PASS' }]
  });
  assert.equal(evaluateVerificationPortfolioResults(input).status, 'FAIL');
});

test('confidence model discounts evidence-free passes to zero', () => {
  const input = confidenceCalibrationSchema.parse({ modelId: 'c', signals: [{ id: 'build', kind: 'BUILD', status: 'PASS', weight: 5 }] });
  assert.equal(calculateReleaseConfidence(input).score, 0);
  assert.equal(decideConfidenceGate(input).decision, 'BLOCK');
});

test('confidence gate allows fully evidenced mandatory signals', () => {
  const input = confidenceCalibrationSchema.parse({
    modelId: 'c', minimumRequiredSignals: ['build'], evidence: [evidence('build-proof', 'BUILD')],
    signals: [{ id: 'build', kind: 'BUILD', status: 'PASS', weight: 5, evidenceRefs: ['build-proof'] }]
  });
  assert.equal(calculateReleaseConfidence(input).score, 100);
  assert.equal(decideConfidenceGate(input).decision, 'ALLOW');
});

test('incident severity uses only verified signals', () => {
  const input = incidentCommandSchema.parse({
    incidentId: 'i', summary: 'outage',
    signals: [{ id: 'rumor', category: 'runtime', severity: 'CRITICAL', verified: false }, { id: 'metric', category: 'runtime', severity: 'HIGH', verified: true }]
  });
  assert.equal(classifyIncidentSeverity(input).severity, 'HIGH');
});

test('incident closure requires owners and evidenced objectives', () => {
  const input = incidentCommandSchema.parse({
    incidentId: 'i', summary: 'outage', requiredRoles: ['incident-commander'],
    responders: [{ role: 'incident-commander', owner: 'on-call', acknowledged: true }],
    objectives: [{ id: 'recover', status: 'PASS', evidenceRefs: ['recovery'] }], evidence: [evidence('recovery', 'RUNTIME')]
  });
  assert.equal(evaluateIncidentClosure(input).status, 'PASS');
});

test('compatibility lifecycle detects added required inputs', () => {
  const input = compatibilityLifecycleSchema.parse({
    releaseId: 'v50', previous: [{ id: 'tool', version: '1', requiredInputs: ['a'], outputFields: ['status'] }],
    current: [{ id: 'tool', version: '2', requiredInputs: ['a', 'b'], outputFields: ['status'] }]
  });
  assert.equal(detectBreakingCompatibilityChanges(input).status, 'FAIL');
});

test('sunset readiness requires all consumers migrated and evidence', () => {
  const input = compatibilityLifecycleSchema.parse({
    releaseId: 'v50', now: '2026-02-01T00:00:00Z',
    previous: [{ id: 'old', version: '1', consumers: ['a'] }], current: [{ id: 'new', version: '2' }],
    deprecations: [{ interfaceId: 'old', announced: true, replacementId: 'new', sunsetAt: '2026-01-01T00:00:00Z', migratedConsumers: ['a'], evidenceRefs: ['migration'] }],
    evidence: [evidence('migration', 'CONTRACT')]
  });
  assert.equal(evaluateSunsetReadiness(input).status, 'PASS');
});

test('agent reliability rejects unsupported claims', () => {
  const input = agentReliabilitySchema.parse({
    evaluationId: 'e', agents: [{ id: 'a', runs: [{ id: 'r', taskCategory: 'backend', status: 'PASS', claims: [{ id: 'done' }] }] }]
  });
  assert.equal(detectUnsupportedAgentClaims(input).status, 'FAIL');
});

test('agent routing selects the evidenced matching specialist', () => {
  const handoffFields = ['status', 'changes', 'evidence', 'risks', 'openItems'];
  const input = agentReliabilitySchema.parse({
    evaluationId: 'e', taskCategory: 'backend', evidence: [evidence('proof')],
    agents: [
      { id: 'weak', specialization: ['backend'], runs: [{ id: 'w', taskCategory: 'backend', status: 'FAIL', handoffFields }] },
      { id: 'strong', specialization: ['backend'], runs: [{ id: 's', taskCategory: 'backend', status: 'PASS', claims: [{ id: 'done', evidenceRefs: ['proof'] }], handoffFields }] }
    ]
  });
  assert.equal(routeTaskByReliability(input).selectedAgentId, 'strong');
});

test('continuous improvement detects recurring high-severity patterns', () => {
  const input = continuousImprovementSchema.parse({
    programId: 'p', observations: [{ id: '1', category: 'ci', signature: 'flaky-build', severity: 'HIGH', recurring: true }]
  });
  assert.equal(detectSystemicImprovementPatterns(input).status, 'FAIL');
});

test('continuous improvement prioritizes within capacity', () => {
  const input = continuousImprovementSchema.parse({
    programId: 'p', capacityMinutes: 30,
    observations: [
      { id: '1', category: 'ci', signature: 'high', severity: 'CRITICAL', recurring: true, costMinutes: 20 },
      { id: '2', category: 'docs', signature: 'low', severity: 'LOW', costMinutes: 60 }
    ]
  });
  const result = prioritizeImprovementInvestments(input);
  assert.deepEqual(result.selected.map((item) => item.signature), ['high']);
  assert.deepEqual(result.deferred.map((item) => item.signature), ['low']);
});
