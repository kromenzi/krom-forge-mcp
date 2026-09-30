import type { V64TrustRuntimeInput } from './v64-schema';

const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
const uniq=<T>(xs:T[])=>[...new Set(xs)];
const matches=(value:string,rule:string)=>rule==='*'||value===rule;

function evidenceReady(i:V64TrustRuntimeInput, refs:string[]){
  const valid=new Set(i.evidence.filter(e=>e.verified&&e.fresh).map(e=>e.id));
  return refs.length>0&&refs.every(r=>valid.has(r));
}

export function scoreAdaptivePrincipalTrustV64(i:V64TrustRuntimeInput){
  return {principals:i.principals.map(p=>{
    const signals=i.signals.filter(s=>s.principalId===p.id);
    let score=p.baselineTrust;
    for(const s of signals){
      const ageHours=i.nowEpoch>s.observedAt?(i.nowEpoch-s.observedAt)/3600:0;
      const decay=Math.max(0.1,1-ageHours*i.trustDecayPerHour/100);
      const delta=(s.type==='SUCCESS'?1:s.type==='VERIFIED_RESULT'?1.5:s.type==='MANUAL_REVIEW'?0.5:s.type==='FAILURE'?-1:s.type==='POLICY_VIOLATION'?-2:-1.5)*s.weight*decay;
      score+=delta;
    }
    if(p.suspended) score=Math.min(score,20);
    return {principalId:p.id,kind:p.kind,score:Number(clamp(score).toFixed(2)),signalCount:signals.length,suspended:p.suspended};
  }).sort((a,b)=>b.score-a.score)};
}

export function detectTrustDriftV64(i:V64TrustRuntimeInput){
  const scores=new Map(scoreAdaptivePrincipalTrustV64(i).principals.map(p=>[p.principalId,p.score]));
  return {drift:i.principals.map(p=>({principalId:p.id,baseline:p.baselineTrust,current:scores.get(p.id)??p.baselineTrust,delta:Number(((scores.get(p.id)??p.baselineTrust)-p.baselineTrust).toFixed(2))})).filter(x=>Math.abs(x.delta)>=10)};
}

export function evaluateSessionRiskV64(i:V64TrustRuntimeInput){
  const scores=new Map(scoreAdaptivePrincipalTrustV64(i).principals.map(p=>[p.principalId,p.score]));
  return {sessions:i.sessions.map(s=>{
    const idle=i.nowEpoch>s.lastSeenAt?i.nowEpoch-s.lastSeenAt:0;
    const stale=idle>i.sessionMaxIdleSeconds;
    const trust=scores.get(s.principalId)??0;
    const risk=clamp(s.risk+(100-trust)*0.35+(stale?25:0));
    return {sessionId:s.id,principalId:s.principalId,trust,risk:Number(risk.toFixed(2)),stale,evidenceReady:evidenceReady(i,s.evidenceRefs)};
  })};
}

export function buildCapabilityGrantMatrixV64(i:V64TrustRuntimeInput){
  return {grants:i.principals.map(p=>({principalId:p.id,capabilities:uniq([
    ...p.capabilities,
    ...i.grants.filter(g=>g.principalId===p.id&&(g.expires===undefined||g.expires>i.nowEpoch)).map(g=>g.capability)
  ]),scopes:uniq([...p.allowedScopes,...i.grants.filter(g=>g.principalId===p.id&&(g.expires===undefined||g.expires>i.nowEpoch)).map(g=>g.scope)])}))};
}

export function evaluateRevocationStateV64(i:V64TrustRuntimeInput){
  return {revoked:i.revocations.filter(r=>r.active).map(r=>({principalId:r.principalId,capability:r.capability??'*',reason:r.reason}))};
}

export function detectPrivilegeEscalationV64(i:V64TrustRuntimeInput){
  const principals=new Map(i.principals.map(p=>[p.id,p]));
  const grant=buildCapabilityGrantMatrixV64(i).grants;
  const sessions=new Map(i.sessions.map(s=>[s.id,s]));
  return {violations:i.actions.filter(a=>{
    const s=sessions.get(a.sessionId); if(!s) return true;
    const p=principals.get(s.principalId); if(!p) return true;
    const g=grant.find(x=>x.principalId===p.id);
    const cap=g?.capabilities.includes(a.capability)??false;
    const scope=(g?.scopes??[]).some(x=>matches(a.scope,x));
    return !cap||!scope;
  }).map(a=>a.id)};
}

export function detectBehaviorAnomaliesV64(i:V64TrustRuntimeInput){
  return {principals:i.principals.map(p=>{
    const ss=i.signals.filter(s=>s.principalId===p.id);
    const bad=ss.filter(s=>s.type==='ANOMALY'||s.type==='POLICY_VIOLATION'||s.type==='FAILURE');
    const severe=bad.reduce((n,s)=>n+s.weight,0);
    return {principalId:p.id,anomalous:bad.length>=2||severe>=60,badSignals:bad.length,severity:severe};
  }).filter(x=>x.anomalous)};
}

export function buildTrustBudgetV64(i:V64TrustRuntimeInput){
  const scores=new Map(scoreAdaptivePrincipalTrustV64(i).principals.map(p=>[p.principalId,p.score]));
  return {budgets:i.principals.map(p=>({principalId:p.id,budget:Number((i.trustBudgetBase*(scores.get(p.id)??0)/100).toFixed(2))}))};
}

export function consumeTrustBudgetV64(i:V64TrustRuntimeInput){
  const budgets=new Map(buildTrustBudgetV64(i).budgets.map(b=>[b.principalId,b.budget]));
  const sessions=new Map(i.sessions.map(s=>[s.id,s]));
  const spent=new Map<string,number>();
  for(const a of i.actions){const s=sessions.get(a.sessionId);if(s)spent.set(s.principalId,(spent.get(s.principalId)??0)+a.risk);}
  return {principals:i.principals.map(p=>{const budget=budgets.get(p.id)??0;const used=spent.get(p.id)??0;return{principalId:p.id,budget,used:Number(used.toFixed(2)),remaining:Number(Math.max(0,budget-used).toFixed(2)),exhausted:used>budget}})};
}

export function detectTrustPolicyConflictsV64(i:V64TrustRuntimeInput){
  const conflicts:string[]=[];
  for(let a=0;a<i.policies.length;a++)for(let b=a+1;b<i.policies.length;b++){
    const x=i.policies[a],y=i.policies[b];
    const overlaps=(x.capability==='*'||y.capability==='*'||x.capability===y.capability)&&(x.scope==='*'||y.scope==='*'||x.scope===y.scope);
    if(overlaps&&x.priority===y.priority&&x.effect!==y.effect)conflicts.push(`${x.id}:${y.id}`);
  }
  return {conflicts};
}

export function auditTrustEvidenceCoverageV64(i:V64TrustRuntimeInput){
  const eids=new Set(i.evidence.map(e=>e.id));
  return {sessions:i.sessions.map(s=>({sessionId:s.id,missing:s.evidenceRefs.filter(r=>!eids.has(r)),covered:s.evidenceRefs.length>0&&s.evidenceRefs.every(r=>eids.has(r))})),actions:i.actions.map(a=>({actionId:a.id,missing:a.evidenceRefs.filter(r=>!eids.has(r)),covered:a.evidenceRefs.length>0&&a.evidenceRefs.every(r=>eids.has(r))}))};
}

export function evaluateContinuousAuthorizationV64(i:V64TrustRuntimeInput){
  const scores=new Map(scoreAdaptivePrincipalTrustV64(i).principals.map(p=>[p.principalId,p.score]));
  const sessions=new Map(i.sessions.map(s=>[s.id,s]));
  const rev=evaluateRevocationStateV64(i).revoked;
  const grants=buildCapabilityGrantMatrixV64(i).grants;
  const policy=[...i.policies].sort((a,b)=>b.priority-a.priority);
  return {actions:i.actions.map(a=>{
    const s=sessions.get(a.sessionId); const p=s?i.principals.find(x=>x.id===s.principalId):undefined;
    const trust=p?scores.get(p.id)??0:0;
    const r=policy.find(x=>matches(a.capability,x.capability)&&matches(a.scope,x.scope));
    const revoked=p?rev.some(x=>x.principalId===p.id&&(x.capability==='*'||x.capability===a.capability)):true;
    const g=p?grants.find(x=>x.principalId===p.id):undefined;
    const granted=!!g&&g.capabilities.includes(a.capability)&&g.scopes.some(x=>matches(a.scope,x));
    const ev=evidenceReady(i,a.evidenceRefs);
    const stale=!!s&&(i.nowEpoch>s.lastSeenAt?i.nowEpoch-s.lastSeenAt:0)>i.sessionMaxIdleSeconds;
    const allowed=!!p&&!p.suspended&&!revoked&&!stale&&granted&&(r?.effect!=='DENY')&&trust>=(r?.minTrust??60)&&a.risk<=(r?.maxRisk??50)&&(!(r?.requireFreshEvidence??true)||ev);
    const disposition=allowed?(r?.effect==='REVIEW'?'REVIEW':'ALLOW'):'DENY';
    return {actionId:a.id,principalId:p?.id??null,trust,risk:a.risk,granted,evidenceReady:ev,revoked,stale,disposition,executed:false};
  })};
}

export function routeHighRiskActionsV64(i:V64TrustRuntimeInput){
  const auth=evaluateContinuousAuthorizationV64(i).actions;
  return {review:auth.filter(a=>a.risk>=60||a.disposition==='REVIEW').map(a=>a.actionId),blocked:auth.filter(a=>a.disposition==='DENY').map(a=>a.actionId),autoEligible:auth.filter(a=>a.disposition==='ALLOW'&&a.risk<60).map(a=>a.actionId),executionClaim:false};
}

export function buildQuarantinePlanV64(i:V64TrustRuntimeInput){
  const anomalies=new Set(detectBehaviorAnomaliesV64(i).principals.map(x=>x.principalId));
  const exhausted=new Set(consumeTrustBudgetV64(i).principals.filter(x=>x.exhausted).map(x=>x.principalId));
  return {quarantine:i.principals.filter(p=>p.suspended||anomalies.has(p.id)||exhausted.has(p.id)).map(p=>({principalId:p.id,reasons:[p.suspended?'SUSPENDED':null,anomalies.has(p.id)?'ANOMALOUS_BEHAVIOR':null,exhausted.has(p.id)?'TRUST_BUDGET_EXHAUSTED':null].filter(Boolean)})),enforced:false};
}

export function evaluateRehabilitationV64(i:V64TrustRuntimeInput){
  const scores=new Map(scoreAdaptivePrincipalTrustV64(i).principals.map(p=>[p.principalId,p.score]));
  const anomalies=new Set(detectBehaviorAnomaliesV64(i).principals.map(x=>x.principalId));
  return {principals:i.principals.map(p=>({principalId:p.id,eligible:!p.suspended&&!anomalies.has(p.id)&&(scores.get(p.id)??0)>=75,trust:scores.get(p.id)??0}))};
}

export function buildRuntimeTrustLedgerV64(i:V64TrustRuntimeInput){
  return {entries:[...i.signals.map(s=>({type:'SIGNAL',id:s.id,principalId:s.principalId,at:s.observedAt})),...i.actions.map(a=>({type:'ACTION',id:a.id,sessionId:a.sessionId,at:i.nowEpoch})),...i.revocations.filter(r=>r.active).map((r,idx)=>({type:'REVOCATION',id:`rev-${idx}`,principalId:r.principalId,at:i.nowEpoch}))],persistenceClaim:false};
}

export function buildTrustDecisionPacketsV64(i:V64TrustRuntimeInput){
  const auth=evaluateContinuousAuthorizationV64(i).actions;
  const budget=new Map(consumeTrustBudgetV64(i).principals.map(x=>[x.principalId,x]));
  return {packets:auth.map(a=>({actionId:a.actionId,principalId:a.principalId,trust:a.trust,risk:a.risk,disposition:a.disposition,evidenceReady:a.evidenceReady,budget:a.principalId?budget.get(a.principalId)??null:null,executionClaim:false}))};
}

export function auditAdaptiveTrustConsistencyV64(i:V64TrustRuntimeInput){
  const pids=new Set(i.principals.map(p=>p.id)), sids=new Set(i.sessions.map(s=>s.id)), eids=new Set(i.evidence.map(e=>e.id));
  return {
    unknownSessionPrincipals:uniq(i.sessions.map(s=>s.principalId).filter(x=>!pids.has(x))),
    unknownSignalPrincipals:uniq(i.signals.map(s=>s.principalId).filter(x=>!pids.has(x))),
    unknownGrantPrincipals:uniq(i.grants.map(g=>g.principalId).filter(x=>!pids.has(x))),
    unknownRevocationPrincipals:uniq(i.revocations.map(r=>r.principalId).filter(x=>!pids.has(x))),
    unknownActionSessions:uniq(i.actions.map(a=>a.sessionId).filter(x=>!sids.has(x))),
    unknownEvidenceRefs:uniq([...i.sessions.flatMap(s=>s.evidenceRefs),...i.actions.flatMap(a=>a.evidenceRefs),...i.signals.flatMap(s=>s.evidenceRef?[s.evidenceRef]:[])].filter(x=>!eids.has(x)))
  };
}

export function evaluateTrustRuntimeHealthV64(i:V64TrustRuntimeInput){
  const trust=scoreAdaptivePrincipalTrustV64(i).principals;
  const auth=evaluateContinuousAuthorizationV64(i).actions;
  return {averageTrust:Number((trust.length?trust.reduce((n,x)=>n+x.score,0)/trust.length:0).toFixed(2)),deniedActions:auth.filter(a=>a.disposition==='DENY').length,reviewActions:auth.filter(a=>a.disposition==='REVIEW').length,anomalousPrincipals:detectBehaviorAnomaliesV64(i).principals.length,quarantined:buildQuarantinePlanV64(i).quarantine.length,policyConflicts:detectTrustPolicyConflictsV64(i).conflicts.length};
}

export function buildAdaptiveTrustRuntimeSnapshotV64(i:V64TrustRuntimeInput){
  const consistency=auditAdaptiveTrustConsistencyV64(i);
  const health=evaluateTrustRuntimeHealthV64(i);
  const blocked=Object.values(consistency).some(v=>v.length>0)||health.policyConflicts>0;
  return {trust:scoreAdaptivePrincipalTrustV64(i),sessions:evaluateSessionRiskV64(i),authorization:evaluateContinuousAuthorizationV64(i),budget:consumeTrustBudgetV64(i),quarantine:buildQuarantinePlanV64(i),health,consistency,status:blocked?'BLOCKED':'READY',executionClaim:false,persistenceClaim:false,certificationClaim:false};
}

export function buildAdaptiveTrustOperatorBriefV64(i:V64TrustRuntimeInput){
  const s=buildAdaptiveTrustRuntimeSnapshotV64(i);
  return {status:s.status,averageTrust:s.health.averageTrust,deniedActions:s.health.deniedActions,reviewActions:s.health.reviewActions,anomalousPrincipals:s.health.anomalousPrincipals,quarantined:s.health.quarantined,evidenceBoundary:'Authorization is advisory and evidence-bound; no execution, identity proof, persistence, signature or certification is inferred.'};
}
