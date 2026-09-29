import type { V62DecisionInput } from './v62-schema';
const uniq=<T>(xs:T[])=>[...new Set(xs)];
const round=(n:number)=>Number(n.toFixed(2));

export function fuseDecisionEvidence(i:V62DecisionInput){
  const topics=uniq(i.evidence.map(e=>e.topic));
  return{topics:topics.map(topic=>{
    const rows=i.evidence.filter(e=>e.topic===topic);
    let support=0,oppose=0,weight=0;
    for(const e of rows){const w=(e.verified?1:.45)*(e.fresh?1:.7)*(e.confidence/100)*(e.sourceQuality/100);weight+=w;if(e.stance==='SUPPORT')support+=w;if(e.stance==='OPPOSE')oppose+=w}
    const net=weight?((support-oppose)/weight)*100:0;
    return{topic,support:round(support),oppose:round(oppose),netConfidence:round(net),evidenceCount:rows.length};
  })};
}
export function accountDecisionUncertainty(i:V62DecisionInput){
  return{decisions:i.decisions.map(d=>{const refs=i.evidence.filter(e=>d.evidenceRefs.includes(e.id));const missing=d.evidenceRefs.filter(id=>!i.evidence.some(e=>e.id===id));const avg=refs.length?refs.reduce((s,e)=>s+e.confidence,0)/refs.length:0;const uncertainty=Math.min(100,100-avg+missing.length*15+(refs.some(e=>!e.verified)?15:0));return{id:d.id,uncertainty:round(uncertainty),missingEvidence:missing};})};
}
export function scoreDecisionConfidenceV62(i:V62DecisionInput){
  const uncertainty=new Map(accountDecisionUncertainty(i).decisions.map(d=>[d.id,d.uncertainty]));
  return{decisions:i.decisions.map(d=>{const refs=i.evidence.filter(e=>d.evidenceRefs.includes(e.id));const quality=refs.length?refs.reduce((s,e)=>s+(e.verified?e.confidence*.7+e.sourceQuality*.3:e.confidence*.35),0)/refs.length:0;const score=Math.max(0,Math.min(100,quality-(uncertainty.get(d.id)??100)*.25));return{id:d.id,confidence:round(score),threshold:d.threshold,state:score>=d.threshold?'READY':'INSUFFICIENT'};})};
}
export function detectConflictingEvidenceV62(i:V62DecisionInput){
  const topics=uniq(i.evidence.map(e=>e.topic));return{conflicts:topics.filter(t=>{const s=new Set(i.evidence.filter(e=>e.topic===t&&e.verified&&e.fresh).map(e=>e.stance).filter(x=>x!=='NEUTRAL'));return s.has('SUPPORT')&&s.has('OPPOSE')}).map(topic=>({topic,ids:i.evidence.filter(e=>e.topic===topic&&e.verified&&e.fresh).map(e=>e.id)}))};
}
export function resolveEvidenceConflictsV62(i:V62DecisionInput){
  return{resolutions:detectConflictingEvidenceV62(i).conflicts.map(c=>{const rows=i.evidence.filter(e=>c.ids.includes(e.id));const ranked=[...rows].sort((a,b)=>(b.sourceQuality+b.confidence)-(a.sourceQuality+a.confidence));return{topic:c.topic,preferredEvidence:ranked[0]?.id??null,requiresHumanReview:true};})};
}
export function calibrateToolConfidenceV62(i:V62DecisionInput){
  return{tools:i.tools.map(t=>{const sampleFactor=Math.min(1,t.sampleSize/20);const confidence=t.observedAccuracy*.5+t.evidenceQuality*.3+(100-t.uncertainty)*.2;return{name:t.name,calibrated:round(confidence*sampleFactor),sampleFactor:round(sampleFactor)};}).sort((a,b)=>b.calibrated-a.calibrated),automaticMutation:false};
}
export function decayEvidenceConfidenceV62(i:V62DecisionInput){
  return{evidence:i.evidence.map(e=>({id:e.id,original:e.confidence,decayed:round(Math.max(0,e.confidence-e.age*i.confidenceDecayPerAge))}))};
}
export function evaluateEvidenceSufficiencyV62(i:V62DecisionInput){
  const scores=new Map(scoreDecisionConfidenceV62(i).decisions.map(d=>[d.id,d]));
  return{decisions:i.decisions.map(d=>({id:d.id,sufficient:scores.get(d.id)?.state==='READY',confidence:scores.get(d.id)?.confidence??0,required:d.threshold}))};
}
export function routeVerificationEffortV62(i:V62DecisionInput){
  const rows=i.decisions.map(d=>{const suff=evaluateEvidenceSufficiencyV62(i).decisions.find(x=>x.id===d.id)!;const priority=(100-suff.confidence)+d.impact+(100-d.reversibility)*.5;return{id:d.id,priority:round(priority)}}).sort((a,b)=>b.priority-a.priority);
  return{selected:rows.slice(0,i.verificationCapacity),deferred:rows.slice(i.verificationCapacity)};
}
export function escalateVerificationV62(i:V62DecisionInput){
  return{escalations:routeVerificationEffortV62(i).selected.filter(x=>x.priority>=120).map(x=>({decisionId:x.id,level:x.priority>=170?'FORENSIC':'DEEP'}))};
}
export function adjudicateAgentsV62(i:V62DecisionInput){
  const active=i.agents.filter(a=>a.vote!=='ABSTAIN');const approve=active.filter(a=>a.vote==='APPROVE').reduce((s,a)=>s+a.reliability*a.domainFit/100,0);const block=active.filter(a=>a.vote==='BLOCK').reduce((s,a)=>s+a.reliability*a.domainFit/100,0);return{approveWeight:round(approve),blockWeight:round(block),decision:approve>=100&&approve>block?'APPROVE':block>=100&&block>=approve?'BLOCK':'NO_QUORUM'};
}
export function analyzeCounterfactualReleasesV62(i:V62DecisionInput){
  return{scenarios:i.scenarios.map(s=>({id:s.id,score:round(s.benefit-s.risk+s.verification*.4+(s.reversible?10:0)),releaseId:s.releaseId??null,simulationOnly:true})).sort((a,b)=>b.score-a.score)};
}
export function compareDecisionScenariosV62(i:V62DecisionInput){
  const ranked=analyzeCounterfactualReleasesV62(i).scenarios;return{best:ranked[0]?.id??null,ranked,executed:false};
}
export function compressDependencyRiskV62(i:V62DecisionInput){
  const nodes=uniq(i.dependencies.flatMap(d=>[d.from,d.to]));return{nodes:nodes.map(id=>{const incoming=i.dependencies.filter(d=>d.to===id);const outgoing=i.dependencies.filter(d=>d.from===id);const risk=Math.min(100,incoming.reduce((s,d)=>s+d.risk*.6,0)+outgoing.reduce((s,d)=>s+d.risk*.4,0));return{id,risk:round(risk),degree:incoming.length+outgoing.length};}).sort((a,b)=>b.risk-a.risk)};
}
export function analyzeRollbackDecisionV62(i:V62DecisionInput){
  return{releases:i.releases.map(r=>({id:r.id,rollbackRecommended:r.risk>=60&&r.rollbackReady,rollbackBlocked:r.risk>=60&&!r.rollbackReady,reason:r.risk>=60?(r.rollbackReady?'HIGH_RISK_REVERSIBLE':'HIGH_RISK_NO_ROLLBACK'):'RISK_BELOW_THRESHOLD',automaticExecution:false}))};
}
export function buildReleaseDecisionPacketsV62(i:V62DecisionInput){
  const agent=adjudicateAgentsV62(i);return{packets:i.releases.map(r=>({releaseId:r.id,readiness:r.readiness,risk:r.risk,confidence:r.confidence,rollbackReady:r.rollbackReady,agentAdjudication:agent.decision,decision:r.readiness>=80&&r.risk<=40&&r.confidence>=70&&agent.decision!=='BLOCK'?'EVIDENCE_READY':'HOLD',executionClaim:false}))};
}
export function enforceDecisionThresholdsV62(i:V62DecisionInput){
  return{decisions:scoreDecisionConfidenceV62(i).decisions.map(d=>({id:d.id,threshold:d.threshold,confidence:d.confidence,passes:d.confidence>=d.threshold}))};
}
export function buildDecisionCoreHealthV62(i:V62DecisionInput){
  const conflicts=detectConflictingEvidenceV62(i).conflicts.length;const insufficient=evaluateEvidenceSufficiencyV62(i).decisions.filter(d=>!d.sufficient).length;const calibrated=calibrateToolConfidenceV62(i).tools;return{evidenceConflicts:conflicts,insufficientDecisions:insufficient,agentConsensus:adjudicateAgentsV62(i).decision,topToolConfidence:calibrated[0]?.calibrated??0};
}
export function auditDecisionCoreConsistencyV62(i:V62DecisionInput){
  const eids=new Set(i.evidence.map(e=>e.id));const releases=new Set(i.releases.map(r=>r.id));
  return{unknownDecisionEvidence:uniq(i.decisions.flatMap(d=>d.evidenceRefs).filter(id=>!eids.has(id))),unknownScenarioReleases:uniq(i.scenarios.map(s=>s.releaseId).filter((id):id is string=>!!id&&!releases.has(id))),duplicateEvidenceIds:i.evidence.map(e=>e.id).filter((x,n,a)=>a.indexOf(x)!==n),duplicateDecisionIds:i.decisions.map(d=>d.id).filter((x,n,a)=>a.indexOf(x)!==n)};
}
export function buildDecisionCoreSnapshotV62(i:V62DecisionInput){
  const consistency=auditDecisionCoreConsistencyV62(i);return{fusion:fuseDecisionEvidence(i),confidence:scoreDecisionConfidenceV62(i),uncertainty:accountDecisionUncertainty(i),verification:routeVerificationEffortV62(i),agents:adjudicateAgentsV62(i),releases:buildReleaseDecisionPacketsV62(i),health:buildDecisionCoreHealthV62(i),consistency,status:Object.values(consistency).every(v=>v.length===0)?'READY':'BLOCKED',executionClaim:false,persistenceClaim:false};
}
