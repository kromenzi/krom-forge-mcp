import type { z } from 'zod';
import {
  policyAsCodeSchema, evidenceLineageSchema, verificationPortfolioSchema, confidenceCalibrationSchema,
  incidentCommandSchema, compatibilityLifecycleSchema, agentReliabilitySchema, continuousImprovementSchema
} from './v50-schema';

type PolicyInput = z.infer<typeof policyAsCodeSchema>;
type LineageInput = z.infer<typeof evidenceLineageSchema>;
type PortfolioInput = z.infer<typeof verificationPortfolioSchema>;
type ConfidenceInput = z.infer<typeof confidenceCalibrationSchema>;
type IncidentInput = z.infer<typeof incidentCommandSchema>;
type CompatibilityInput = z.infer<typeof compatibilityLifecycleSchema>;
type AgentInput = z.infer<typeof agentReliabilitySchema>;
type ImprovementInput = z.infer<typeof continuousImprovementSchema>;

const uniq = <T,>(items: T[]) => [...new Set(items)];
const indexById = <T extends { id: string }>(items: T[]) => new Map(items.map((item) => [item.id, item]));
const riskRank = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 } as const;
const statusCredit: Record<string, number> = { PASS: 1, PASS_WITH_GAPS: 0.6, NOT_APPLICABLE: 1, UNKNOWN: 0, NOT_RUN: 0, FAIL: 0 };
const verifiedEvidence = (items: Array<{ id: string; verified: boolean }>) => new Set(items.filter((item) => item.verified).map((item) => item.id));
const parseTime = (value?: string) => value ? Date.parse(value) : Number.NaN;

function conditionMatches(condition: PolicyInput['policies'][number]['condition'], facts: PolicyInput['facts']) {
  const actual = facts[condition.field];
  const expected = condition.value;
  switch (condition.operator) {
    case 'EXISTS': return actual !== undefined;
    case 'EQUALS': return actual === expected;
    case 'NOT_EQUALS': return actual !== expected;
    case 'IN': return Array.isArray(expected) && expected.includes(actual);
    case 'NOT_IN': return Array.isArray(expected) && !expected.includes(actual);
    case 'GT': return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
    case 'GTE': return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;
    case 'LT': return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
    case 'LTE': return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;
  }
}

export function compilePolicySet(input: PolicyInput) {
  return {
    policySetId: input.policySetId,
    policies: [...input.policies].sort((a, b) => b.priority - a.priority).map((policy) => ({ ...policy, active: conditionMatches(policy.condition, input.facts) })),
    factKeys: Object.keys(input.facts).sort()
  };
}

export function auditPolicyExceptions(input: PolicyInput) {
  const evidence = verifiedEvidence(input.evidence);
  const now = parseTime(input.now) || Date.now();
  const findings = input.exceptions.map((exception) => ({
    id: exception.id,
    policyId: exception.policyId,
    valid: exception.approved && (!exception.expiresAt || parseTime(exception.expiresAt) > now) && exception.evidenceRefs.some((ref) => evidence.has(ref)),
    policyExists: input.policies.some((policy) => policy.id === exception.policyId)
  }));
  return { status: findings.some((item) => !item.valid || !item.policyExists) ? 'FAIL' : 'PASS', findings };
}

export function evaluatePolicySet(input: PolicyInput) {
  const compiled = compilePolicySet(input).policies;
  const exceptions = auditPolicyExceptions(input).findings;
  const active = compiled.filter((policy) => policy.active);
  const isExcepted = (id: string) => exceptions.some((item) => item.policyId === id && item.valid && item.policyExists);
  const denies = active.filter((policy) => policy.effect === 'DENY' && !isExcepted(policy.id));
  const unmet = active.filter((policy) => policy.effect === 'REQUIRE' && policy.requirement && !Boolean(input.facts[policy.requirement]) && !isExcepted(policy.id));
  return {
    decision: denies.length || unmet.length ? 'DENY' : active.some((policy) => policy.effect === 'ALLOW') ? 'ALLOW' : 'CONDITIONAL',
    activePolicies: active.map((policy) => policy.id),
    blockingPolicies: [...denies, ...unmet].map((policy) => policy.id),
    appliedExceptions: exceptions.filter((item) => item.valid).map((item) => item.id)
  };
}

export function detectPolicyConflicts(input: PolicyInput) {
  const active = compilePolicySet(input).policies.filter((policy) => policy.active);
  const conflicts = active.flatMap((left, index) => active.slice(index + 1).flatMap((right) =>
    left.scope === right.scope && left.priority === right.priority && left.effect !== right.effect
      ? [{ left: left.id, right: right.id, scope: left.scope, priority: left.priority }]
      : []
  ));
  return { status: conflicts.length ? 'FAIL' : 'PASS', conflicts };
}

export function buildPolicyDecisionTrace(input: PolicyInput) {
  const compiled = compilePolicySet(input).policies;
  return {
    policySetId: input.policySetId,
    trace: compiled.map((policy, order) => ({ order: order + 1, policyId: policy.id, matched: policy.active, effect: policy.effect, condition: policy.condition })),
    result: evaluatePolicySet(input)
  };
}

export function comparePolicyEvaluations(input: PolicyInput) {
  const current = evaluatePolicySet(input);
  return {
    current,
    changes: Object.entries(input.previousDecisions).filter(([policyId, decision]) => current.activePolicies.includes(policyId) && decision !== current.decision).map(([policyId, before]) => ({ policyId, before, after: current.decision }))
  };
}

export function buildEvidenceLineage(input: LineageInput) {
  const nodes = indexById(input.nodes);
  return {
    graphId: input.graphId,
    nodes: input.nodes,
    edges: input.edges.map((edge) => ({ ...edge, valid: nodes.has(edge.from) && nodes.has(edge.to) })),
    roots: input.nodes.filter((node) => !input.edges.some((edge) => edge.to === node.id)).map((node) => node.id),
    leaves: input.nodes.filter((node) => !input.edges.some((edge) => edge.from === node.id)).map((node) => node.id)
  };
}

export function detectEvidenceCycles(input: LineageInput) {
  const adjacency = new Map<string, string[]>();
  for (const edge of input.edges.filter((edge) => edge.relation !== 'CONTRADICTS')) adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), edge.to]);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cycles: string[][] = [];
  const walk = (id: string, path: string[]) => {
    if (visiting.has(id)) { cycles.push([...path.slice(path.indexOf(id)), id]); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const next of adjacency.get(id) ?? []) walk(next, [...path, id]);
    visiting.delete(id);
    visited.add(id);
  };
  for (const node of input.nodes) walk(node.id, []);
  return { status: cycles.length ? 'FAIL' : 'PASS', cycles };
}

export function detectOrphanEvidence(input: LineageInput) {
  const connected = new Set(input.edges.flatMap((edge) => [edge.from, edge.to]));
  const orphanEvidence = input.nodes.filter((node) => node.kind !== 'CLAIM' && !connected.has(node.id)).map((node) => node.id);
  const unsupportedClaims = input.nodes.filter((node) => node.kind === 'CLAIM' && !input.edges.some((edge) => edge.to === node.id && edge.relation === 'SUPPORTS')).map((node) => node.id);
  return { status: unsupportedClaims.length ? 'FAIL' : orphanEvidence.length ? 'PASS_WITH_GAPS' : 'PASS', orphanEvidence, unsupportedClaims };
}

export function findEvidenceContradictions(input: LineageInput) {
  const nodes = indexById(input.nodes);
  const contradictions = input.edges.filter((edge) => edge.relation === 'CONTRADICTS').map((edge) => ({ ...edge, bothVerified: Boolean(nodes.get(edge.from)?.verified && nodes.get(edge.to)?.verified) }));
  return { status: contradictions.some((item) => item.bothVerified) ? 'FAIL' : contradictions.length ? 'PASS_WITH_GAPS' : 'PASS', contradictions };
}

export function evaluateLineageIntegrity(input: LineageInput) {
  const nodes = indexById(input.nodes);
  const now = parseTime(input.now) || Date.now();
  const danglingEdges = input.edges.filter((edge) => !nodes.has(edge.from) || !nodes.has(edge.to));
  const expired = input.nodes.filter((node) => node.expiresAt && parseTime(node.expiresAt) <= now).map((node) => node.id);
  const missingRequiredClaims = input.requiredClaimIds.filter((id) => !nodes.has(id));
  const cycles = detectEvidenceCycles(input).cycles;
  const contradictions = findEvidenceContradictions(input).contradictions.filter((item) => item.bothVerified);
  const blockers = danglingEdges.length + missingRequiredClaims.length + cycles.length + contradictions.length;
  return { status: blockers ? 'FAIL' : expired.length ? 'PASS_WITH_GAPS' : 'PASS', danglingEdges, expired, missingRequiredClaims, cycles, contradictions };
}

export function compareEvidenceLineage(input: LineageInput) {
  const changedHashes = input.nodes.filter((node) => node.contentHash && input.previousNodeHashes[node.id] && input.previousNodeHashes[node.id] !== node.contentHash).map((node) => node.id);
  const removed = Object.keys(input.previousNodeHashes).filter((id) => !input.nodes.some((node) => node.id === id));
  return { changedHashes, removed, current: evaluateLineageIntegrity(input) };
}

function gateScore(gate: PortfolioInput['gates'][number], input: PortfolioInput) {
  const changed = gate.categories.some((category) => input.changedCategories.includes(category)) ? 4 : 0;
  const critical = gate.categories.some((category) => input.criticalCategories.includes(category)) ? 8 : 0;
  return gate.required ? Number.POSITIVE_INFINITY : (gate.riskReduction + changed + critical) / Math.max(gate.costMinutes, 0.5);
}

export function optimizeVerificationPortfolio(input: PortfolioInput) {
  const available = input.gates.filter((gate) => gate.available);
  const selected = new Set(available.filter((gate) => gate.required).map((gate) => gate.id));
  let used = available.filter((gate) => selected.has(gate.id)).reduce((sum, gate) => sum + gate.costMinutes, 0);
  for (const gate of [...available.filter((gate) => !gate.required)].sort((a, b) => gateScore(b, input) - gateScore(a, input))) {
    if (used + gate.costMinutes <= input.budgetMinutes) { selected.add(gate.id); used += gate.costMinutes; }
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const gate of available.filter((item) => selected.has(item.id))) for (const dependency of gate.dependencies) {
      const dep = available.find((item) => item.id === dependency);
      if (dep && !selected.has(dep.id) && used + dep.costMinutes <= input.budgetMinutes) { selected.add(dep.id); used += dep.costMinutes; changed = true; }
    }
  }
  return { selectedGateIds: [...selected], usedMinutes: used, remainingMinutes: Math.max(0, input.budgetMinutes - used), overBudget: used > input.budgetMinutes };
}

export function evaluateVerificationBudget(input: PortfolioInput) {
  const portfolio = optimizeVerificationPortfolio(input);
  const requiredCost = input.gates.filter((gate) => gate.required && gate.available).reduce((sum, gate) => sum + gate.costMinutes, 0);
  const unavailableRequired = input.gates.filter((gate) => gate.required && !gate.available).map((gate) => gate.id);
  return { status: unavailableRequired.length || requiredCost > input.budgetMinutes ? 'FAIL' : 'PASS', budgetMinutes: input.budgetMinutes, requiredCost, unavailableRequired, portfolio };
}

export function detectDroppedVerificationRisk(input: PortfolioInput) {
  const selected = new Set(input.selectedGateIds.length ? input.selectedGateIds : optimizeVerificationPortfolio(input).selectedGateIds);
  const droppedCriticalCategories = input.criticalCategories.filter((category) => !input.gates.some((gate) => selected.has(gate.id) && gate.categories.includes(category)));
  const droppedChangedCategories = input.changedCategories.filter((category) => !input.gates.some((gate) => selected.has(gate.id) && gate.categories.includes(category)));
  return { status: droppedCriticalCategories.length ? 'FAIL' : droppedChangedCategories.length ? 'PASS_WITH_GAPS' : 'PASS', droppedCriticalCategories, droppedChangedCategories };
}

export function buildVerificationCriticalPath(input: PortfolioInput) {
  const selected = new Set(input.selectedGateIds.length ? input.selectedGateIds : optimizeVerificationPortfolio(input).selectedGateIds);
  const pending = input.gates.filter((gate) => selected.has(gate.id));
  const ordered: string[] = [];
  while (pending.length) {
    const ready = pending.filter((gate) => gate.dependencies.filter((id) => selected.has(id)).every((id) => ordered.includes(id)));
    if (!ready.length) return { status: 'FAIL', ordered, cycle: pending.map((gate) => gate.id) };
    ready.sort((a, b) => b.riskReduction - a.riskReduction);
    for (const gate of ready) { ordered.push(gate.id); pending.splice(pending.indexOf(gate), 1); }
  }
  return { status: 'PASS', ordered, totalMinutes: input.gates.filter((gate) => selected.has(gate.id)).reduce((sum, gate) => sum + gate.costMinutes, 0) };
}

export function evaluateVerificationPortfolioResults(input: PortfolioInput) {
  const selected = new Set(input.selectedGateIds.length ? input.selectedGateIds : optimizeVerificationPortfolio(input).selectedGateIds);
  const evidence = verifiedEvidence(input.evidence);
  const selectedGates = input.gates.filter((gate) => selected.has(gate.id));
  const failed = selectedGates.filter((gate) => gate.status === 'FAIL').map((gate) => gate.id);
  const incomplete = selectedGates.filter((gate) => !['PASS', 'NOT_APPLICABLE'].includes(gate.status)).map((gate) => gate.id);
  const unsupportedPasses = selectedGates.filter((gate) => gate.status === 'PASS' && !gate.evidenceRefs.some((ref) => evidence.has(ref))).map((gate) => gate.id);
  return { status: failed.length || unsupportedPasses.length ? 'FAIL' : incomplete.length ? 'PASS_WITH_GAPS' : 'PASS', failed, incomplete, unsupportedPasses, riskCoverage: detectDroppedVerificationRisk(input) };
}

export function compareVerificationPortfolios(input: PortfolioInput) {
  const current = input.selectedGateIds.length ? input.selectedGateIds : optimizeVerificationPortfolio(input).selectedGateIds;
  return { added: current.filter((id) => !input.previousSelectedGateIds.includes(id)), removed: input.previousSelectedGateIds.filter((id) => !current.includes(id)), budget: evaluateVerificationBudget(input), risk: detectDroppedVerificationRisk(input) };
}

export function calculateReleaseConfidence(input: ConfidenceInput) {
  const evidence = verifiedEvidence(input.evidence);
  const weighted = input.signals.map((signal) => {
    const supported = signal.evidenceRefs.some((ref) => evidence.has(ref));
    const credit = supported ? statusCredit[signal.status] ?? 0 : 0;
    return { id: signal.id, supported, contribution: signal.weight * signal.reliability * credit, possible: signal.weight };
  });
  const possible = weighted.reduce((sum, item) => sum + item.possible, 0);
  const score = possible ? Math.round(weighted.reduce((sum, item) => sum + item.contribution, 0) / possible * 10000) / 100 : 0;
  return { score, weighted };
}

export function detectConfidenceInflation(input: ConfidenceInput) {
  const evidence = verifiedEvidence(input.evidence);
  const unsupportedPasses = input.signals.filter((signal) => signal.status === 'PASS' && !signal.evidenceRefs.some((ref) => evidence.has(ref))).map((signal) => signal.id);
  const missingRequiredSignals = input.minimumRequiredSignals.filter((id) => !input.signals.some((signal) => signal.id === id));
  const overReliableUnknowns = input.signals.filter((signal) => ['UNKNOWN', 'NOT_RUN'].includes(signal.status) && signal.reliability > 0.5).map((signal) => signal.id);
  return { status: unsupportedPasses.length || missingRequiredSignals.length ? 'FAIL' : overReliableUnknowns.length ? 'PASS_WITH_GAPS' : 'PASS', unsupportedPasses, missingRequiredSignals, overReliableUnknowns };
}

export function calibrateConfidenceThresholds(input: ConfidenceInput) {
  const successful = input.historicalOutcomes.filter((item) => item.successful).map((item) => item.score).sort((a, b) => a - b);
  const failed = input.historicalOutcomes.filter((item) => !item.successful).map((item) => item.score).sort((a, b) => a - b);
  return {
    supplied: input.thresholds,
    recommended: {
      allow: successful.length ? Math.max(input.thresholds.allow, successful[Math.floor(successful.length * 0.25)]) : input.thresholds.allow,
      conditional: failed.length ? Math.max(input.thresholds.conditional, failed[failed.length - 1] + 1) : input.thresholds.conditional
    },
    sampleSize: input.historicalOutcomes.length,
    rule: 'Historical calibration is advisory and never lowers supplied thresholds.'
  };
}

export function buildConfidenceBreakdown(input: ConfidenceInput) {
  const confidence = calculateReleaseConfidence(input);
  const groups = new Map<string, { contribution: number; possible: number }>();
  for (const signal of input.signals) {
    const item = confidence.weighted.find((candidate) => candidate.id === signal.id)!;
    const current = groups.get(signal.kind) ?? { contribution: 0, possible: 0 };
    groups.set(signal.kind, { contribution: current.contribution + item.contribution, possible: current.possible + item.possible });
  }
  return { score: confidence.score, groups: [...groups].map(([kind, value]) => ({ kind, score: value.possible ? Math.round(value.contribution / value.possible * 10000) / 100 : 0 })) };
}

export function decideConfidenceGate(input: ConfidenceInput) {
  const score = calculateReleaseConfidence(input).score;
  const inflation = detectConfidenceInflation(input);
  const hardFailure = input.signals.some((signal) => signal.status === 'FAIL' && input.minimumRequiredSignals.includes(signal.id));
  const decision = hardFailure || inflation.status === 'FAIL' ? 'BLOCK' : score >= input.thresholds.allow ? 'ALLOW' : score >= input.thresholds.conditional ? 'CONDITIONAL' : 'BLOCK';
  return { decision, score, thresholds: input.thresholds, hardFailure, inflation };
}

export function compareConfidenceModels(input: ConfidenceInput) {
  const current = calculateReleaseConfidence(input).score;
  return { current, previous: input.previousScore ?? null, delta: input.previousScore === undefined ? null : Math.round((current - input.previousScore) * 100) / 100, decision: decideConfidenceGate(input) };
}

export function classifyIncidentSeverity(input: IncidentInput) {
  const verified = input.signals.filter((signal) => signal.verified);
  const max = verified.reduce((current, signal) => Math.max(current, riskRank[signal.severity]), 0);
  const severity = max >= 4 ? 'CRITICAL' : max === 3 ? 'HIGH' : max === 2 ? 'MEDIUM' : max === 1 ? 'LOW' : 'UNKNOWN';
  return { severity, verifiedSignals: verified.map((signal) => signal.id), unverifiedSignals: input.signals.filter((signal) => !signal.verified).map((signal) => signal.id) };
}

export function buildIncidentCommandPlan(input: IncidentInput) {
  return {
    incidentId: input.incidentId,
    severity: classifyIncidentSeverity(input),
    phases: [
      { phase: 'STABILIZE', actions: ['confirm impact', 'stop unsafe changes', 'establish command'] },
      { phase: 'DIAGNOSE', actions: ['build verified timeline', 'test hypotheses', 'identify containment'] },
      { phase: 'RECOVER', actions: ['execute approved recovery', 'verify service and data', 'monitor regression'] },
      { phase: 'LEARN', actions: ['document root cause', 'assign corrective controls', 'verify prevention'] }
    ]
  };
}

export function buildIncidentTimeline(input: IncidentInput) {
  const evidence = verifiedEvidence(input.evidence);
  const events = [...input.events].sort((a, b) => parseTime(a.at) - parseTime(b.at)).map((event) => ({ ...event, evidenced: event.evidenceRefs.some((ref) => evidence.has(ref)) }));
  return { incidentId: input.incidentId, events, unsupportedEvents: events.filter((event) => !event.evidenced).map((event) => event.id) };
}

export function detectIncidentOwnershipGaps(input: IncidentInput) {
  const missingRoles = input.requiredRoles.filter((role) => !input.responders.some((responder) => responder.role === role && responder.owner));
  const unacknowledgedRoles = input.requiredRoles.filter((role) => input.responders.some((responder) => responder.role === role && responder.owner && !responder.acknowledged));
  return { status: missingRoles.length ? 'FAIL' : unacknowledgedRoles.length ? 'PASS_WITH_GAPS' : 'PASS', missingRoles, unacknowledgedRoles };
}

export function evaluateIncidentObjectives(input: IncidentInput) {
  const evidence = verifiedEvidence(input.evidence);
  const failed = input.objectives.filter((objective) => objective.status === 'FAIL' || (objective.targetMinutes !== undefined && (objective.completedAtMinutes === undefined || objective.completedAtMinutes > objective.targetMinutes))).map((objective) => objective.id);
  const unsupportedPasses = input.objectives.filter((objective) => objective.status === 'PASS' && !objective.evidenceRefs.some((ref) => evidence.has(ref))).map((objective) => objective.id);
  const incomplete = input.objectives.filter((objective) => !['PASS', 'NOT_APPLICABLE'].includes(objective.status)).map((objective) => objective.id);
  return { status: failed.length || unsupportedPasses.length ? 'FAIL' : incomplete.length ? 'PASS_WITH_GAPS' : 'PASS', failed, unsupportedPasses, incomplete };
}

export function evaluateIncidentClosure(input: IncidentInput) {
  const ownership = detectIncidentOwnershipGaps(input);
  const objectives = evaluateIncidentObjectives(input);
  const timeline = buildIncidentTimeline(input);
  return { status: ownership.status === 'FAIL' || objectives.status === 'FAIL' ? 'FAIL' : ownership.status !== 'PASS' || objectives.status !== 'PASS' || timeline.unsupportedEvents.length ? 'PASS_WITH_GAPS' : 'PASS', ownership, objectives, timelineGaps: timeline.unsupportedEvents };
}

export function compareIncidentStates(input: IncidentInput) {
  const current = classifyIncidentSeverity(input).severity;
  return { previousSeverity: input.previousSeverity ?? null, currentSeverity: current, escalated: input.previousSeverity ? riskRank[current as keyof typeof riskRank] > riskRank[input.previousSeverity] : false, closure: evaluateIncidentClosure(input) };
}

export function detectBreakingCompatibilityChanges(input: CompatibilityInput) {
  const current = indexById(input.current);
  const removed = input.previous.filter((item) => !current.has(item.id)).map((item) => item.id);
  const changed = input.previous.flatMap((before) => {
    const after = current.get(before.id);
    if (!after) return [];
    const addedRequiredInputs = after.requiredInputs.filter((field) => !before.requiredInputs.includes(field));
    const removedOutputFields = before.outputFields.filter((field) => !after.outputFields.includes(field));
    const hashChangedWithoutVersion = before.contractHash && after.contractHash && before.contractHash !== after.contractHash && before.version === after.version;
    return addedRequiredInputs.length || removedOutputFields.length || hashChangedWithoutVersion ? [{ interfaceId: before.id, addedRequiredInputs, removedOutputFields, hashChangedWithoutVersion }] : [];
  });
  return { status: removed.length || changed.length ? 'FAIL' : 'PASS', removed, changed };
}

export function assessCompatibilityConsumerImpact(input: CompatibilityInput) {
  const breaks = detectBreakingCompatibilityChanges(input);
  const impacted = new Map<string, string[]>();
  for (const id of [...breaks.removed, ...breaks.changed.map((item) => item.interfaceId)]) {
    const before = input.previous.find((item) => item.id === id);
    for (const consumer of before?.consumers ?? []) impacted.set(consumer, [...(impacted.get(consumer) ?? []), id]);
  }
  return { impactedConsumers: [...impacted].map(([consumer, interfaces]) => ({ consumer, interfaces })), total: impacted.size };
}

export function buildDeprecationPlan(input: CompatibilityInput) {
  const previous = indexById(input.previous);
  return { plans: input.deprecations.map((deprecation) => ({
    interfaceId: deprecation.interfaceId,
    consumers: previous.get(deprecation.interfaceId)?.consumers ?? [],
    remainingConsumers: (previous.get(deprecation.interfaceId)?.consumers ?? []).filter((consumer) => !deprecation.migratedConsumers.includes(consumer)),
    replacementId: deprecation.replacementId ?? null,
    announced: deprecation.announced,
    sunsetAt: deprecation.sunsetAt ?? null
  })) };
}

export function evaluateSunsetReadiness(input: CompatibilityInput) {
  const evidence = verifiedEvidence(input.evidence);
  const now = parseTime(input.now) || Date.now();
  const findings = buildDeprecationPlan(input).plans.map((plan) => {
    const record = input.deprecations.find((item) => item.interfaceId === plan.interfaceId)!;
    const ready = plan.announced && Boolean(plan.replacementId) && plan.remainingConsumers.length === 0 && Boolean(record.sunsetAt && parseTime(record.sunsetAt) <= now) && record.evidenceRefs.some((ref) => evidence.has(ref));
    return { interfaceId: plan.interfaceId, ready, remainingConsumers: plan.remainingConsumers };
  });
  return { status: findings.every((item) => item.ready) ? 'PASS' : 'FAIL', findings };
}

export function buildCompatibilityMigrationWaves(input: CompatibilityInput) {
  const consumers = uniq(buildDeprecationPlan(input).plans.flatMap((plan) => plan.remainingConsumers));
  const waves = [];
  for (let index = 0; index < consumers.length; index += input.maxWaveSize) waves.push({ wave: waves.length + 1, consumers: consumers.slice(index, index + input.maxWaveSize), verifyBeforeNext: true });
  return { waves, totalConsumers: consumers.length };
}

export function compareCompatibilityLifecycles(input: CompatibilityInput) {
  const currentIds = input.current.map((item) => item.id);
  const previousIds = input.previous.map((item) => item.id);
  return { added: currentIds.filter((id) => !previousIds.includes(id)), removed: previousIds.filter((id) => !currentIds.includes(id)), breaking: detectBreakingCompatibilityChanges(input), consumerImpact: assessCompatibilityConsumerImpact(input) };
}

export function detectUnsupportedAgentClaims(input: AgentInput) {
  const evidence = verifiedEvidence(input.evidence);
  const unsupported = input.agents.flatMap((agent) => agent.runs.flatMap((run) => run.claims.filter((claim) => !claim.evidenceRefs.some((ref) => evidence.has(ref))).map((claim) => ({ agentId: agent.id, runId: run.id, claimId: claim.id }))));
  return { status: unsupported.length ? 'FAIL' : 'PASS', unsupported };
}

export function evaluateAgentReliability(input: AgentInput) {
  const unsupported = detectUnsupportedAgentClaims(input).unsupported;
  const scores = input.agents.map((agent) => {
    const total = agent.runs.length;
    const passed = agent.runs.filter((run) => run.status === 'PASS').length;
    const scopeViolations = agent.runs.reduce((sum, run) => sum + run.changedPaths.filter((path) => run.allowedPaths.length && !run.allowedPaths.includes(path)).length, 0);
    const unsupportedCount = unsupported.filter((item) => item.agentId === agent.id).length;
    const score = total ? Math.max(0, Math.round((passed / total * 100) - scopeViolations * 15 - unsupportedCount * 10)) : 0;
    return { agentId: agent.id, score, runs: total, passed, scopeViolations, unsupportedClaims: unsupportedCount };
  });
  return { status: scores.some((item) => item.score < 50) ? 'FAIL' : scores.some((item) => item.score < 80) ? 'PASS_WITH_GAPS' : 'PASS', scores };
}

export function detectAgentHandoffDrift(input: AgentInput) {
  const gaps = input.agents.flatMap((agent) => agent.runs.flatMap((run) => {
    const missing = input.requiredHandoffFields.filter((field) => !run.handoffFields.includes(field));
    return missing.length ? [{ agentId: agent.id, runId: run.id, missing }] : [];
  }));
  return { status: gaps.length ? 'FAIL' : 'PASS', gaps };
}

export function buildAgentTrustPolicy(input: AgentInput) {
  const reliability = evaluateAgentReliability(input).scores;
  return { policies: reliability.map((item) => ({ agentId: item.agentId, mode: item.score >= 90 ? 'AUTO_READ_ONLY' : item.score >= 70 ? 'SUPERVISED' : 'APPROVAL_REQUIRED', consequentialWritesRequireApproval: true })) };
}

export function routeTaskByReliability(input: AgentInput) {
  const scores = indexById(evaluateAgentReliability(input).scores.map((item) => ({ ...item, id: item.agentId })));
  const candidates = input.agents.filter((agent) => !input.taskCategory || agent.specialization.includes(input.taskCategory)).map((agent) => ({ agentId: agent.id, score: scores.get(agent.id)?.score ?? 0 })).sort((a, b) => b.score - a.score);
  return { selectedAgentId: candidates[0]?.agentId ?? null, candidates, reason: candidates.length ? 'Highest evidenced reliability among matching specialists.' : 'No matching specialist supplied.' };
}

export function buildAgentQualityDriftReport(input: AgentInput) {
  const current = evaluateAgentReliability(input).scores;
  return { agents: current.map((item) => ({ ...item, previousScore: input.previousScores[item.agentId] ?? null, delta: input.previousScores[item.agentId] === undefined ? null : item.score - input.previousScores[item.agentId] })) };
}

export function compareAgentReliability(input: AgentInput) {
  return { current: evaluateAgentReliability(input), drift: buildAgentQualityDriftReport(input), routing: routeTaskByReliability(input), handoffs: detectAgentHandoffDrift(input) };
}

export function clusterImprovementObservations(input: ImprovementInput) {
  const groups = new Map<string, ImprovementInput['observations']>();
  for (const observation of input.observations) groups.set(observation.signature, [...(groups.get(observation.signature) ?? []), observation]);
  return { clusters: [...groups].map(([signature, observations]) => ({ signature, count: observations.length, categories: uniq(observations.map((item) => item.category)), maxSeverity: observations.map((item) => item.severity).sort((a, b) => riskRank[b] - riskRank[a])[0] })) };
}

export function detectSystemicImprovementPatterns(input: ImprovementInput) {
  const patterns = clusterImprovementObservations(input).clusters.filter((cluster) => cluster.count > 1 || input.observations.some((item) => item.signature === cluster.signature && item.recurring));
  return { status: patterns.some((pattern) => pattern.maxSeverity === 'CRITICAL' || pattern.maxSeverity === 'HIGH') ? 'FAIL' : patterns.length ? 'PASS_WITH_GAPS' : 'PASS', patterns };
}

export function measureControlEffectiveness(input: ImprovementInput) {
  return { controls: input.controls.map((control) => {
    const observations = input.observations.filter((item) => item.controlId === control.id);
    const detected = observations.filter((item) => item.detected).length;
    const prevented = observations.filter((item) => item.prevented).length;
    return { controlId: control.id, observations: observations.length, detectionRate: observations.length ? detected / observations.length : null, preventionRate: observations.length ? prevented / observations.length : null, operatingCostMinutes: control.operatingCostMinutes };
  }) };
}

export function prioritizeImprovementInvestments(input: ImprovementInput) {
  const clusters = clusterImprovementObservations(input).clusters.map((cluster) => {
    const observations = input.observations.filter((item) => item.signature === cluster.signature);
    const impact = observations.reduce((sum, item) => sum + riskRank[item.severity] * (item.recurring ? 2 : 1) + item.costMinutes / 60, 0);
    const estimatedCost = Math.max(15, observations.reduce((sum, item) => sum + item.costMinutes, 0) / Math.max(observations.length, 1));
    return { signature: cluster.signature, impact, estimatedCost, valuePerMinute: impact / estimatedCost };
  }).sort((a, b) => b.valuePerMinute - a.valuePerMinute);
  const selected: typeof clusters = [];
  let used = 0;
  for (const item of clusters) if (used + item.estimatedCost <= input.capacityMinutes) { selected.push(item); used += item.estimatedCost; }
  return { selected, deferred: clusters.filter((item) => !selected.includes(item)), usedCapacityMinutes: used };
}

export function buildContinuousImprovementBacklog(input: ImprovementInput) {
  const priorities = prioritizeImprovementInvestments(input);
  return { backlog: [...priorities.selected, ...priorities.deferred].map((item, index) => ({ order: index + 1, signature: item.signature, action: `Reduce or prevent recurring pattern: ${item.signature}`, selectedForCapacity: priorities.selected.includes(item), evidenceRefs: uniq(input.observations.filter((observation) => observation.signature === item.signature).flatMap((observation) => observation.evidenceRefs)) })) };
}

export function evaluateImprovementEconomics(input: ImprovementInput) {
  const avoidedMinutes = input.observations.filter((item) => item.prevented).reduce((sum, item) => sum + item.costMinutes, 0);
  const operatingMinutes = input.controls.reduce((sum, control) => sum + control.operatingCostMinutes, 0);
  const investmentMinutes = input.controls.reduce((sum, control) => sum + control.investmentCostMinutes, 0);
  return { avoidedMinutes, operatingMinutes, investmentMinutes, netMinutes: avoidedMinutes - operatingMinutes - investmentMinutes, evidenceBoundary: 'Estimated from supplied observations and control costs only.' };
}

export function compareImprovementPrograms(input: ImprovementInput) {
  const current = prioritizeImprovementInvestments(input).selected.map((item) => item.signature);
  return { addedPriorities: current.filter((item) => !input.previousPriorities.includes(item)), removedPriorities: input.previousPriorities.filter((item) => !current.includes(item)), systemic: detectSystemicImprovementPatterns(input), economics: evaluateImprovementEconomics(input) };
}
