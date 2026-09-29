import type { z } from 'zod';
import { restorePointSchema, recoveryImpactSchema, recoveryPlanSchema, recoveryExecutionSchema, recoveryVerificationSchema } from './recovery-rollback-schema';

type RestorePoint = z.infer<typeof restorePointSchema>;
type RecoveryImpact = z.infer<typeof recoveryImpactSchema>;
type RecoveryPlan = z.infer<typeof recoveryPlanSchema>;
type RecoveryExecution = z.infer<typeof recoveryExecutionSchema>;
type RecoveryVerification = z.infer<typeof recoveryVerificationSchema>;

export function createRestorePoint(input: RestorePoint) {
  return {
    ...input,
    status: input.evidenceRefs.length ? 'EVIDENCED' : 'UNVERIFIED',
    warning: input.evidenceRefs.length ? undefined : 'Restore point exists as a host-supplied record but has no linked evidence yet.'
  };
}

export function assessRecoveryImpact(input: RecoveryImpact) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!input.targetRestorePoint.reversible) blockers.push('Target restore point is marked non-reversible.');
  if (input.irreversibleSteps.length) blockers.push('Recovery path contains irreversible steps.');
  if (input.dataLossRisk === 'HIGH' || input.dataLossRisk === 'UNKNOWN') warnings.push(`Data loss risk is ${input.dataLossRisk}.`);
  if (input.downtimeRisk === 'HIGH' || input.downtimeRisk === 'UNKNOWN') warnings.push(`Downtime risk is ${input.downtimeRisk}.`);
  if (input.productionImpact && !input.evidenceRefs.length) warnings.push('Production-impact assessment has no supporting evidence references.');
  const risk = blockers.length ? 'CRITICAL' : input.productionImpact || input.dataLossRisk === 'HIGH' || input.downtimeRisk === 'HIGH' ? 'HIGH' : input.dataLossRisk === 'MEDIUM' || input.downtimeRisk === 'MEDIUM' ? 'MEDIUM' : 'LOW';
  return { projectId: input.projectId, risk, blockers, warnings, targetRestorePoint: input.targetRestorePoint, affectedAreas: input.affectedAreas };
}

export function buildRecoveryPlan(input: RecoveryPlan) {
  const impact = assessRecoveryImpact(input.impact);
  const missingEvidenceSteps = input.steps.filter(s => s.requiredEvidence.length === 0).map(s => s.id);
  const riskyWithoutApproval = input.steps.filter(s => ['RESTORE','ROLLBACK'].includes(s.actionClass) && !s.requiresApproval).map(s => s.id);
  const findings: string[] = [];
  if (missingEvidenceSteps.length) findings.push(`Steps missing evidence requirements: ${missingEvidenceSteps.join(', ')}`);
  if (riskyWithoutApproval.length) findings.push(`Rollback/restore steps missing explicit approval requirement: ${riskyWithoutApproval.join(', ')}`);
  if (!input.postChecks.length) findings.push('No post-recovery verification checks defined.');
  if (!input.abortConditions.length) findings.push('No abort conditions defined.');
  return {
    plan: input,
    impact,
    readiness: impact.blockers.length || riskyWithoutApproval.length ? 'BLOCKED' : findings.length ? 'READY_WITH_GAPS' : 'READY',
    findings
  };
}

export function validateRecoveryExecution(input: RecoveryExecution) {
  const approvalMap = new Map(input.approvals.map(a => [a.actionId, a.status]));
  const resultMap = new Map(input.hostResults.map(r => [r.stepId, r]));
  const blocked: string[] = [];
  const pending: string[] = [];
  const completed: string[] = [];
  for (const step of input.plan.steps) {
    if (step.requiresApproval && approvalMap.get(step.id) !== 'APPROVED') {
      blocked.push(`${step.id}: approval missing or not approved`);
      continue;
    }
    const r = resultMap.get(step.id);
    if (!r || r.status === 'NOT_RUN') { pending.push(step.id); continue; }
    if (r.status === 'FAIL' || r.status === 'BLOCKED') blocked.push(`${step.id}: host result ${r.status}`);
    if (r.status === 'PASS') {
      if (step.requiredEvidence.length && !r.evidenceRefs.length) blocked.push(`${step.id}: PASS reported without evidence`);
      else completed.push(step.id);
    }
  }
  return { status: blocked.length ? 'BLOCKED' : pending.length ? 'IN_PROGRESS' : 'EXECUTED_PENDING_VERIFICATION', blocked, pending, completed };
}

export function verifyRecovery(input: RecoveryVerification) {
  const failed = input.checks.filter(c => c.status === 'FAIL');
  const unknown = input.checks.filter(c => c.status === 'UNKNOWN' || c.status === 'NOT_RUN');
  const unsupportedPass = input.checks.filter(c => c.status === 'PASS' && c.evidenceRefs.length === 0);
  const blockers: string[] = [];
  if (failed.length) blockers.push(`Failed checks: ${failed.map(c => c.id).join(', ')}`);
  if (unknown.length) blockers.push(`Incomplete checks: ${unknown.map(c => c.id).join(', ')}`);
  if (unsupportedPass.length) blockers.push(`PASS checks without evidence: ${unsupportedPass.map(c => c.id).join(', ')}`);
  if (input.serviceHealthy !== true) blockers.push('Service health not confirmed.');
  if (input.targetVersionConfirmed !== true) blockers.push('Target version/state not confirmed.');
  if (input.dataIntegrityConfirmed === false) blockers.push('Data integrity check failed.');
  if (input.unresolvedRisks.length) blockers.push(`Unresolved risks: ${input.unresolvedRisks.join('; ')}`);
  return {
    status: blockers.length ? 'RECOVERY_UNVERIFIED' : 'RECOVERY_VERIFIED',
    blockers,
    rule: 'Executing rollback commands is not proof of recovery; target state and service health require evidence-backed verification.'
  };
}

export function recommendRecoveryStrategy(input: RecoveryImpact) {
  const impact = assessRecoveryImpact(input);
  let strategy = 'ROLL_FORWARD';
  if (input.targetRestorePoint.sourceType === 'DEPLOYMENT' || input.targetRestorePoint.sourceType === 'GIT_COMMIT') strategy = 'ROLLBACK_CODE_OR_DEPLOYMENT';
  if (input.targetRestorePoint.sourceType === 'DATABASE_BACKUP') strategy = 'DATABASE_RESTORE_WITH_PRE_RESTORE_BACKUP';
  if (input.targetRestorePoint.sourceType === 'CONFIG_SNAPSHOT') strategy = 'CONFIG_RESTORE';
  if (impact.risk === 'CRITICAL') strategy = 'MANUAL_RECOVERY_REVIEW_REQUIRED';
  return { strategy, impact, requirements: ['Create/verify a current backup before mutation when applicable','Require explicit approval for consequential restore/rollback actions','Verify service health and target state after execution'] };
}

export function compareRestorePoints(before: RestorePoint, after: RestorePoint) {
  return {
    sameProject: before.projectId === after.projectId,
    sourceChanged: before.sourceRef !== after.sourceRef || before.sourceType !== after.sourceType,
    environmentChanged: before.environment !== after.environment,
    evidenceDelta: after.evidenceRefs.length - before.evidenceRefs.length,
    before,
    after
  };
}
