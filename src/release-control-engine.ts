import type { z } from 'zod';
import { productionReadinessInputSchema, releaseDecisionSchema, releaseExceptionSchema, postReleaseVerificationSchema } from './release-control-schema';

type Readiness = z.infer<typeof productionReadinessInputSchema>;
type DimensionName = Readiness['dimensions'][number]['name'];

const defaultWeights: Record<DimensionName, number> = {
  BUILD: 12, TEST: 14, SECURITY: 14, EVIDENCE: 10, RUNTIME: 10,
  RECOVERY: 10, QUALITY: 10, APPROVAL: 6, DEPLOYMENT: 8, DATA: 6
};
const stateScore: Record<string, number> = { PASS: 100, WARN: 65, FAIL: 0, UNKNOWN: 35 };

export function evaluateProductionReadiness(input: Readiness) {
  const x = productionReadinessInputSchema.parse(input);
  const dimensions = x.dimensions.map(d => ({
    ...d,
    effectiveScore: d.score ?? stateScore[d.state],
    evidenceBacked: d.evidenceRefs.length > 0
  }));
  const totalWeight = dimensions.reduce((n,d)=>n+(defaultWeights[d.name] ?? 1),0) || 1;
  const weighted = dimensions.reduce((n,d)=>n+(defaultWeights[d.name] ?? 1)*(d.score ?? stateScore[d.state]),0) / totalWeight;
  const failedCritical = dimensions.filter(d=>d.critical && d.state==='FAIL');
  const failed = dimensions.filter(d=>d.state==='FAIL');
  const unknownCritical = dimensions.filter(d=>d.critical && d.state==='UNKNOWN');
  const missingEvidence = dimensions.filter(d=>d.state==='PASS' && !d.evidenceBacked).map(d=>d.name);
  const hardStops = [
    ...failedCritical.map(d=>`Critical dimension failed: ${d.name}`),
    ...unknownCritical.map(d=>`Critical dimension unknown: ${d.name}`),
    ...x.openCriticalRisks.map(r=>`Open critical risk: ${r}`),
    ...x.openBlockers.map(b=>`Open blocker: ${b}`),
    ...x.unsupportedClaims.map(c=>`Unsupported claim: ${c}`),
    ...(x.approvalRequired && !x.approvalGranted ? ['Required release approval is missing.'] : []),
    ...(!x.rollbackPlanAvailable ? ['Rollback/recovery plan is not available.'] : []),
    ...(!x.runtimeVerificationPlanned ? ['Post-release runtime verification is not planned.'] : []),
    ...missingEvidence.map(n=>`PASS lacks evidence: ${n}`)
  ];
  const warnings = [
    ...failed.filter(d=>!d.critical).map(d=>`Non-critical dimension failed: ${d.name}`),
    ...dimensions.filter(d=>d.state==='WARN').map(d=>`Dimension warning: ${d.name}`),
    ...(!x.rollbackPlanVerified && x.rollbackPlanAvailable ? ['Rollback plan exists but is not yet verified.'] : [])
  ];
  return {
    projectId:x.projectId, releaseId:x.releaseId, environment:x.environment,
    score:Number(weighted.toFixed(1)), dimensions, hardStops, warnings,
    prelimStatus: hardStops.length ? 'BLOCKED' : warnings.length ? 'CONDITIONAL' : 'READY',
    limitation:'Decision uses host-supplied evidence and gate states only; KROM does not independently execute build, deploy, security, runtime, or rollback operations.'
  };
}

export function decideRelease(input: unknown) {
  const { readiness, minimumScore, allowConditional } = releaseDecisionSchema.parse(input);
  const r = evaluateProductionReadiness(readiness);
  let decision:'READY'|'CONDITIONAL'|'BLOCKED'='READY';
  if (r.hardStops.length || r.score < minimumScore) decision='BLOCKED';
  else if (r.warnings.length) decision = allowConditional ? 'CONDITIONAL' : 'BLOCKED';
  return {
    ...r, minimumScore, decision,
    releaseAllowed: decision==='READY',
    conditionalReleaseRequiresExplicitException: decision==='CONDITIONAL',
    rule:'CONDITIONAL is not equivalent to release approval. Host/user policy must explicitly authorize any exception.'
  };
}

export function buildReleaseChecklist(input: Readiness) {
  const x=productionReadinessInputSchema.parse(input); const names=new Set(x.dimensions.map(d=>d.name));
  const required: readonly DimensionName[] = ['BUILD','TEST','SECURITY','EVIDENCE','RUNTIME','RECOVERY','QUALITY','APPROVAL','DEPLOYMENT','DATA'];
  return {
    projectId:x.projectId, releaseId:x.releaseId,
    checklist:required.map(name=>{
      const d=x.dimensions.find(v=>v.name===name);
      return {name,present:names.has(name),state:d?.state ?? 'UNKNOWN',evidenceRefs:d?.evidenceRefs ?? [],blockers:d?.blockers ?? []};
    }),
    operational:{approvalGranted:x.approvalGranted,rollbackPlanAvailable:x.rollbackPlanAvailable,rollbackPlanVerified:x.rollbackPlanVerified,runtimeVerificationPlanned:x.runtimeVerificationPlanned,changeWindow:x.changeWindow ?? null,owner:x.owner ?? null}
  };
}

export function evaluateReleaseException(input: unknown) {
  const x=releaseExceptionSchema.parse(input);
  const usable = x.approved && x.compensatingControls.length>0 && x.evidenceRefs.length>0;
  return {
    ...x,
    status: usable ? 'VALID_EXCEPTION_RECORD' : 'INVALID_OR_INCOMPLETE_EXCEPTION',
    gaps:[
      ...(!x.approved?['Exception is not approved.']:[]),
      ...(x.compensatingControls.length===0?['No compensating controls supplied.']:[]),
      ...(x.evidenceRefs.length===0?['No evidence references supplied.']:[])
    ],
    rule:'An exception documents an accepted risk; it does not convert failed evidence into PASS.'
  };
}

export function verifyPostRelease(input: unknown) {
  const x=postReleaseVerificationSchema.parse(input);
  const gaps:string[]=[];
  if(!x.deploymentVerified) gaps.push('Deployment not verified.');
  if(x.runtimeHealth!=='HEALTHY') gaps.push(`Runtime health is ${x.runtimeHealth}.`);
  if(!x.regressionPassed) gaps.push('Post-release regression check did not pass.');
  if(x.criticalIncidents.length) gaps.push('Critical incidents detected after release.');
  if(!x.verifiedEvidenceRefs.length) gaps.push('No verified post-release evidence supplied.');
  return {
    ...x,
    status:gaps.length===0?'RELEASE_VERIFIED':x.rollbackTriggered?'ROLLBACK_IN_PROGRESS':'RELEASE_NOT_VERIFIED',
    gaps,
    nextAction:gaps.length===0?'CLOSE_RELEASE':(x.runtimeHealth==='UNHEALTHY'||x.criticalIncidents.length)?'EVALUATE_RECOVERY':'COLLECT_OR_FIX_EVIDENCE'
  };
}

export function createReleaseControlSummary(input: Readiness) {
  const r=evaluateProductionReadiness(input); const checklist=buildReleaseChecklist(input);
  return {release:r,checklist,controlPlane:{qualityGate:'required',evidenceGraph:'required',runtimeGate:'required',recoveryPlan:'required',approvalPolicy:'required',postReleaseVerification:'required'}};
}

export function compareProductionReadiness(before: Readiness, after: Readiness) {
  const b=evaluateProductionReadiness(before), a=evaluateProductionReadiness(after);
  return {projectId:after.projectId,releaseId:after.releaseId,before:{score:b.score,status:b.prelimStatus,hardStops:b.hardStops.length,warnings:b.warnings.length},after:{score:a.score,status:a.prelimStatus,hardStops:a.hardStops.length,warnings:a.warnings.length},delta:{score:Number((a.score-b.score).toFixed(1)),hardStops:a.hardStops.length-b.hardStops.length,warnings:a.warnings.length-b.warnings.length}};
}
