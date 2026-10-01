import type { V70DeliveryVerificationInput } from './v70-schema';

const evidenceMap=(i:V70DeliveryVerificationInput)=>new Map(i.evidence.map(e=>[e.id,e]));
const evidenceReady=(i:V70DeliveryVerificationInput,refs:string[])=>{
  if(!refs.length) return false;
  const map=evidenceMap(i);
  return refs.every(ref=>{
    const e=map.get(ref);
    if(!e||!e.verified||!e.fresh||e.confidence<60) return false;
    if(e.observedAtEpoch!==undefined&&i.nowEpoch>0&&i.nowEpoch-e.observedAtEpoch>i.maxEvidenceAgeSeconds) return false;
    return true;
  });
};

export function evaluateEvidenceFreshnessV70(i:V70DeliveryVerificationInput){
  const items=i.evidence.map(e=>{
    const age=e.observedAtEpoch===undefined||i.nowEpoch===0?null:Math.max(0,i.nowEpoch-e.observedAtEpoch);
    const staleByAge=age!==null&&age>i.maxEvidenceAgeSeconds;
    const ready=e.verified&&e.fresh&&e.confidence>=60&&!staleByAge;
    return {id:e.id,kind:e.kind,ageSeconds:age,ready};
  });
  return {items,pass:items.length>0&&items.every(x=>x.ready)};
}

export function buildDeploymentWavePlanV70(i:V70DeliveryVerificationInput){
  const serviceMap=new Map(i.services.map(s=>[s.name,s]));
  const plans=i.releases.map(r=>{
    const affected=r.services.map(name=>serviceMap.get(name)).filter((s):s is NonNullable<typeof s>=>!!s);
    const critical=Math.max(0,...affected.map(s=>s.criticality));
    const highRisk=r.changeRisk>=60||critical>=80;
    const strategy=highRisk?'CANARY_THEN_PROGRESSIVE':r.changeRisk>=35?'PROGRESSIVE':'DIRECT_WITH_OBSERVATION';
    return {release:r.id,strategy,requiresApproval:highRisk,evidenceReady:evidenceReady(i,r.evidenceRefs),execute:false};
  });
  return {plans,executionClaim:false};
}

export function evaluateObservationWindowV70(i:V70DeliveryVerificationInput,releaseId:string){
  const observations=i.observations.filter(o=>o.releaseId===releaseId&&o.phase==='POST_DEPLOY');
  const latest=observations.length?Math.max(...observations.map(o=>o.epoch)):null;
  const enoughElapsed=latest!==null&&i.nowEpoch>0&&i.nowEpoch-latest>=i.observationWindowSeconds;
  const unhealthy=observations.filter(o=>!o.healthy||(o.errorRate!==undefined&&o.errorRate>i.maxErrorRate)||(o.latencyMs!==undefined&&o.latencyMs>i.maxLatencyMs));
  const evidencePass=observations.length>0&&observations.every(o=>evidenceReady(i,o.evidenceRefs));
  return {releaseId,observationCount:observations.length,enoughElapsed,unhealthy:unhealthy.map(o=>o.id),evidencePass,pass:observations.length>0&&enoughElapsed&&unhealthy.length===0&&evidencePass};
}

export function detectRollbackTriggersV70(i:V70DeliveryVerificationInput,releaseId:string){
  const runtime=i.observations.filter(o=>o.releaseId===releaseId&&['CANARY','POST_DEPLOY'].includes(o.phase));
  const failedChecks=i.verificationChecks.filter(c=>c.releaseId===releaseId&&(!c.passed||!evidenceReady(i,c.evidenceRefs)));
  const triggers:string[]=[];
  if(runtime.some(o=>!o.healthy)) triggers.push('UNHEALTHY_RUNTIME');
  if(runtime.some(o=>o.errorRate!==undefined&&o.errorRate>i.maxErrorRate)) triggers.push('ERROR_RATE_BREACH');
  if(runtime.some(o=>o.latencyMs!==undefined&&o.latencyMs>i.maxLatencyMs)) triggers.push('LATENCY_BREACH');
  if(failedChecks.some(c=>c.severity>=80)) triggers.push('CRITICAL_VERIFICATION_FAILURE');
  const release=i.releases.find(r=>r.id===releaseId);
  return {releaseId,triggers:[...new Set(triggers)],rollbackRecommended:triggers.length>0,rollbackAvailable:!!release?.reversible,execute:false};
}

export function buildImpactReverificationPlanV70(i:V70DeliveryVerificationInput,releaseId:string){
  const release=i.releases.find(r=>r.id===releaseId);
  if(!release) return {releaseId,known:false,services:[],checks:[],execute:false};
  const impacted=new Set(release.services);
  let changed=true;
  while(changed){
    changed=false;
    for(const s of i.services){
      if(!impacted.has(s.name)&&s.dependencies.some(d=>impacted.has(d))){impacted.add(s.name);changed=true;}
    }
  }
  const services=[...impacted];
  const checks=services.flatMap(service=>['CONTRACT','RUNTIME','SMOKE'].map(kind=>({service,kind,execute:false})));
  return {releaseId,known:true,services,checks,execute:false};
}

export function coordinateReleaseTrainV70(i:V70DeliveryVerificationInput){
  const serviceOwners=new Map<string,string[]>();
  for(const r of i.releases) for(const s of r.services) serviceOwners.set(s,[...(serviceOwners.get(s)??[]),r.id]);
  const conflicts=[...serviceOwners.entries()].filter(([,ids])=>ids.length>1).map(([service,ids])=>({service,releases:ids}));
  const ordered=[...i.releases].sort((a,b)=>a.changeRisk-b.changeRisk||a.id.localeCompare(b.id)).map((r,index)=>({order:index+1,release:r.id,approved:r.approved,evidenceReady:evidenceReady(i,r.evidenceRefs)}));
  return {ordered,conflicts,pass:conflicts.length===0&&ordered.every(x=>x.approved&&x.evidenceReady)};
}

export function detectDeliveryDriftV70(i:V70DeliveryVerificationInput,releaseId:string){
  const pre=i.observations.filter(o=>o.releaseId===releaseId&&o.phase==='PRE_DEPLOY');
  const post=i.observations.filter(o=>o.releaseId===releaseId&&o.phase==='POST_DEPLOY');
  const byService=(xs:typeof pre)=>new Map(xs.map(x=>[x.service,x]));
  const a=byService(pre),b=byService(post);
  const drift=i.services.map(s=>{
    const before=a.get(s.name),after=b.get(s.name);
    if(!before||!after) return {service:s.name,comparable:false,healthRegression:false,errorDelta:null,latencyDelta:null};
    const errorDelta=(after.errorRate??0)-(before.errorRate??0);
    const latencyDelta=(after.latencyMs??0)-(before.latencyMs??0);
    const healthRegression=before.healthy&&!after.healthy||(after.errorRate!==undefined&&after.errorRate>i.maxErrorRate)||(after.latencyMs!==undefined&&after.latencyMs>i.maxLatencyMs)||errorDelta>i.maxErrorRate||latencyDelta>i.maxLatencyMs;
    return {service:s.name,comparable:true,healthRegression,errorDelta:Number(errorDelta.toFixed(2)),latencyDelta:Number(latencyDelta.toFixed(2))};
  });
  return {releaseId,drift,pass:drift.some(x=>x.comparable)&&drift.every(x=>!x.healthRegression)};
}

export function evaluatePostDeployVerificationV70(i:V70DeliveryVerificationInput,releaseId:string){
  const checks=i.verificationChecks.filter(c=>c.releaseId===releaseId);
  const critical=checks.filter(c=>c.severity>=80);
  const supportedPassed=checks.filter(c=>c.passed&&evidenceReady(i,c.evidenceRefs));
  const failedOrUnsupported=checks.filter(c=>!c.passed||!evidenceReady(i,c.evidenceRefs));
  const observation=evaluateObservationWindowV70(i,releaseId);
  const pass=checks.length>0&&critical.every(c=>c.passed&&evidenceReady(i,c.evidenceRefs))&&failedOrUnsupported.length===0&&observation.pass;
  return {releaseId,totalChecks:checks.length,supportedPassed:supportedPassed.length,failedOrUnsupported:failedOrUnsupported.map(c=>c.id),observation,pass};
}

export function evaluateDeliveryClosureV70(i:V70DeliveryVerificationInput,releaseId:string){
  const release=i.releases.find(r=>r.id===releaseId);
  const verification=evaluatePostDeployVerificationV70(i,releaseId);
  const rollback=detectRollbackTriggersV70(i,releaseId);
  const drift=detectDeliveryDriftV70(i,releaseId);
  const blockers:string[]=[];
  if(!release) blockers.push('UNKNOWN_RELEASE');
  else{
    if(!release.approved) blockers.push('APPROVAL_MISSING');
    if(!evidenceReady(i,release.evidenceRefs)) blockers.push('RELEASE_EVIDENCE_NOT_READY');
  }
  if(!verification.pass) blockers.push('POST_DEPLOY_VERIFICATION_INCOMPLETE');
  if(rollback.rollbackRecommended) blockers.push('ROLLBACK_TRIGGER_PRESENT');
  if(!drift.pass) blockers.push('DELIVERY_DRIFT_UNRESOLVED');
  return {releaseId,status:blockers.length?'BLOCKED':'CLOSED',blockers,verification,rollback,drift};
}

export function buildDeliveryDecisionPacketV70(i:V70DeliveryVerificationInput,releaseId:string){
  return {
    objective:i.objective,
    releaseId,
    freshness:evaluateEvidenceFreshnessV70(i),
    waves:buildDeploymentWavePlanV70(i),
    observation:evaluateObservationWindowV70(i,releaseId),
    rollback:detectRollbackTriggersV70(i,releaseId),
    reverification:buildImpactReverificationPlanV70(i,releaseId),
    releaseTrain:coordinateReleaseTrainV70(i),
    drift:detectDeliveryDriftV70(i,releaseId),
    postDeploy:evaluatePostDeployVerificationV70(i,releaseId),
    closure:evaluateDeliveryClosureV70(i,releaseId),
    execute:false,
    selfExecutionClaim:false,
    persistenceClaim:false,
    externalVerificationClaim:false
  };
}
