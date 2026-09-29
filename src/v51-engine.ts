import { z } from 'zod';
import {
  missionRuntimeSchema, causalDecisionSchema, scenarioLabSchema, riskCapitalSchema,
  capabilityMarketSchema, knowledgeMemorySchema, safetyCaseSchema, releaseTwinSchema,
  toolEcosystemSchema, driftForecastSchema, humanOversightSchema, outcomeLearningSchema
} from './v51-schema';

type MissionInput = z.infer<typeof missionRuntimeSchema>;
type DecisionInput = z.infer<typeof causalDecisionSchema>;
type ScenarioInput = z.infer<typeof scenarioLabSchema>;
type RiskInput = z.infer<typeof riskCapitalSchema>;
type MarketInput = z.infer<typeof capabilityMarketSchema>;
type KnowledgeInput = z.infer<typeof knowledgeMemorySchema>;
type SafetyInput = z.infer<typeof safetyCaseSchema>;
type TwinInput = z.infer<typeof releaseTwinSchema>;
type ToolInput = z.infer<typeof toolEcosystemSchema>;
type DriftInput = z.infer<typeof driftForecastSchema>;
type OversightInput = z.infer<typeof humanOversightSchema>;
type OutcomeInput = z.infer<typeof outcomeLearningSchema>;

const uniq = <T>(items: T[]) => [...new Set(items)];
const verifiedIds = (input: { evidence: Array<{ id: string; verified: boolean; expiresAt?: string }> }, now?: string) => {
  const time = now ? Date.parse(now) : Date.now();
  return new Set(input.evidence.filter((item) => item.verified && (!item.expiresAt || Date.parse(item.expiresAt) >= time)).map((item) => item.id));
};
const refsVerified = (refs: string[], ids: Set<string>) => refs.length > 0 && refs.every((ref) => ids.has(ref));
const round = (value: number) => Math.round(value * 100) / 100;
const riskWeight: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

function cycles(nodes: string[], edges: Array<[string, string]>) {
  const adjacency = new Map(nodes.map((node) => [node, [] as string[]]));
  for (const [from, to] of edges) adjacency.get(from)?.push(to);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const found: string[][] = [];
  const visit = (node: string, path: string[]) => {
    if (visiting.has(node)) { found.push([...path.slice(path.indexOf(node)), node]); return; }
    if (visited.has(node)) return;
    visiting.add(node);
    for (const next of adjacency.get(node) ?? []) visit(next, [...path, node]);
    visiting.delete(node); visited.add(node);
  };
  for (const node of nodes) visit(node, []);
  return found;
}

// Mission runtime and checkpointing
export function createMissionRuntime(input: MissionInput) {
  const passed = new Set(input.stages.filter((stage) => stage.status === 'PASS').map((stage) => stage.id));
  const evidence = verifiedIds(input, input.now);
  const approvals = new Map(input.approvals.map((approval) => [approval.actionId, approval]));
  const stages = input.stages.map((stage) => {
    const blockers = [
      ...stage.dependsOn.filter((id) => !passed.has(id)).map((id) => `dependency:${id}`),
      ...stage.requiredCapabilities.filter((capability) => !input.availableCapabilities.includes(capability)).map((capability) => `capability:${capability}`),
      ...stage.requiredEvidence.filter((id) => !evidence.has(id)).map((id) => `evidence:${id}`)
    ];
    const approval = approvals.get(stage.id);
    if (stage.requiresApproval && (!approval?.approved || !refsVerified(approval.evidenceRefs, evidence))) blockers.push(`approval:${stage.id}`);
    if (stage.attempts >= stage.maxAttempts && stage.status !== 'PASS') blockers.push(`retry-budget:${stage.id}`);
    return { ...stage, blockers, executable: blockers.length === 0 && ['PENDING', 'READY'].includes(stage.status) };
  });
  return { missionId: input.missionId, stages, executableStageIds: stages.filter((stage) => stage.executable).map((stage) => stage.id) };
}

export function evaluateMissionTransition(input: MissionInput) {
  const runtime = createMissionRuntime(input);
  const invalidPasses = runtime.stages.filter((stage) => stage.status === 'PASS' && stage.blockers.length > 0);
  return { status: invalidPasses.length ? 'FAIL' : runtime.stages.every((stage) => stage.status === 'PASS') ? 'PASS' : runtime.executableStageIds.length ? 'READY' : 'BLOCKED', invalidPasses: invalidPasses.map((stage) => stage.id), nextStageIds: runtime.executableStageIds };
}

export function selectMissionCheckpoint(input: MissionInput) {
  const candidates = input.stages.filter((stage) => stage.status === 'PASS' && stage.checkpoint && stage.reversible);
  return { checkpointId: candidates.at(-1)?.id ?? null, candidates: candidates.map((stage) => stage.id) };
}

export function detectMissionDeadlock(input: MissionInput) {
  const runtime = createMissionRuntime(input);
  const unfinished = runtime.stages.filter((stage) => stage.status !== 'PASS');
  const dependencyCycles = cycles(input.stages.map((stage) => stage.id), input.stages.flatMap((stage) => stage.dependsOn.map((dep) => [stage.id, dep] as [string, string])));
  return { status: unfinished.length && runtime.executableStageIds.length === 0 ? 'FAIL' : 'PASS', deadlockedStageIds: unfinished.filter((stage) => !stage.executable).map((stage) => stage.id), dependencyCycles };
}

export function buildMissionRecoveryRoute(input: MissionInput) {
  const checkpoint = selectMissionCheckpoint(input).checkpointId;
  const failed = input.stages.filter((stage) => stage.status === 'FAIL' || stage.attempts >= stage.maxAttempts).map((stage) => stage.id);
  return { checkpointId: checkpoint, failedStageIds: failed, action: failed.length ? checkpoint ? 'ROLL_BACK_TO_CHECKPOINT' : 'STOP_AND_REPLAN' : 'CONTINUE', evidenceBoundary: 'Recovery is a plan; host execution is not implied.' };
}

export function compareMissionRuns(input: MissionInput) {
  const current = Object.fromEntries(input.stages.map((stage) => [stage.id, stage.status]));
  return { changes: input.stages.filter((stage) => input.previousStages[stage.id] !== undefined && input.previousStages[stage.id] !== stage.status).map((stage) => ({ stageId: stage.id, before: input.previousStages[stage.id], after: stage.status })), addedStages: Object.keys(current).filter((id) => input.previousStages[id] === undefined), transition: evaluateMissionTransition(input) };
}

// Causal decision intelligence
export function buildCausalDecisionGraph(input: DecisionInput) {
  const nodeIds = uniq([...input.options.map((item) => item.id), ...input.assumptions.map((item) => item.id)]);
  const invalidEdges = input.edges.filter((edge) => !nodeIds.includes(edge.from) || !nodeIds.includes(edge.to));
  return { nodes: nodeIds, edges: input.edges, invalidEdges, cycles: cycles(nodeIds, input.edges.filter((edge) => edge.relation === 'DEPENDS_ON').map((edge) => [edge.from, edge.to])) };
}

export function scoreDecisionOptions(input: DecisionInput) {
  const evidence = verifiedIds(input);
  const assumptions = new Map(input.assumptions.map((item) => [item.id, item]));
  const scores = input.options.map((option) => {
    const evidenceFactor = option.evidenceRefs.length ? option.evidenceRefs.filter((id) => evidence.has(id)).length / option.evidenceRefs.length : 0;
    const invalidAssumptions = option.assumptionIds.filter((id) => assumptions.get(id)?.status !== 'VALID');
    const utility = option.benefits.reduce((a, b) => a + b, 0) - option.costs.reduce((a, b) => a + b, 0) - option.risk;
    return { optionId: option.id, score: round(utility * evidenceFactor - invalidAssumptions.length * 25), evidenceFactor: round(evidenceFactor), invalidAssumptions };
  }).sort((a, b) => b.score - a.score);
  return { scores, recommendedOptionId: scores[0]?.optionId ?? null };
}

export function detectDecisionAssumptionDrift(input: DecisionInput) {
  const evidence = verifiedIds(input);
  const drifted = input.assumptions.filter((assumption) => assumption.status === 'INVALID' || (assumption.status === 'VALID' && !refsVerified(assumption.evidenceRefs, evidence)));
  return { status: drifted.length ? 'FAIL' : 'PASS', driftedAssumptions: drifted.map((item) => item.id) };
}

export function evaluateDecisionReversibility(input: DecisionInput) {
  const selected = input.options.find((option) => option.id === input.selectedOptionId);
  return { selectedOptionId: selected?.id ?? null, reversible: selected?.reversible ?? null, rollbackRequired: selected ? !selected.reversible || selected.risk >= 70 : true, evidenceVerified: selected ? refsVerified(selected.evidenceRefs, verifiedIds(input)) : false };
}

export function traceDecisionOutcomes(input: DecisionInput) {
  const evidence = verifiedIds(input);
  return { outcomes: input.outcomes.map((outcome) => ({ ...outcome, verified: refsVerified(outcome.evidenceRefs, evidence) })), unsupportedOutcomeIds: input.outcomes.filter((outcome) => !refsVerified(outcome.evidenceRefs, evidence)).map((outcome) => outcome.metric) };
}

export function compareDecisionPaths(input: DecisionInput) {
  return { previousSelectedOptionId: input.previousSelectedOptionId ?? null, currentSelectedOptionId: input.selectedOptionId ?? scoreDecisionOptions(input).recommendedOptionId, changed: Boolean(input.previousSelectedOptionId && input.previousSelectedOptionId !== input.selectedOptionId), scoring: scoreDecisionOptions(input), drift: detectDecisionAssumptionDrift(input) };
}

// Counterfactual scenario laboratory
export function simulateDeliveryScenarios(input: ScenarioInput) {
  const evidence = verifiedIds(input);
  return { simulations: input.strategies.map((strategy) => {
    const outcomes = input.scenarios.map((scenario) => ({ scenarioId: scenario.id, probability: scenario.probability, value: strategy.baseValue + (scenario.impacts[strategy.id] ?? 0) - strategy.cost }));
    const evidenceFactor = strategy.evidenceRefs.length ? strategy.evidenceRefs.filter((id) => evidence.has(id)).length / strategy.evidenceRefs.length : 0;
    return { strategyId: strategy.id, expectedValue: round(outcomes.reduce((sum, item) => sum + item.probability * item.value, 0) * evidenceFactor), outcomes, evidenceFactor: round(evidenceFactor) };
  }) };
}

export function rankCounterfactualStrategies(input: ScenarioInput) {
  const ranked = simulateDeliveryScenarios(input).simulations.sort((a, b) => b.expectedValue - a.expectedValue);
  return { ranking: ranked.map((item, index) => ({ rank: index + 1, ...item })) };
}

export function detectScenarioFragility(input: ScenarioInput) {
  const simulations = simulateDeliveryScenarios(input).simulations;
  return { fragile: simulations.map((simulation) => {
    const values = simulation.outcomes.map((item) => item.value);
    const strategy = input.strategies.find((item) => item.id === simulation.strategyId)!;
    const missingCapabilities = strategy.requiredCapabilities.filter((capability) => !input.availableCapabilities.includes(capability));
    return { strategyId: simulation.strategyId, range: values.length ? Math.max(...values) - Math.min(...values) : 0, missingCapabilities, fragile: missingCapabilities.length > 0 || (values.length ? Math.min(...values) < 0 : true) };
  }).filter((item) => item.fragile) };
}

export function buildScenarioSensitivityMap(input: ScenarioInput) {
  return { sensitivity: input.strategies.map((strategy) => ({ strategyId: strategy.id, drivers: input.scenarios.map((scenario) => ({ scenarioId: scenario.id, impact: scenario.impacts[strategy.id] ?? 0 })).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)) })) };
}

export function selectResilientStrategy(input: ScenarioInput) {
  const simulations = simulateDeliveryScenarios(input).simulations.map((item) => ({ ...item, worstCase: item.outcomes.length ? Math.min(...item.outcomes.map((outcome) => outcome.value)) : Number.NEGATIVE_INFINITY }));
  const eligible = simulations.filter((item) => item.evidenceFactor > 0 && item.outcomes.length > 0 && !detectScenarioFragility(input).fragile.some((fragile) => fragile.strategyId === item.strategyId && fragile.missingCapabilities.length));
  eligible.sort((a, b) => b.worstCase - a.worstCase || b.expectedValue - a.expectedValue);
  return { selectedStrategyId: eligible[0]?.strategyId ?? null, candidates: eligible };
}

export function compareScenarioSets(input: ScenarioInput) {
  const current = rankCounterfactualStrategies(input).ranking.map((item) => item.strategyId);
  return { currentRanking: current, previousRanking: input.previousRanking, moved: current.map((id, index) => ({ strategyId: id, delta: input.previousRanking.includes(id) ? input.previousRanking.indexOf(id) - index : null })), resilient: selectResilientStrategy(input) };
}

// Risk capital and portfolio budgeting
export function calculateRiskBudget(input: RiskInput) {
  const evidence = verifiedIds(input);
  const evidencedRisk = input.changes.filter((change) => refsVerified(change.evidenceRefs, evidence)).reduce((sum, change) => sum + change.risk, 0);
  const unsupported = input.changes.filter((change) => !refsVerified(change.evidenceRefs, evidence)).map((change) => change.id);
  return { budget: input.budget, evidencedRisk: round(evidencedRisk), remaining: round(input.budget - evidencedRisk), unsupportedChangeIds: unsupported };
}

export function allocateChangeRiskCapital(input: RiskInput) {
  const evidence = verifiedIds(input);
  const sorted = [...input.changes].sort((a, b) => Number(b.mandatory) - Number(a.mandatory) || (b.value / Math.max(b.risk, 1)) - (a.value / Math.max(a.risk, 1)));
  const selected: typeof input.changes = []; let used = 0;
  for (const change of sorted) if (refsVerified(change.evidenceRefs, evidence) && (change.mandatory || used + change.risk <= input.budget)) { selected.push(change); used += change.risk; }
  return { selectedChangeIds: selected.map((item) => item.id), deferredChangeIds: input.changes.filter((item) => !selected.includes(item)).map((item) => item.id), used: round(used), overBudget: used > input.budget };
}

export function detectRiskConcentration(input: RiskInput) {
  const total = input.changes.reduce((sum, change) => sum + change.risk, 0);
  const domains = uniq(input.changes.flatMap((change) => change.domains)).map((domain) => ({ domain, risk: input.changes.filter((change) => change.domains.includes(domain)).reduce((sum, change) => sum + change.risk, 0) }));
  return { concentrations: domains.map((item) => ({ ...item, share: total ? round(item.risk / total) : 0 })).filter((item) => item.share >= 0.5) };
}

export function evaluateRiskPortfolio(input: RiskInput) {
  const allocation = allocateChangeRiskCapital(input); const concentration = detectRiskConcentration(input);
  return { status: allocation.overBudget || concentration.concentrations.length ? 'FAIL' : allocation.deferredChangeIds.length ? 'PASS_WITH_GAPS' : 'PASS', allocation, concentration, dependenciesMissing: input.changes.flatMap((change) => change.dependsOn.filter((id) => !allocation.selectedChangeIds.includes(id)).map((id) => ({ changeId: change.id, dependencyId: id }))) };
}

export function buildRiskRebalancingPlan(input: RiskInput) {
  const allocation = allocateChangeRiskCapital(input);
  return { actions: allocation.deferredChangeIds.map((id) => ({ changeId: id, action: 'DEFER_OR_REDUCE_RISK', reason: 'Outside evidenced risk budget' })), concentrations: detectRiskConcentration(input).concentrations.map((item) => ({ domain: item.domain, action: 'DIVERSIFY_OR_STAGE' })) };
}

export function compareRiskPortfolios(input: RiskInput) {
  const current = allocateChangeRiskCapital(input).selectedChangeIds;
  return { added: current.filter((id) => !input.previousAllocations.includes(id)), removed: input.previousAllocations.filter((id) => !current.includes(id)), current, evaluation: evaluateRiskPortfolio(input) };
}

// Capability market and delegation contracts
export function publishCapabilityOffers(input: MarketInput) {
  const evidence = verifiedIds(input);
  return { offers: input.offers.map((offer) => ({ ...offer, trusted: refsVerified(offer.evidenceRefs, evidence), effectiveReliability: refsVerified(offer.evidenceRefs, evidence) ? offer.reliability : 0 })) };
}

export function matchCapabilityDemand(input: MarketInput) {
  const offers = publishCapabilityOffers(input).offers;
  const evidenceKinds = new Map(input.evidence.map((item) => [item.id, item.verified ? item.kind : null]));
  return { matches: input.demands.map((demand) => {
    const candidates = offers.filter((offer) => {
      const suppliedKinds = new Set(offer.evidenceRefs.map((id) => evidenceKinds.get(id)).filter(Boolean));
      return offer.trusted && offer.capabilities.includes(demand.capability) && offer.effectiveReliability >= demand.minimumReliability && offer.cost <= demand.maximumCost && offer.capacity > 0 && demand.requiredEvidenceKinds.every((kind) => suppliedKinds.has(kind));
    }).sort((a, b) => b.effectiveReliability - a.effectiveReliability || a.cost - b.cost);
    return { demandId: demand.id, offerId: candidates[0]?.id ?? null, candidates: candidates.map((item) => item.id) };
  }) };
}

export function evaluateDelegationContracts(input: MarketInput) {
  const evidence = verifiedIds(input);
  const matches = new Map(matchCapabilityDemand(input).matches.map((item) => [item.demandId, item.offerId]));
  const evaluations = input.contracts.map((contract) => ({ ...contract, matched: matches.get(contract.demandId) === contract.offerId, approvalVerified: contract.accepted && refsVerified(contract.approvalEvidenceRefs, evidence) }));
  return { status: evaluations.every((item) => item.matched && item.approvalVerified) ? 'PASS' : 'FAIL', evaluations };
}

export function detectCapabilityBottlenecks(input: MarketInput) {
  const matches = matchCapabilityDemand(input).matches;
  const load = new Map<string, number>(); for (const match of matches) if (match.offerId) load.set(match.offerId, (load.get(match.offerId) ?? 0) + 1);
  return { unmatchedDemandIds: matches.filter((item) => !item.offerId).map((item) => item.demandId), overloadedOffers: input.offers.filter((offer) => (load.get(offer.id) ?? 0) > offer.capacity).map((offer) => ({ offerId: offer.id, load: load.get(offer.id), capacity: offer.capacity })) };
}

export function buildDelegationPlan(input: MarketInput) {
  const matches = matchCapabilityDemand(input).matches; const bottlenecks = detectCapabilityBottlenecks(input);
  return { assignments: matches.filter((item) => item.offerId && !bottlenecks.overloadedOffers.some((offer) => offer.offerId === item.offerId)), blockers: [...bottlenecks.unmatchedDemandIds, ...bottlenecks.overloadedOffers.map((item) => item.offerId)], evidenceBoundary: 'Assignments are recommendations until host-approved contracts are verified.' };
}

export function compareCapabilityMarkets(input: MarketInput) {
  const current = Object.fromEntries(matchCapabilityDemand(input).matches.map((item) => [item.demandId, item.offerId]));
  return { changes: Object.entries(current).filter(([id, offer]) => input.previousMatches[id] !== offer).map(([demandId, offerId]) => ({ demandId, before: input.previousMatches[demandId] ?? null, after: offerId })), bottlenecks: detectCapabilityBottlenecks(input) };
}

// Knowledge freshness and consolidation
export function evaluateKnowledgeFreshness(input: KnowledgeInput) {
  const now = Date.parse(input.now);
  return { items: input.items.map((item) => ({ id: item.id, fresh: item.verified && (!item.expiresAt || Date.parse(item.expiresAt) >= now) && refsVerified(item.evidenceRefs, verifiedIds(input, input.now)), ageMs: now - Date.parse(item.observedAt) })) };
}

export function detectKnowledgeContradictions(input: KnowledgeInput) {
  const fresh = new Set(evaluateKnowledgeFreshness(input).items.filter((item) => item.fresh).map((item) => item.id));
  const contradictions = input.items.flatMap((item) => item.contradicts.filter((id) => fresh.has(item.id) && fresh.has(id)).map((id) => [item.id, id].sort().join(':')));
  return { status: contradictions.length ? 'FAIL' : 'PASS', contradictions: uniq(contradictions) };
}

export function consolidateProjectKnowledge(input: KnowledgeInput) {
  const freshness = new Map(evaluateKnowledgeFreshness(input).items.map((item) => [item.id, item.fresh]));
  const replaced = new Set(input.items.filter((item) => freshness.get(item.id)).flatMap((item) => item.replaces));
  const active = input.items.filter((item) => freshness.get(item.id) && !replaced.has(item.id)).sort((a, b) => b.confidence - a.confidence || Date.parse(b.observedAt) - Date.parse(a.observedAt));
  return { activeItems: active, retiredItemIds: input.items.filter((item) => !active.includes(item)).map((item) => item.id), contradictions: detectKnowledgeContradictions(input) };
}

export function buildKnowledgeRefreshPlan(input: KnowledgeInput) {
  const freshness = new Map(evaluateKnowledgeFreshness(input).items.map((item) => [item.id, item.fresh]));
  return { refresh: input.items.filter((item) => !freshness.get(item.id)).map((item) => ({ itemId: item.id, topic: item.topic, action: item.verified ? 'REVERIFY' : 'VERIFY' })), missingTopics: input.requiredTopics.filter((topic) => !input.items.some((item) => item.topic === topic && freshness.get(item.id))) };
}

export function scoreKnowledgeCoverage(input: KnowledgeInput) {
  const active = consolidateProjectKnowledge(input).activeItems;
  const covered = input.requiredTopics.filter((topic) => active.some((item) => item.topic === topic));
  return { score: input.requiredTopics.length ? round(100 * covered.length / input.requiredTopics.length) : 100, coveredTopics: covered, missingTopics: input.requiredTopics.filter((topic) => !covered.includes(topic)) };
}

export function compareKnowledgeSnapshots(input: KnowledgeInput) {
  const current = consolidateProjectKnowledge(input).activeItems.map((item) => item.id);
  return { added: current.filter((id) => !input.previousItemIds.includes(id)), removed: input.previousItemIds.filter((id) => !current.includes(id)), coverage: scoreKnowledgeCoverage(input), contradictions: detectKnowledgeContradictions(input) };
}

// Safety cases and assurance arguments
export function buildEngineeringSafetyCase(input: SafetyInput) {
  return { caseId: input.caseId, claims: input.claims, arguments: input.arguments, hazardControls: input.hazards.map((hazard) => ({ hazardId: hazard.id, controlIds: hazard.controlIds, risk: round(riskWeight[hazard.severity] * hazard.probability) })) };
}

export function evaluateSafetyArguments(input: SafetyInput) {
  const evidence = verifiedIds(input);
  const argumentsEvaluated = input.arguments.map((argument) => ({ id: argument.id, claimId: argument.claimId, supported: refsVerified(argument.evidenceRefs, evidence) && argument.premiseClaimIds.every((id) => input.claims.find((claim) => claim.id === id)?.status === 'SUPPORTED') }));
  return { status: argumentsEvaluated.every((item) => item.supported) ? 'PASS' : 'FAIL', arguments: argumentsEvaluated };
}

export function detectAssuranceGaps(input: SafetyInput) {
  const evidence = verifiedIds(input); const argumentMap = new Map(evaluateSafetyArguments(input).arguments.map((item) => [item.id, item.supported]));
  const claimGaps = input.claims.filter((claim) => claim.status !== 'SUPPORTED' || !refsVerified(claim.evidenceRefs, evidence) || !claim.argumentIds.every((id) => argumentMap.get(id))).map((claim) => claim.id);
  const hazardGaps = input.hazards.filter((hazard) => !hazard.controlIds.length || hazard.controlIds.some((id) => !input.controls.find((control) => control.id === id)?.verified)).map((hazard) => hazard.id);
  return { status: claimGaps.length || hazardGaps.length ? 'FAIL' : 'PASS', claimGaps, hazardGaps };
}

export function traceHazardControls(input: SafetyInput) {
  const evidence = verifiedIds(input);
  return { hazards: input.hazards.map((hazard) => ({ hazardId: hazard.id, severity: hazard.severity, controls: hazard.controlIds.map((id) => input.controls.find((control) => control.id === id)).filter(Boolean).map((control) => ({ id: control!.id, effective: control!.verified && control!.effectiveness > 0 && refsVerified(control!.evidenceRefs, evidence) })) })) };
}

export function buildReleaseAssuranceCase(input: SafetyInput) {
  const gaps = detectAssuranceGaps(input);
  const residualRisk = input.hazards.reduce((sum, hazard) => {
    const controls = input.controls.filter((control) => hazard.controlIds.includes(control.id) && control.verified);
    const mitigation = controls.reduce((best, control) => Math.max(best, control.effectiveness), 0);
    return sum + riskWeight[hazard.severity] * hazard.probability * (1 - mitigation);
  }, 0);
  return { releaseId: input.releaseId ?? null, decision: gaps.status === 'PASS' && residualRisk < 1 ? 'ALLOW' : 'BLOCK', residualRisk: round(residualRisk), gaps };
}

export function compareSafetyCases(input: SafetyInput) {
  const unsupported = detectAssuranceGaps(input).claimGaps;
  return { resolvedClaims: input.previousUnsupportedClaims.filter((id) => !unsupported.includes(id)), newUnsupportedClaims: unsupported.filter((id) => !input.previousUnsupportedClaims.includes(id)), release: buildReleaseAssuranceCase(input) };
}

// Release digital twin
export function buildReleaseDigitalTwin(input: TwinInput) {
  return { releaseId: input.releaseId, components: input.components, dependencyCycles: cycles(input.components.map((item) => item.id), input.components.flatMap((item) => item.dependsOn.map((dep) => [item.id, dep] as [string, string]))), unsupportedComponents: input.components.filter((item) => !refsVerified(item.evidenceRefs, verifiedIds(input))).map((item) => item.id) };
}

export function simulateReleaseTransition(input: TwinInput) {
  const evidence = verifiedIds(input);
  const components = input.components.map((component) => {
    const transition = input.transitions.find((item) => item.componentId === component.id);
    const ready = transition ? transition.requiredEvidence.every((id) => evidence.has(id)) : true;
    return { componentId: component.id, from: component.currentVersion, to: component.targetVersion, predictedHealth: round(component.health - (transition?.risk ?? 0) * (ready ? 0.25 : 1)), ready, reversible: transition?.reversible ?? true };
  });
  return { components, status: components.every((item) => item.ready && item.predictedHealth >= 70) ? 'PASS' : 'FAIL' };
}

export function injectReleaseFailures(input: TwinInput) {
  const health = new Map(input.components.map((component) => [component.id, component.health]));
  for (const injection of input.injections) {
    health.set(injection.componentId, (health.get(injection.componentId) ?? 0) + injection.healthDelta);
    if (injection.propagates) for (const component of input.components.filter((item) => item.dependsOn.includes(injection.componentId))) health.set(component.id, (health.get(component.id) ?? 0) + injection.healthDelta / 2);
  }
  return { components: [...health].map(([componentId, predictedHealth]) => ({ componentId, predictedHealth: round(Math.max(0, Math.min(100, predictedHealth))) })), failedComponents: [...health].filter(([, value]) => value < 70).map(([id]) => id) };
}

export function evaluateTwinFidelity(input: TwinInput) {
  const evidence = verifiedIds(input); const verified = input.observations.filter((item) => refsVerified(item.evidenceRefs, evidence));
  const mae = verified.length ? verified.reduce((sum, item) => sum + Math.abs(item.predictedHealth - item.actualHealth), 0) / verified.length : null;
  return { verifiedObservations: verified.length, meanAbsoluteError: mae === null ? null : round(mae), fidelity: mae === null ? 'UNKNOWN' : mae <= 5 ? 'HIGH' : mae <= 15 ? 'MEDIUM' : 'LOW' };
}

export function buildReleasePrediction(input: TwinInput) {
  const transition = simulateReleaseTransition(input); const failure = injectReleaseFailures(input);
  const risk = round((transition.components.reduce((sum, item) => sum + Math.max(0, 100 - item.predictedHealth), 0) + failure.failedComponents.length * 25) / Math.max(input.components.length, 1));
  return { decision: transition.status === 'PASS' && failure.failedComponents.length === 0 ? 'ALLOW' : 'BLOCK', risk, transition, failure, fidelity: evaluateTwinFidelity(input) };
}

export function compareReleaseTwins(input: TwinInput) {
  const current = buildReleasePrediction(input);
  return { previousRisk: input.previousRisk ?? null, currentRisk: current.risk, delta: input.previousRisk === undefined ? null : round(current.risk - input.previousRisk), prediction: current };
}

// Tool ecosystem graph and composition planner
export function buildToolEcosystemGraph(input: ToolInput) {
  const ids = input.tools.map((tool) => tool.id);
  return { nodes: input.tools, edges: input.tools.flatMap((tool) => tool.dependsOn.map((dependency) => ({ from: tool.id, to: dependency }))), missingDependencies: input.tools.flatMap((tool) => tool.dependsOn.filter((id) => !ids.includes(id)).map((id) => ({ toolId: tool.id, dependencyId: id }))) };
}

export function findToolCompositionPaths(input: ToolInput) {
  const evidence = verifiedIds(input);
  return { requirements: input.requirements.map((requirement) => ({ requirementId: requirement.id, capability: requirement.capability, candidates: input.tools.filter((tool) => tool.capabilities.includes(requirement.capability) && refsVerified(tool.evidenceRefs, evidence)).sort((a, b) => b.reliability - a.reliability || a.cost - b.cost).map((tool) => tool.id) })) };
}

export function detectToolDependencyCycles(input: ToolInput) {
  const found = cycles(input.tools.map((tool) => tool.id), input.tools.flatMap((tool) => tool.dependsOn.map((dep) => [tool.id, dep] as [string, string])));
  return { status: found.length ? 'FAIL' : 'PASS', cycles: found };
}

export function evaluateToolChainResilience(input: ToolInput) {
  const paths = findToolCompositionPaths(input).requirements;
  const graph = buildToolEcosystemGraph(input);
  const trusted = new Set(input.tools.filter((tool) => refsVerified(tool.evidenceRefs, verifiedIds(input))).map((tool) => tool.id));
  const untrustedDependencies = input.tools.flatMap((tool) => tool.dependsOn.filter((id) => !trusted.has(id)).map((id) => ({ toolId: tool.id, dependencyId: id })));
  return { status: paths.every((item) => item.candidates.length > 0) && detectToolDependencyCycles(input).status === 'PASS' && graph.missingDependencies.length === 0 && untrustedDependencies.length === 0 ? 'PASS' : 'FAIL', singleProviderRequirements: paths.filter((item) => item.candidates.length === 1).map((item) => item.requirementId), missingRequirements: paths.filter((item) => item.candidates.length === 0).map((item) => item.requirementId), missingDependencies: graph.missingDependencies, untrustedDependencies, cycles: detectToolDependencyCycles(input).cycles };
}

export function optimizeToolChain(input: ToolInput) {
  const paths = findToolCompositionPaths(input).requirements; const selected = new Set<string>();
  for (const requirement of paths) if (requirement.candidates[0]) selected.add(requirement.candidates[0]);
  let expanded = true; while (expanded) { expanded = false; for (const id of [...selected]) for (const dependency of input.tools.find((tool) => tool.id === id)?.dependsOn ?? []) if (!selected.has(dependency)) { selected.add(dependency); expanded = true; } }
  return { selectedToolIds: [...selected], totalCost: round([...selected].reduce((sum, id) => sum + (input.tools.find((tool) => tool.id === id)?.cost ?? 0), 0)), unresolvedRequirements: paths.filter((item) => !item.candidates.length).map((item) => item.requirementId) };
}

export function compareToolEcosystems(input: ToolInput) {
  const current = input.tools.map((tool) => tool.id);
  return { added: current.filter((id) => !input.previousToolIds.includes(id)), removed: input.previousToolIds.filter((id) => !current.includes(id)), resilience: evaluateToolChainResilience(input), optimized: optimizeToolChain(input) };
}

// Drift forecasting and early warning
function metricForecast(metric: DriftInput['metrics'][number], horizon: number, evidence: Set<string>) {
  const verified = metric.points.filter((point) => refsVerified(point.evidenceRefs, evidence)).sort((a, b) => a.index - b.index);
  if (verified.length < 2) return { metricId: metric.id, forecast: null, slope: null, confidence: 'INSUFFICIENT_EVIDENCE' as const };
  const first = verified[0], last = verified.at(-1)!; const slope = (last.value - first.value) / Math.max(last.index - first.index, 1);
  return { metricId: metric.id, forecast: round(last.value + slope * horizon), slope: round(slope), confidence: verified.length >= 3 ? 'MEDIUM' as const : 'LOW' as const };
}

export function forecastEngineeringDrift(input: DriftInput) {
  const evidence = verifiedIds(input); return { forecasts: input.metrics.map((metric) => metricForecast(metric, input.horizon, evidence)) };
}

export function detectLeadingRiskIndicators(input: DriftInput) {
  const forecasts = forecastEngineeringDrift(input).forecasts;
  return { indicators: forecasts.flatMap((forecast) => {
    const metric = input.metrics.find((item) => item.id === forecast.metricId)!; if (forecast.forecast === null || forecast.slope === null) return [];
    const movingTowardRisk = metric.direction === 'MAX' ? forecast.slope > 0 : forecast.slope < 0;
    return movingTowardRisk ? [{ metricId: metric.id, slope: forecast.slope, forecast: forecast.forecast }] : [];
  }) };
}

export function evaluateDriftThresholds(input: DriftInput) {
  const forecasts = forecastEngineeringDrift(input).forecasts;
  const breaches = forecasts.filter((forecast) => { const metric = input.metrics.find((item) => item.id === forecast.metricId)!; return forecast.forecast !== null && (metric.direction === 'MAX' ? forecast.forecast > metric.threshold : forecast.forecast < metric.threshold); });
  return { status: breaches.length ? 'FAIL' : forecasts.some((item) => item.forecast === null) ? 'PASS_WITH_GAPS' : 'PASS', breaches };
}

export function buildDriftResponsePlan(input: DriftInput) {
  const thresholds = evaluateDriftThresholds(input); return { actions: thresholds.breaches.map((item) => ({ metricId: item.metricId, action: 'INVESTIGATE_AND_REVERIFY', priority: Math.abs((item.forecast ?? 0) - (input.metrics.find((metric) => metric.id === item.metricId)?.threshold ?? 0)) })), indicators: detectLeadingRiskIndicators(input).indicators };
}

export function calibrateDriftForecast(input: DriftInput) {
  const forecasts = forecastEngineeringDrift(input).forecasts; const comparisons = forecasts.filter((item) => item.forecast !== null && input.actuals[item.metricId] !== undefined).map((item) => ({ metricId: item.metricId, error: round(Math.abs((item.forecast ?? 0) - input.actuals[item.metricId])) }));
  return { comparisons, meanAbsoluteError: comparisons.length ? round(comparisons.reduce((sum, item) => sum + item.error, 0) / comparisons.length) : null };
}

export function compareDriftForecasts(input: DriftInput) {
  const current = forecastEngineeringDrift(input).forecasts;
  return { changes: current.map((item) => ({ metricId: item.metricId, previous: input.previousForecasts[item.metricId] ?? null, current: item.forecast, delta: item.forecast === null || input.previousForecasts[item.metricId] === undefined ? null : round(item.forecast - input.previousForecasts[item.metricId]) })), thresholds: evaluateDriftThresholds(input), calibration: calibrateDriftForecast(input) };
}

// Human oversight and escalation
export function buildOversightPolicy(input: OversightInput) {
  return { modelId: input.modelId, policy: input.policy, levels: [...input.escalationLevels].sort((a, b) => a.level - b.level) };
}

export function classifyHumanReviewNeed(input: OversightInput) {
  return { actions: input.actions.map((action) => ({ actionId: action.id, reviewRequired: action.impact >= input.policy.mandatoryImpact || action.uncertainty >= input.policy.mandatoryUncertainty || (input.policy.requireIrreversibleReview && !action.reversible), reasons: [action.impact >= input.policy.mandatoryImpact && 'IMPACT', action.uncertainty >= input.policy.mandatoryUncertainty && 'UNCERTAINTY', input.policy.requireIrreversibleReview && !action.reversible && 'IRREVERSIBLE'].filter(Boolean) })) };
}

export function auditHumanApprovalChain(input: OversightInput) {
  const evidence = verifiedIds(input); const review = new Map(classifyHumanReviewNeed(input).actions.map((item) => [item.actionId, item.reviewRequired]));
  const actions = input.actions.map((action) => { const approvals = input.approvals.filter((approval) => approval.actionId === action.id && approval.approved && refsVerified(approval.evidenceRefs, evidence)); const missingRoles = action.requiredRoles.length ? action.requiredRoles.filter((role) => !approvals.some((approval) => approval.role === role)) : review.get(action.id) ? ['UNSPECIFIED_REVIEWER'] : []; return { actionId: action.id, reviewRequired: review.get(action.id), verifiedApprovals: approvals.map((item) => item.role), missingRoles }; });
  return { status: actions.every((item) => !item.reviewRequired || item.missingRoles.length === 0) ? 'PASS' : 'FAIL', actions };
}

export function detectOversightGaps(input: OversightInput) {
  const audit = auditHumanApprovalChain(input); return { gaps: audit.actions.filter((item) => item.reviewRequired && item.missingRoles.length).map((item) => ({ actionId: item.actionId, missingRoles: item.missingRoles })), missingEscalationCoverage: input.actions.filter((action) => !input.escalationLevels.some((level) => action.impact <= level.maximumImpact)).map((action) => action.id) };
}

export function buildEscalationLadder(input: OversightInput) {
  return { actions: input.actions.map((action) => ({ actionId: action.id, role: [...input.escalationLevels].sort((a, b) => a.maximumImpact - b.maximumImpact).find((level) => action.impact <= level.maximumImpact)?.role ?? null, blocked: detectOversightGaps(input).missingEscalationCoverage.includes(action.id) })) };
}

export function compareOversightModels(input: OversightInput) {
  const current = classifyHumanReviewNeed(input).actions.filter((item) => item.reviewRequired).map((item) => item.actionId);
  return { newlyReviewed: current.filter((id) => !input.previousReviewIds.includes(id)), reviewRemoved: input.previousReviewIds.filter((id) => !current.includes(id)), audit: auditHumanApprovalChain(input), ladder: buildEscalationLadder(input) };
}

// Outcome learning and calibration
export function linkActionsToOutcomes(input: OutcomeInput) {
  const evidence = verifiedIds(input);
  return { interventions: input.interventions.map((intervention) => ({ interventionId: intervention.id, outcomes: input.outcomes.filter((outcome) => outcome.interventionId === intervention.id).map((outcome) => ({ ...outcome, verified: refsVerified(outcome.evidenceRefs, evidence) })), supported: refsVerified(intervention.evidenceRefs, evidence) })) };
}

export function measureInterventionEffect(input: OutcomeInput) {
  const evidence = verifiedIds(input);
  return { effects: input.interventions.map((intervention) => { const interventionVerified = refsVerified(intervention.evidenceRefs, evidence); const outcomes = interventionVerified ? input.outcomes.filter((outcome) => outcome.interventionId === intervention.id && refsVerified(outcome.evidenceRefs, evidence)) : []; return { interventionId: intervention.id, interventionVerified, samples: outcomes.length, effect: outcomes.length ? round(outcomes.reduce((sum, outcome) => sum + outcome.value - outcome.baseline, 0) / outcomes.length) : null, sufficient: interventionVerified && outcomes.length >= input.minimumSamples }; }) };
}

export function calibrateOutcomePredictions(input: OutcomeInput) {
  const effects = new Map(measureInterventionEffect(input).effects.map((item) => [item.interventionId, item]));
  const calibration = input.interventions.map((intervention) => ({ interventionId: intervention.id, predicted: intervention.predictedImpact, actual: effects.get(intervention.id)?.effect ?? null, error: effects.get(intervention.id)?.effect === null || effects.get(intervention.id)?.effect === undefined ? null : round(Math.abs(intervention.predictedImpact - effects.get(intervention.id)!.effect!)) }));
  const errors = calibration.filter((item) => item.error !== null).map((item) => item.error!);
  return { calibration, meanAbsoluteError: errors.length ? round(errors.reduce((a, b) => a + b, 0) / errors.length) : null };
}

export function detectLearningBias(input: OutcomeInput) {
  const evidence = verifiedIds(input); const cohorts = uniq(input.outcomes.map((item) => item.cohort)).map((cohort) => ({ cohort, total: input.outcomes.filter((item) => item.cohort === cohort).length, verified: input.outcomes.filter((item) => item.cohort === cohort && refsVerified(item.evidenceRefs, evidence)).length }));
  const total = input.outcomes.length; return { cohorts, underrepresented: cohorts.filter((item) => total > 0 && item.total / total < 0.1).map((item) => item.cohort), unsupportedCohorts: cohorts.filter((item) => item.verified === 0).map((item) => item.cohort) };
}

export function buildLearningFeedbackLoop(input: OutcomeInput) {
  const effects = measureInterventionEffect(input).effects; const calibration = calibrateOutcomePredictions(input);
  return { actions: effects.map((effect) => ({ interventionId: effect.interventionId, action: !effect.sufficient ? 'COLLECT_MORE_EVIDENCE' : (calibration.calibration.find((item) => item.interventionId === effect.interventionId)?.error ?? 0) > 10 ? 'RECALIBRATE_PREDICTION' : 'RETAIN_MODEL' })), bias: detectLearningBias(input) };
}

export function compareLearningPrograms(input: OutcomeInput) {
  const current = Object.fromEntries(measureInterventionEffect(input).effects.filter((item) => item.effect !== null).map((item) => [item.interventionId, item.effect!]));
  return { changes: Object.entries(current).map(([id, effect]) => ({ interventionId: id, previous: input.previousEffects[id] ?? null, current: effect, delta: input.previousEffects[id] === undefined ? null : round(effect - input.previousEffects[id]) })), calibration: calibrateOutcomePredictions(input), feedback: buildLearningFeedbackLoop(input) };
}
