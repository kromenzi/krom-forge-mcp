import type { V65IdentityDelegationInput } from './v65-schema';

const uniq=<T>(x:T[])=>[...new Set(x)];
const match=(v:string,r:string)=>r==='*'||v===r;
const evidenceReady=(i:V65IdentityDelegationInput,refs:string[])=>{
  const ok=new Set(i.evidence.filter(e=>e.verified&&e.fresh).map(e=>e.id));
  return refs.length>0&&refs.every(r=>ok.has(r));
};
const principalMap=(i:V65IdentityDelegationInput)=>new Map(i.principals.map(p=>[p.id,p]));

export function buildPrincipalIdentityGraphV65(i:V65IdentityDelegationInput){
  const ids=new Set(i.principals.map(p=>p.id));
  return {nodes:i.principals.map(p=>({id:p.id,kind:p.kind,parentPrincipalId:p.parentPrincipalId??null,active:p.active})),
    danglingParents:uniq(i.principals.filter(p=>p.parentPrincipalId&&!ids.has(p.parentPrincipalId)).map(p=>p.parentPrincipalId!))};
}

export function scoreIdentityAssuranceV65(i:V65IdentityDelegationInput){
  return {principals:i.principals.map(p=>{
    const sig=i.identitySignals.filter(s=>s.principalId===p.id);
    let score=50;
    for(const s of sig){
      const m=s.type==='VERIFIED_IDENTITY'?1.2:s.type==='MANUAL_REVIEW'?0.2:s.type==='IDENTITY_MISMATCH'?-1.2:s.type==='IMPERSONATION_SIGNAL'?-2:-1;
      score+=m*s.severity;
    }
    const refs=sig.flatMap(s=>s.evidenceRef?[s.evidenceRef]:[]);
    if(refs.length&&evidenceReady(i,refs)) score+=10;
    return {principalId:p.id,score:Math.max(0,Math.min(100,Number(score.toFixed(2)))),signals:sig.length};
  })};
}

export function detectImpersonationSignalsV65(i:V65IdentityDelegationInput){
  return {suspected:i.identitySignals.filter(s=>s.type==='IMPERSONATION_SIGNAL'||s.type==='IDENTITY_MISMATCH')
    .map(s=>({signalId:s.id,principalId:s.principalId,type:s.type,severity:s.severity,evidenceBound:!!s.evidenceRef}))};
}

export function buildDelegationGraphV65(i:V65IdentityDelegationInput){
  return {edges:i.delegations.map(d=>({id:d.id,from:d.delegatorId,to:d.delegateeId,capabilities:d.capabilities,scopes:d.scopes,revoked:d.revoked})),
    cycles:detectDelegationCyclesV65(i).cycles};
}

export function detectDelegationCyclesV65(i:V65IdentityDelegationInput){
  const adj=new Map<string,string[]>();
  for(const d of i.delegations.filter(d=>!d.revoked)) adj.set(d.delegatorId,[...(adj.get(d.delegatorId)??[]),d.delegateeId]);
  const cycles:string[][]=[]; const visiting=new Set<string>(); const visited=new Set<string>();
  const dfs=(n:string,path:string[])=>{if(visiting.has(n)){const k=path.indexOf(n);cycles.push(path.slice(k).concat(n));return;} if(visited.has(n))return;
    visiting.add(n); for(const x of adj.get(n)??[]) dfs(x,[...path,x]); visiting.delete(n); visited.add(n);};
  for(const p of i.principals) dfs(p.id,[p.id]);
  return {cycles};
}

export function evaluateDelegationExpiryV65(i:V65IdentityDelegationInput){
  return {delegations:i.delegations.map(d=>({delegationId:d.id,expired:d.expiresAt!==undefined&&d.expiresAt<=i.nowEpoch,revoked:d.revoked,active:!d.revoked&&(d.expiresAt===undefined||d.expiresAt>i.nowEpoch)}))};
}

export function evaluateDelegationDepthV65(i:V65IdentityDelegationInput){
  const incoming=new Map<string,string[]>();
  for(const d of i.delegations.filter(d=>!d.revoked)) incoming.set(d.delegateeId,[...(incoming.get(d.delegateeId)??[]),d.delegatorId]);
  const depth=(id:string,seen=new Set<string>()):number=>{if(seen.has(id))return i.maxDelegationDepth+1; seen.add(id); const parents=incoming.get(id)??[]; return parents.length?1+Math.max(...parents.map(p=>depth(p,new Set(seen)))):0;};
  return {principals:i.principals.map(p=>({principalId:p.id,depth:depth(p.id),exceeds:depth(p.id)>i.maxDelegationDepth}))};
}

export function evaluateSubdelegationRightsV65(i:V65IdentityDelegationInput){
  const byDelegatee=new Map(i.delegations.map(d=>[d.delegateeId,d]));
  return {violations:i.delegations.filter(d=>{const parent=byDelegatee.get(d.delegatorId);return !!parent&&!parent.allowSubdelegation;}).map(d=>d.id)};
}

export function buildAuthorityEnvelopeV65(i:V65IdentityDelegationInput){
  const pm=principalMap(i);
  const expiry=new Map(evaluateDelegationExpiryV65(i).delegations.map(x=>[x.delegationId,x.active]));
  return {delegations:i.delegations.map(d=>{const owner=pm.get(d.delegatorId); const delegatee=pm.get(d.delegateeId);
    return {delegationId:d.id,delegatorId:d.delegatorId,delegateeId:d.delegateeId,authorityCeiling:Math.min(owner?.authorityLevel??0,delegatee?.authorityLevel??0),
      capabilities:d.capabilities,scopes:d.scopes,maxRisk:d.breakGlass?Math.min(d.maxRisk,i.breakGlassMaxRisk):d.maxRisk,active:expiry.get(d.id)??false,evidenceReady:evidenceReady(i,d.evidenceRefs)};})};
}

export function detectAuthorityEscalationV65(i:V65IdentityDelegationInput){
  const pm=principalMap(i);
  return {violations:i.delegations.filter(d=>{
    const a=pm.get(d.delegatorId),b=pm.get(d.delegateeId); if(!a||!b)return true;
    return b.authorityLevel>a.authorityLevel||d.capabilities.some(c=>!a.capabilities.includes(c))||d.scopes.some(s=>!a.scopes.some(x=>match(s,x)));
  }).map(d=>d.id)};
}

export function buildCapabilityDelegationMatrixV65(i:V65IdentityDelegationInput){
  const active=new Set(evaluateDelegationExpiryV65(i).delegations.filter(x=>x.active).map(x=>x.delegationId));
  return {principals:i.principals.map(p=>({principalId:p.id,directCapabilities:p.capabilities,
    delegatedCapabilities:uniq(i.delegations.filter(d=>d.delegateeId===p.id&&active.has(d.id)).flatMap(d=>d.capabilities)),
    delegatedScopes:uniq(i.delegations.filter(d=>d.delegateeId===p.id&&active.has(d.id)).flatMap(d=>d.scopes))}))};
}

export function propagateDelegationRevocationsV65(i:V65IdentityDelegationInput){
  const revoked=new Set(i.delegations.filter(d=>d.revoked).map(d=>d.id));
  for(const r of i.revocations.filter(r=>r.active)) if(r.delegationId) revoked.add(r.delegationId);
  let changed=true; while(changed){changed=false; for(const d of i.delegations){if(revoked.has(d.id))continue; const parent=i.delegations.find(x=>x.delegateeId===d.delegatorId); if(parent&&revoked.has(parent.id)){revoked.add(d.id);changed=true;}}}
  return {revoked:[...revoked]};
}

export function evaluateDelegatedActionAuthorizationV65(i:V65IdentityDelegationInput){
  const pm=principalMap(i), env=new Map(buildAuthorityEnvelopeV65(i).delegations.map(x=>[x.delegationId,x]));
  const revoked=new Set(propagateDelegationRevocationsV65(i).revoked);
  return {actions:i.actions.map(a=>{const p=pm.get(a.principalId),d=a.delegationId?i.delegations.find(x=>x.id===a.delegationId):undefined,e=d?env.get(d.id):undefined;
    const direct=!!p&&p.active&&p.capabilities.includes(a.capability)&&p.scopes.some(s=>match(a.scope,s));
    const delegated=!!d&&!!e&&e.active&&!revoked.has(d.id)&&d.delegateeId===a.principalId&&d.capabilities.includes(a.capability)&&d.scopes.some(s=>match(a.scope,s))&&a.risk<=e.maxRisk&&e.evidenceReady;
    return {actionId:a.id,principalId:a.principalId,direct,delegated,authorized:direct||delegated,delegationId:d?.id??null,executed:false};})};
}

export function detectDelegatedAuthorityConflictsV65(i:V65IdentityDelegationInput){
  const out:string[]=[]; for(let a=0;a<i.delegations.length;a++)for(let b=a+1;b<i.delegations.length;b++){const x=i.delegations[a],y=i.delegations[b];
    if(x.delegateeId===y.delegateeId&&x.capabilities.some(c=>y.capabilities.includes(c))&&x.scopes.some(s=>y.scopes.includes(s))&&x.maxRisk!==y.maxRisk)out.push(`${x.id}:${y.id}`);}
  return {conflicts:out};
}

export function buildDelegatedRiskBudgetV65(i:V65IdentityDelegationInput){
  const env=buildAuthorityEnvelopeV65(i).delegations;
  return {delegations:env.map(e=>({delegationId:e.delegationId,budget:Number((e.maxRisk*(e.authorityCeiling/100)).toFixed(2)),
    consumed:Number(i.actions.filter(a=>a.delegationId===e.delegationId).reduce((n,a)=>n+a.risk,0).toFixed(2))}))};
}

export function evaluateBreakGlassAuthorityV65(i:V65IdentityDelegationInput){
  return {delegations:i.delegations.filter(d=>d.breakGlass).map(d=>({delegationId:d.id,withinRisk:d.maxRisk<=i.breakGlassMaxRisk,evidenceReady:evidenceReady(i,d.evidenceRefs),autoExecuted:false}))};
}

export function auditIdentityEvidenceCoverageV65(i:V65IdentityDelegationInput){
  const ids=new Set(i.evidence.map(e=>e.id));
  return {delegations:i.delegations.map(d=>({delegationId:d.id,missing:d.evidenceRefs.filter(r=>!ids.has(r)),covered:d.evidenceRefs.length>0&&d.evidenceRefs.every(r=>ids.has(r))})),
    signals:i.identitySignals.map(s=>({signalId:s.id,covered:!!s.evidenceRef&&ids.has(s.evidenceRef)}))};
}

export function buildAuthorityLineageV65(i:V65IdentityDelegationInput){
  return {lineage:i.principals.map(p=>({principalId:p.id,ancestors:uniq(i.delegations.filter(d=>d.delegateeId===p.id).map(d=>d.delegatorId)),parentPrincipalId:p.parentPrincipalId??null}))};
}

export function auditIdentityDelegationConsistencyV65(i:V65IdentityDelegationInput){
  const p=new Set(i.principals.map(x=>x.id)),d=new Set(i.delegations.map(x=>x.id)),e=new Set(i.evidence.map(x=>x.id));
  return {unknownDelegators:uniq(i.delegations.map(x=>x.delegatorId).filter(x=>!p.has(x))),unknownDelegatees:uniq(i.delegations.map(x=>x.delegateeId).filter(x=>!p.has(x))),
    unknownActionPrincipals:uniq(i.actions.map(x=>x.principalId).filter(x=>!p.has(x))),unknownActionDelegations:uniq(i.actions.flatMap(x=>x.delegationId?[x.delegationId]:[]).filter(x=>!d.has(x))),
    unknownEvidenceRefs:uniq([...i.delegations.flatMap(x=>x.evidenceRefs),...i.actions.flatMap(x=>x.evidenceRefs),...i.identitySignals.flatMap(x=>x.evidenceRef?[x.evidenceRef]:[])].filter(x=>!e.has(x)))};
}

export function buildIdentityDelegationHealthV65(i:V65IdentityDelegationInput){
  return {impersonationSignals:detectImpersonationSignalsV65(i).suspected.length,cycles:detectDelegationCyclesV65(i).cycles.length,
    escalationViolations:detectAuthorityEscalationV65(i).violations.length,subdelegationViolations:evaluateSubdelegationRightsV65(i).violations.length,
    authorityConflicts:detectDelegatedAuthorityConflictsV65(i).conflicts.length,revokedDelegations:propagateDelegationRevocationsV65(i).revoked.length};
}

export function buildIdentityDelegationSnapshotV65(i:V65IdentityDelegationInput){
  const consistency=auditIdentityDelegationConsistencyV65(i),health=buildIdentityDelegationHealthV65(i);
  const blocked=Object.values(consistency).some(v=>v.length>0)||health.cycles>0||health.escalationViolations>0||health.subdelegationViolations>0||health.impersonationSignals>0;
  return {identity:scoreIdentityAssuranceV65(i),delegationGraph:buildDelegationGraphV65(i),authority:buildAuthorityEnvelopeV65(i),authorization:evaluateDelegatedActionAuthorizationV65(i),
    revocations:propagateDelegationRevocationsV65(i),health,consistency,status:blocked?'BLOCKED':'READY',identityProofClaim:false,executionClaim:false,persistenceClaim:false};
}

export function buildIdentityDelegationOperatorBriefV65(i:V65IdentityDelegationInput){
  const s=buildIdentityDelegationSnapshotV65(i);
  return {status:s.status,impersonationSignals:s.health.impersonationSignals,cycles:s.health.cycles,escalationViolations:s.health.escalationViolations,
    revokedDelegations:s.health.revokedDelegations,evidenceBoundary:'Identity and delegated authority are evidence-bound analyses only; no cryptographic identity proof, persistence, execution, approval or legal authority is inferred.'};
}
