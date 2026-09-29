import type { z } from 'zod';
import { qualityGateInputSchema, planQualityInputSchema, deliveryQualityInputSchema } from './quality-gate-schema';

type QualityGateInput = z.infer<typeof qualityGateInputSchema>;
type PlanQualityInput = z.infer<typeof planQualityInputSchema>;
type DeliveryQualityInput = z.infer<typeof deliveryQualityInputSchema>;

const defaultWeights: Record<string, number> = {
  plan: 0.12,
  implementation: 0.18,
  build: 0.10,
  tests: 0.16,
  security: 0.12,
  uiux: 0.08,
  evidence: 0.14,
  release: 0.10
};

function dimensionScore(status: QualityGateInput['dimensions'][number]['status'], explicit?: number) {
  if (typeof explicit === 'number') return explicit;
  return status === 'PASS' ? 100 : status === 'PASS_WITH_GAPS' ? 70 : status === 'NOT_APPLICABLE' ? 100 : status === 'NOT_AVAILABLE' ? 40 : 0;
}

export function getDefaultQualityGate() {
  return {
    dimensions: Object.entries(defaultWeights).map(([id, weight]) => ({ id, weight })),
    hardStops: [
      'Any CRITICAL residual risk that is not mitigated',
      'Any open release blocker',
      'Any consequential release claim without evidence',
      'Build or required tests failing when applicable',
      'Release marked READY while unsupported claims remain'
    ],
    statuses: ['PASS','PASS_WITH_GAPS','FAIL']
  };
}

export function evaluateQualityGate(input: QualityGateInput) {
  const applicable = input.dimensions.filter(d => d.status !== 'NOT_APPLICABLE');
  let totalWeight = 0;
  let weighted = 0;
  for (const d of applicable) {
    const w = d.weight || defaultWeights[d.id] || 0.1;
    totalWeight += w;
    weighted += dimensionScore(d.status, d.score) * w;
  }
  const score = totalWeight ? Math.round((weighted / totalWeight) * 10) / 10 : 0;
  const criticalRisks = input.residualRisks.filter(r => r.severity === 'CRITICAL' && !r.mitigated);
  const highRisks = input.residualRisks.filter(r => r.severity === 'HIGH' && !r.mitigated);
  const failedDimensions = input.dimensions.filter(d => d.status === 'FAIL');
  const evidenceGaps = input.dimensions.filter(d => d.status !== 'NOT_APPLICABLE' && d.evidence.length === 0).map(d => d.id);
  const hardStop = criticalRisks.length > 0 || input.openBlockers.length > 0 || failedDimensions.length > 0 || input.unsupportedClaims.length > 0;
  const status = hardStop ? 'FAIL' : (score < 85 || highRisks.length > 0 || evidenceGaps.length > 0 || input.dimensions.some(d => d.status === 'PASS_WITH_GAPS' || d.status === 'NOT_AVAILABLE')) ? 'PASS_WITH_GAPS' : 'PASS';
  return {
    objective: input.objective,
    releaseTarget: input.releaseTarget,
    overall: status,
    score,
    releaseReady: status === 'PASS',
    failedDimensions: failedDimensions.map(d => d.id),
    evidenceGaps,
    unsupportedClaims: input.unsupportedClaims,
    openBlockers: input.openBlockers,
    residualCriticalRisks: criticalRisks,
    residualHighRisks: highRisks,
    dimensions: input.dimensions
  };
}

export function evaluatePlanQuality(input: PlanQualityInput) {
  const findings: string[] = [];
  const allIds = new Set(input.tasks.map(t => t.id));
  const danglingDeps = input.tasks.flatMap(t => t.dependencies.filter(d => !allIds.has(d)).map(d => `${t.id} -> ${d}`));
  if (danglingDeps.length) findings.push(`Dangling dependencies: ${danglingDeps.join(', ')}`);
  const noAcceptance = input.tasks.filter(t => t.acceptanceCriteria.length === 0).map(t => t.id);
  const noEvidence = input.tasks.filter(t => t.evidenceRequired.length === 0).map(t => t.id);
  if (noAcceptance.length) findings.push(`Tasks missing acceptance criteria: ${noAcceptance.join(', ')}`);
  if (noEvidence.length) findings.push(`Tasks missing evidence requirements: ${noEvidence.join(', ')}`);
  if (input.assumptions.length && input.risks.length === 0) findings.push('Assumptions exist but no risks were recorded.');
  const score = Math.max(0, 100 - danglingDeps.length * 15 - noAcceptance.length * 8 - noEvidence.length * 8 - (input.assumptions.length && !input.risks.length ? 10 : 0));
  return { objective: input.objective, score, status: score >= 90 ? 'PASS' : score >= 70 ? 'PASS_WITH_GAPS' : 'FAIL', findings };
}

export function evaluateDeliveryQuality(input: DeliveryQualityInput) {
  const gaps = [...input.knownGaps];
  if (!input.completedItems.length) gaps.push('No completed items supplied.');
  if (!input.evidenceRefs.length) gaps.push('No evidence references supplied.');
  if (input.releaseStatus === 'READY' && input.userFacingClaims.length && !input.evidenceRefs.length) gaps.push('READY delivery contains user-facing claims without evidence references.');
  const status = gaps.length === 0 ? 'PASS' : input.releaseStatus === 'READY' ? 'FAIL' : 'PASS_WITH_GAPS';
  return { status, summary: input.summary, gaps, releaseStatus: input.releaseStatus, evidenceRefs: input.evidenceRefs };
}

export function selfCritique(input: { objective: string; plan?: unknown; execution?: unknown; evidence?: string[]; blockers?: string[]; risks?: string[] }) {
  const critique: string[] = [];
  if (!input.plan) critique.push('Plan evidence is missing.');
  if (!input.execution) critique.push('Execution evidence is missing.');
  if (!input.evidence?.length) critique.push('No evidence references supplied.');
  if (input.blockers?.length) critique.push(`Open blockers: ${input.blockers.join('; ')}`);
  if (input.risks?.length) critique.push(`Residual risks: ${input.risks.join('; ')}`);
  return { objective: input.objective, status: critique.length ? 'NEEDS_REVIEW' : 'CLEAN', critique, rule: 'Self-evaluation cannot promote missing evidence into proof.' };
}

export function compareQualityGates(before: QualityGateInput, after: QualityGateInput) {
  const b = evaluateQualityGate(before);
  const a = evaluateQualityGate(after);
  return { before: b, after: a, scoreDelta: Math.round((a.score - b.score) * 10) / 10, improved: a.score > b.score && a.overall !== 'FAIL' };
}
