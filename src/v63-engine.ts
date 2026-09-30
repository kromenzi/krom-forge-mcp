import type { V63GovernanceInput } from './v63-schema';
const uniq=<T>(xs:T[])=>[...new Set(xs)];

export function reasonGovernancePolicy(i:V63GovernanceInput){
  const ordered=[...i.policies].sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));
  return{actions:i.actions.map(a=>{const p=ordered.find(x=>(x.action==='*'||x.action===a.kind)&&a.risk<=x.maxRisk);return{actionId:a.id,policyId:p?.id??null,effect:p?.effect??'ALLOW',requiredRoles:p?.approverRoles??[]};})};
}
export function buildApprovalChainsV63(i:V63GovernanceInput){
  const reasoning=reasonGovernancePolicy(i).actions;
  return{chains:reasoning.map(r=>({actionId:r.actionId,requiredRoles:r.requiredRoles,approvals:i.approvals.filter(a=>a.actionId===r.actionId).map(a=>({actor:a.actor,role:a.role,status:a.status})),complete:r.requiredRoles.every(role=>i.approvals.some(a=>a.actionId===r.actionId&&a.role===role&&a.status==='APPROVED'))}))};
}
export function detectSegregationOfDutiesViolationsV63(i:V63GovernanceInput){
  return{violations:i.actions.filter(a=>i.approvals.some(ap=>ap.actionId===a.id&&ap.actor===a.requestedBy&&ap.status==='APPROVED')).map(a=>({actionId:a.id,actor:a.requestedBy,reason:'REQUESTER_SELF_APPROVAL'}))};
}
export function evaluateWaiversV63(i:V63GovernanceInput){
  return{waivers:i.waivers.map(w=>({id:w.id,scope:w.scope,valid:w.active&&(!w.expiresEpoch||w.expiresEpoch>i.nowEpoch)&&!!w.approvedBy,expired:!!w.expiresEpoch&&w.expiresEpoch<=i.nowEpoch}))};
}
export function auditEvidenceAttestationsV63(i:V63GovernanceInput){
  const byId=new Map(i.attestations.map(a=>[a.id,a]));
  return{evidence:i.evidence.map(e=>{const a=e.attestationId?byId.get(e.attestationId):undefined;const valid=!!a&&a.evidenceId===e.id&&a.signatureObserved&&(!a.expiresEpoch||a.expiresEpoch>i.nowEpoch);return{id:e.id,attested:valid,attestationId:a?.id??null,issuer:a?.issuer??null};}),signatureVerificationClaim:false};
}
export function authorizeToolsV63(i:V63GovernanceInput){
  const roleMap=new Map(i.roles.map(r=>[r.actor,r.roles]));
  return{actions:i.actions.filter(a=>a.tool).map(a=>{const t=i.tools.find(x=>x.name===a.tool);const roles=roleMap.get(a.requestedBy)??[];const roleAllowed=!!t&&(!t.allowedRoles.length||t.allowedRoles.some(r=>roles.includes(r)));return{actionId:a.id,tool:a.tool??null,authorized:!!t&&t.enabled&&a.risk<=t.maxRisk&&roleAllowed,reason:!t?'UNKNOWN_TOOL':!t.enabled?'TOOL_DISABLED':a.risk>t.maxRisk?'RISK_LIMIT':!roleAllowed?'ROLE_DENIED':'AUTHORIZED'};})};
}
export function evaluateChangeGovernanceV63(i:V63GovernanceInput){
  const policy=new Map(reasonGovernancePolicy(i).actions.map(x=>[x.actionId,x]));
  const chains=new Map(buildApprovalChainsV63(i).chains.map(x=>[x.actionId,x]));
  const sod=new Set(detectSegregationOfDutiesViolationsV63(i).violations.map(v=>v.actionId));
  return{actions:i.actions.map(a=>{const p=policy.get(a.id);const chain=chains.get(a.id);const allowed=p?.effect!=='DENY'&&(p?.effect!=='REQUIRE_APPROVAL'||chain?.complete)&&!sod.has(a.id);return{id:a.id,state:allowed?'GOVERNED_READY':'BLOCKED',policyEffect:p?.effect??'ALLOW',approvalsComplete:chain?.complete??true,sodViolation:sod.has(a.id)};})};
}
export function buildReleaseGovernanceGateV63(i:V63GovernanceInput){
  const evidence=new Map(i.evidence.map(e=>[e.id,e]));
  return{releases:i.releases.map(r=>{const evOk=r.evidenceRefs.length>0&&r.evidenceRefs.every(id=>{const e=evidence.get(id);return !!e&&e.verified&&e.fresh;});const approvalsOk=r.requiredApprovals.every(role=>i.approvals.some(a=>a.actionId===r.id&&a.role===role&&a.status==='APPROVED'));return{id:r.id,state:evOk&&approvalsOk?'READY':'HOLD',evidenceReady:evOk,approvalsReady:approvalsOk};})};
}
export function detectGovernanceDriftV63(i:V63GovernanceInput){
  return{drift:i.baselinePolicyHash!==i.currentPolicyHash,baselinePolicyHash:i.baselinePolicyHash,currentPolicyHash:i.currentPolicyHash};
}
export function compileGovernanceAuditTrailV63(i:V63GovernanceInput){
  return{events:[...i.auditEvents].sort((a,b)=>a.epoch-b.epoch||a.id.localeCompare(b.id)),eventCount:i.auditEvents.length,persistenceClaim:false};
}
export function buildComplianceDecisionPacketsV63(i:V63GovernanceInput){
  const changes=new Map(evaluateChangeGovernanceV63(i).actions.map(a=>[a.id,a]));
  return{packets:i.actions.map(a=>({actionId:a.id,governance:changes.get(a.id)?.state??'BLOCKED',evidenceRefs:a.evidenceRefs,waiverIds:i.waivers.filter(w=>w.scope===a.id||w.scope===a.kind).map(w=>w.id),complianceClaim:false}))};
}
export function evaluateCrossProjectRiskGovernanceV63(i:V63GovernanceInput){
  const byProject=new Map<string,number[]>();for(const a of i.actions){if(!a.projectId)continue;const arr=byProject.get(a.projectId)??[];arr.push(a.risk);byProject.set(a.projectId,arr)}
  return{projects:[...byProject].map(([projectId,risks])=>({projectId,maxRisk:Math.max(...risks),averageRisk:Number((risks.reduce((s,r)=>s+r,0)/risks.length).toFixed(2)),governanceLevel:Math.max(...risks)>=70?'STRICT':Math.max(...risks)>=40?'ELEVATED':'STANDARD'}))};
}
export function buildExceptionRegisterV63(i:V63GovernanceInput){
  const waiverState=new Map(evaluateWaiversV63(i).waivers.map(w=>[w.id,w]));
  return{exceptions:i.waivers.map(w=>({id:w.id,scope:w.scope,status:waiverState.get(w.id)?.valid?'ACTIVE':'INACTIVE',reason:w.reason,approvedBy:w.approvedBy||null})),persistenceClaim:false};
}
export function evaluateEmergencyOverrideV63(i:V63GovernanceInput){
  return{actions:i.actions.filter(a=>a.kind==='EMERGENCY_OVERRIDE').map(a=>({actionId:a.id,requiresHumanApproval:true,approved:i.approvals.some(ap=>ap.actionId===a.id&&ap.status==='APPROVED'),automaticExecution:false}))};
}
export function buildGovernanceApprovalMatrixV63(i:V63GovernanceInput){
  return{matrix:i.actions.map(a=>{const p=reasonGovernancePolicy(i).actions.find(x=>x.actionId===a.id);return{actionId:a.id,requiredRoles:p?.requiredRoles??[],approvedRoles:uniq(i.approvals.filter(ap=>ap.actionId===a.id&&ap.status==='APPROVED').map(ap=>ap.role))};})};
}
export function detectApprovalExpiryRiskV63(i:V63GovernanceInput){
  const expiredWaivers=evaluateWaiversV63(i).waivers.filter(w=>w.expired).map(w=>w.id);
  return{expiredWaivers,staleApprovals:i.approvals.filter(a=>a.status==='APPROVED'&&i.nowEpoch-a.epoch>86400*30).map(a=>a.id)};
}
export function buildGovernanceEvidenceMatrixV63(i:V63GovernanceInput){
  const evidence=new Map(i.evidence.map(e=>[e.id,e]));
  return{actions:i.actions.map(a=>({actionId:a.id,evidence:a.evidenceRefs.map(id=>({id,verified:evidence.get(id)?.verified??false,fresh:evidence.get(id)?.fresh??false,confidence:evidence.get(id)?.confidence??0})),missing:a.evidenceRefs.filter(id=>!evidence.has(id))}))};
}
export function auditGovernanceConsistencyV63(i:V63GovernanceInput){
  const evidenceIds=new Set(i.evidence.map(e=>e.id));const attestationIds=new Set(i.attestations.map(a=>a.id));const actionIds=new Set(i.actions.map(a=>a.id));
  return{unknownEvidenceRefs:uniq(i.actions.flatMap(a=>a.evidenceRefs).filter(id=>!evidenceIds.has(id))),unknownAttestations:i.evidence.map(e=>e.attestationId).filter((id):id is string=>!!id&&!attestationIds.has(id)),unknownApprovalActions:uniq(i.approvals.map(a=>a.actionId).filter(id=>!actionIds.has(id)&&!i.releases.some(r=>r.id===id))),duplicatePolicyIds:i.policies.map(p=>p.id).filter((x,n,a)=>a.indexOf(x)!==n)};
}
export function buildGovernanceExecutiveSnapshotV63(i:V63GovernanceInput){
  const consistency=auditGovernanceConsistencyV63(i);return{policy:reasonGovernancePolicy(i),approvals:buildApprovalChainsV63(i),changeGovernance:evaluateChangeGovernanceV63(i),releaseGate:buildReleaseGovernanceGateV63(i),drift:detectGovernanceDriftV63(i),risk: evaluateCrossProjectRiskGovernanceV63(i),exceptions:buildExceptionRegisterV63(i),consistency,status:Object.values(consistency).every(v=>v.length===0)?'READY':'BLOCKED',approvalClaim:false,complianceClaim:false,executionClaim:false,persistenceClaim:false};
}
export function buildGovernanceOperatorBriefV63(i:V63GovernanceInput){
  const s=buildGovernanceExecutiveSnapshotV63(i);return{status:s.status,blockedActions:s.changeGovernance.actions.filter(a=>a.state==='BLOCKED').map(a=>a.id),heldReleases:s.releaseGate.releases.filter(r=>r.state==='HOLD').map(r=>r.id),policyDrift:s.drift.drift,expiredWaivers:detectApprovalExpiryRiskV63(i).expiredWaivers,evidenceBoundary:'Governance conclusions are derived only from supplied policy, approval, evidence and attestation metadata.'};
}
