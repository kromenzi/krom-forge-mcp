import assert from 'node:assert/strict';
import test from 'node:test';
import {
  missionRuntimeSchema, causalDecisionSchema, scenarioLabSchema, riskCapitalSchema,
  capabilityMarketSchema, knowledgeMemorySchema, safetyCaseSchema, releaseTwinSchema,
  toolEcosystemSchema, driftForecastSchema, humanOversightSchema, outcomeLearningSchema
} from '../src/v51-schema';
import {
  createMissionRuntime, detectMissionDeadlock, scoreDecisionOptions, detectDecisionAssumptionDrift,
  selectResilientStrategy, detectScenarioFragility, allocateChangeRiskCapital, detectRiskConcentration,
  matchCapabilityDemand, evaluateDelegationContracts, evaluateKnowledgeFreshness, detectKnowledgeContradictions,
  detectAssuranceGaps, buildReleaseAssuranceCase, simulateReleaseTransition, injectReleaseFailures,
  detectToolDependencyCycles, evaluateToolChainResilience, optimizeToolChain, forecastEngineeringDrift, evaluateDriftThresholds,
  classifyHumanReviewNeed, auditHumanApprovalChain, measureInterventionEffect, calibrateOutcomePredictions
} from '../src/v51-engine';

const evidence = (id: string, kind = 'TEST') => ({ id, kind, verified: true, source: 'test' });

test('mission runtime blocks approval without verified approval evidence', () => {
  const input = missionRuntimeSchema.parse({
    missionId: 'm', availableCapabilities: ['write'], evidence: [evidence('code')],
    approvals: [{ actionId: 'patch', approved: true, evidenceRefs: ['missing'] }],
    stages: [{ id: 'patch', requiredCapabilities: ['write'], requiredEvidence: ['code'], requiresApproval: true }]
  });
  assert.deepEqual(createMissionRuntime(input).executableStageIds, []);
  assert.deepEqual(createMissionRuntime(input).stages[0].blockers, ['approval:patch']);
});

test('mission runtime detects cyclic deadlock', () => {
  const input = missionRuntimeSchema.parse({ missionId: 'm', stages: [{ id: 'a', dependsOn: ['b'] }, { id: 'b', dependsOn: ['a'] }] });
  const result = detectMissionDeadlock(input);
  assert.equal(result.status, 'FAIL');
  assert.ok(result.dependencyCycles.length > 0);
});

test('decision scoring discounts options without evidence', () => {
  const input = causalDecisionSchema.parse({
    decisionId: 'd', objective: 'choose', evidence: [evidence('proof')],
    assumptions: [{ id: 'a', status: 'VALID', evidenceRefs: ['proof'] }],
    options: [
      { id: 'supported', benefits: [100], costs: [10], risk: 10, evidenceRefs: ['proof'], assumptionIds: ['a'] },
      { id: 'unsupported', benefits: [1000], evidenceRefs: [], assumptionIds: ['a'] }
    ]
  });
  assert.equal(scoreDecisionOptions(input).recommendedOptionId, 'supported');
});

test('decision assumption drift rejects evidence-free valid assumptions', () => {
  const input = causalDecisionSchema.parse({ decisionId: 'd', objective: 'choose', assumptions: [{ id: 'a', status: 'VALID' }] });
  assert.equal(detectDecisionAssumptionDrift(input).status, 'FAIL');
});

test('scenario lab selects the best resilient worst case', () => {
  const input = scenarioLabSchema.parse({
    labId: 's', availableCapabilities: ['ci'], evidence: [evidence('a'), evidence('b')],
    strategies: [{ id: 'fast', baseValue: 30, cost: 5, requiredCapabilities: ['ci'], evidenceRefs: ['a'] }, { id: 'safe', baseValue: 20, cost: 2, evidenceRefs: ['b'] }],
    scenarios: [{ id: 'normal', probability: 0.5, impacts: { fast: 10, safe: 5 } }, { id: 'failure', probability: 0.5, impacts: { fast: -50, safe: -5 } }]
  });
  assert.equal(selectResilientStrategy(input).selectedStrategyId, 'safe');
});

test('scenario lab exposes missing capability fragility', () => {
  const input = scenarioLabSchema.parse({ labId: 's', strategies: [{ id: 'gpu', requiredCapabilities: ['gpu'] }], scenarios: [{ id: 'base', probability: 1 }] });
  assert.deepEqual(detectScenarioFragility(input).fragile[0].missingCapabilities, ['gpu']);
});

test('scenario lab cannot select an unsupported strategy', () => {
  const input = scenarioLabSchema.parse({ labId: 's', strategies: [{ id: 'unsupported', baseValue: 100 }], scenarios: [{ id: 'base', probability: 1 }] });
  assert.equal(selectResilientStrategy(input).selectedStrategyId, null);
});

test('risk capital allocates only evidenced changes within budget', () => {
  const input = riskCapitalSchema.parse({
    portfolioId: 'p', budget: 10, evidence: [evidence('a'), evidence('b')],
    changes: [{ id: 'high', risk: 8, value: 80, evidenceRefs: ['a'] }, { id: 'low', risk: 4, value: 8, evidenceRefs: ['b'] }, { id: 'unsupported', risk: 1, value: 100 }]
  });
  assert.deepEqual(allocateChangeRiskCapital(input).selectedChangeIds, ['high']);
});

test('risk capital detects domain concentration', () => {
  const input = riskCapitalSchema.parse({ portfolioId: 'p', budget: 100, changes: [{ id: 'a', risk: 80, domains: ['auth'] }, { id: 'b', risk: 20, domains: ['ui'] }] });
  assert.equal(detectRiskConcentration(input).concentrations[0].domain, 'auth');
});

test('capability market ignores unverified high reliability offers', () => {
  const input = capabilityMarketSchema.parse({
    marketId: 'm', evidence: [evidence('trusted')], demands: [{ id: 'd', capability: 'build', minimumReliability: 80 }],
    offers: [{ id: 'fake', provider: 'x', capabilities: ['build'], reliability: 100 }, { id: 'real', provider: 'y', capabilities: ['build'], reliability: 90, evidenceRefs: ['trusted'] }]
  });
  assert.equal(matchCapabilityDemand(input).matches[0].offerId, 'real');
});

test('delegation contracts require verified approval', () => {
  const input = capabilityMarketSchema.parse({
    marketId: 'm', evidence: [evidence('offer')], demands: [{ id: 'd', capability: 'build' }],
    offers: [{ id: 'o', provider: 'x', capabilities: ['build'], reliability: 90, evidenceRefs: ['offer'] }],
    contracts: [{ demandId: 'd', offerId: 'o', accepted: true, approvalEvidenceRefs: ['missing'] }]
  });
  assert.equal(evaluateDelegationContracts(input).status, 'FAIL');
});

test('capability matching enforces required evidence kinds', () => {
  const input = capabilityMarketSchema.parse({
    marketId: 'm', evidence: [evidence('approval', 'APPROVAL')], demands: [{ id: 'd', capability: 'build', requiredEvidenceKinds: ['BUILD'] }],
    offers: [{ id: 'o', provider: 'x', capabilities: ['build'], reliability: 100, evidenceRefs: ['approval'] }]
  });
  assert.equal(matchCapabilityDemand(input).matches[0].offerId, null);
});

test('knowledge freshness rejects expired knowledge', () => {
  const input = knowledgeMemorySchema.parse({
    memoryId: 'k', now: '2026-03-01T00:00:00Z', evidence: [evidence('proof')],
    items: [{ id: 'old', topic: 'api', statement: 'old', observedAt: '2026-01-01T00:00:00Z', expiresAt: '2026-02-01T00:00:00Z', verified: true, evidenceRefs: ['proof'] }]
  });
  assert.equal(evaluateKnowledgeFreshness(input).items[0].fresh, false);
});

test('knowledge memory detects active verified contradictions', () => {
  const input = knowledgeMemorySchema.parse({
    memoryId: 'k', now: '2026-01-01T00:00:00Z', evidence: [evidence('a'), evidence('b')],
    items: [
      { id: 'a', topic: 'api', statement: 'on', observedAt: '2026-01-01T00:00:00Z', verified: true, evidenceRefs: ['a'], contradicts: ['b'] },
      { id: 'b', topic: 'api', statement: 'off', observedAt: '2026-01-01T00:00:00Z', verified: true, evidenceRefs: ['b'] }
    ]
  });
  assert.equal(detectKnowledgeContradictions(input).status, 'FAIL');
});

test('safety case detects uncontrolled hazards', () => {
  const input = safetyCaseSchema.parse({ caseId: 's', hazards: [{ id: 'h', severity: 'CRITICAL', probability: 0.5 }] });
  assert.deepEqual(detectAssuranceGaps(input).hazardGaps, ['h']);
});

test('release assurance allows a fully evidenced low residual risk case', () => {
  const input = safetyCaseSchema.parse({
    caseId: 's', releaseId: 'v51', evidence: [evidence('claim'), evidence('arg'), evidence('control')],
    hazards: [{ id: 'h', severity: 'LOW', probability: 0.1, controlIds: ['c'] }],
    controls: [{ id: 'c', hazardIds: ['h'], effectiveness: 1, verified: true, evidenceRefs: ['control'] }],
    claims: [{ id: 'safe', statement: 'safe', status: 'SUPPORTED', argumentIds: ['a'], evidenceRefs: ['claim'] }],
    arguments: [{ id: 'a', claimId: 'safe', evidenceRefs: ['arg'] }]
  });
  assert.equal(buildReleaseAssuranceCase(input).decision, 'ALLOW');
});

test('release twin blocks transitions missing evidence', () => {
  const input = releaseTwinSchema.parse({ releaseId: 'r', components: [{ id: 'api', currentVersion: '1', targetVersion: '2' }], transitions: [{ componentId: 'api', risk: 10, requiredEvidence: ['build'] }] });
  assert.equal(simulateReleaseTransition(input).status, 'FAIL');
});

test('release twin propagates injected failures', () => {
  const input = releaseTwinSchema.parse({
    releaseId: 'r', components: [{ id: 'db', currentVersion: '1', targetVersion: '1', health: 100 }, { id: 'api', currentVersion: '1', targetVersion: '2', health: 100, dependsOn: ['db'] }],
    injections: [{ id: 'f', componentId: 'db', healthDelta: -80, propagates: true }]
  });
  const result = injectReleaseFailures(input);
  assert.equal(result.components.find((item) => item.componentId === 'api')?.predictedHealth, 60);
});

test('tool ecosystem detects dependency cycles', () => {
  const input = toolEcosystemSchema.parse({ ecosystemId: 'e', tools: [{ id: 'a', dependsOn: ['b'] }, { id: 'b', dependsOn: ['a'] }] });
  assert.equal(detectToolDependencyCycles(input).status, 'FAIL');
});

test('tool optimizer includes transitive dependencies', () => {
  const input = toolEcosystemSchema.parse({
    ecosystemId: 'e', evidence: [evidence('a'), evidence('b')], requirements: [{ id: 'r', capability: 'deploy' }],
    tools: [{ id: 'a', capabilities: ['deploy'], dependsOn: ['b'], reliability: 90, evidenceRefs: ['a'] }, { id: 'b', capabilities: ['auth'], reliability: 90, evidenceRefs: ['b'] }]
  });
  assert.deepEqual(optimizeToolChain(input).selectedToolIds.sort(), ['a', 'b']);
});

test('tool resilience rejects a missing dependency', () => {
  const input = toolEcosystemSchema.parse({
    ecosystemId: 'e', evidence: [evidence('tool')], requirements: [{ id: 'r', capability: 'deploy' }],
    tools: [{ id: 'a', capabilities: ['deploy'], dependsOn: ['missing'], reliability: 90, evidenceRefs: ['tool'] }]
  });
  assert.equal(evaluateToolChainResilience(input).status, 'FAIL');
});

test('drift forecast ignores unsupported points', () => {
  const input = driftForecastSchema.parse({
    forecastId: 'f', horizon: 1, evidence: [evidence('a'), evidence('b')],
    metrics: [{ id: 'latency', direction: 'MAX', threshold: 100, points: [{ index: 0, value: 10, evidenceRefs: ['a'] }, { index: 1, value: 20, evidenceRefs: ['b'] }, { index: 2, value: 1000 }] }]
  });
  assert.equal(forecastEngineeringDrift(input).forecasts[0].forecast, 30);
});

test('drift thresholds report projected breaches', () => {
  const input = driftForecastSchema.parse({
    forecastId: 'f', horizon: 1, evidence: [evidence('a'), evidence('b')],
    metrics: [{ id: 'errors', direction: 'MAX', threshold: 15, points: [{ index: 0, value: 5, evidenceRefs: ['a'] }, { index: 1, value: 12, evidenceRefs: ['b'] }] }]
  });
  assert.equal(evaluateDriftThresholds(input).status, 'FAIL');
});

test('oversight classifies irreversible actions for review', () => {
  const input = humanOversightSchema.parse({ modelId: 'o', actions: [{ id: 'delete', impact: 10, uncertainty: 10, reversible: false }] });
  assert.equal(classifyHumanReviewNeed(input).actions[0].reviewRequired, true);
});

test('oversight requires role-complete evidenced approvals', () => {
  const input = humanOversightSchema.parse({
    modelId: 'o', evidence: [evidence('approval')], actions: [{ id: 'release', impact: 90, uncertainty: 10, requiredRoles: ['owner', 'security'] }],
    approvals: [{ actionId: 'release', role: 'owner', approved: true, evidenceRefs: ['approval'] }]
  });
  assert.equal(auditHumanApprovalChain(input).status, 'FAIL');
});

test('oversight rejects reviewable actions without a reviewer role', () => {
  const input = humanOversightSchema.parse({ modelId: 'o', actions: [{ id: 'release', impact: 90, uncertainty: 10 }] });
  assert.deepEqual(auditHumanApprovalChain(input).actions[0].missingRoles, ['UNSPECIFIED_REVIEWER']);
});

test('outcome learning measures only verified outcomes', () => {
  const input = outcomeLearningSchema.parse({
    programId: 'l', evidence: [evidence('intervention'), evidence('outcome')], minimumSamples: 1,
    interventions: [{ id: 'i', action: 'cache', predictedImpact: 10, evidenceRefs: ['intervention'] }],
    outcomes: [{ id: 'good', interventionId: 'i', metric: 'latency', baseline: 100, value: 80, evidenceRefs: ['outcome'] }, { id: 'fake', interventionId: 'i', metric: 'latency', baseline: 100, value: 0 }]
  });
  assert.equal(measureInterventionEffect(input).effects[0].effect, -20);
});

test('outcome calibration exposes prediction error', () => {
  const input = outcomeLearningSchema.parse({
    programId: 'l', evidence: [evidence('intervention'), evidence('outcome')], interventions: [{ id: 'i', action: 'cache', predictedImpact: -10, evidenceRefs: ['intervention'] }],
    outcomes: [{ id: 'o', interventionId: 'i', metric: 'latency', baseline: 100, value: 80, evidenceRefs: ['outcome'] }]
  });
  assert.equal(calibrateOutcomePredictions(input).meanAbsoluteError, 10);
});
