import type { V67ReliabilityRecoveryInput } from './v67-schema';

const evidenceReady=(i:V67ReliabilityRecoveryInput,refs:string[])=>{
  if(!refs.length) return false;
  const ok=new Set(i.evidence.filter(e=>e.verified&&e.fresh&&e.confidence>=60).map(e=>e.id));
  return refs.every(r=>ok.has(r));
};

const degraded=(i:V67ReliabilityRecoveryInput,s:V67ReliabilityRecoveryInput['services'][number])=>
  !s.healthy||(s.errorRate!==undefined&&s.errorRate>i.maxErrorRate)||(s.latencyMs!==undefined&&s.latencyMs>i.maxLatencyMs);

export function buildCircuitBreakerPlanV67(i:V67ReliabilityRecoveryInput){
  return {services:i.services.map(s=>{
    const shouldOpen=degraded(i,s)||!evidenceReady(i,s.evidenceRefs);
    return {service:s.name,state:shouldOpen?'OPEN':'CLOSED',reason:shouldOpen?'HEALTH_OR_EVIDENCE_GUARD':'HEALTHY',execute:false};
  }),executionClaim:false};
}

export function calculateRetryBudgetV67(i:V67ReliabilityRecoveryInput){
  const remaining=Math.max(0,i.retryState.budget-i.retryState.attempted);
  return {budget:i.retryState.budget,attempted:i.retryState.attempted,remaining,allowRetry:remaining>0,execute:false};
}

export function assessBlastRadiusV67(i:V67ReliabilityRecoveryInput,serviceName:string){
  const byName=new Map(i.services.map(s=>[s.name,s]));
  if(!byName.has(serviceName)) return {service:serviceName,affected:[],criticalityScore:0,known:false};
  const affected=new Set<string>([serviceName]);
  let changed=true;
  while(changed){
    changed=false;
    for(const s of i.services){
      if(!affected.has(s.name)&&s.dependencies.some(d=>affected.has(d))){affected.add(s.name);changed=true;}
    }
  }
  const list=[...affected];
  const criticalityScore=list.reduce((sum,n)=>sum+(byName.get(n)?.criticality??0),0);
  return {service:serviceName,affected:list,criticalityScore,known:true};
}

export function buildDegradedModePlanV67(i:V67ReliabilityRecoveryInput){
  const bad=i.services.filter(s=>degraded(i,s));
  const critical=bad.filter(s=>s.criticality>=80);
  return {
    mode:critical.length?'BLOCKED':bad.length?'DEGRADED':'NORMAL',
    degradedServices:bad.map(s=>s.name),
    criticalServices:critical.map(s=>s.name),
    actions:bad.map(s=>({service:s.name,action:s.criticality>=80?'ISOLATE_AND_VERIFY':'REDUCE_TRAFFIC_AND_VERIFY',execute:false})),
    executionClaim:false
  };
}

export function correlateFailuresV67(i:V67ReliabilityRecoveryInput){
  const active=i.incidents.filter(x=>x.active);
  const correlations: {incidentA:string;incidentB:string;sharedServices:string[];score:number}[]=[];
  for(let a=0;a<active.length;a++) for(let b=a+1;b<active.length;b++){
    const left=active[a],right=active[b];
    if(!left||!right) continue;
    const shared=left.services.filter(s=>right.services.includes(s));
    if(shared.length) correlations.push({incidentA:left.id,incidentB:right.id,sharedServices:shared,score:Math.min(100,shared.length*25+Math.min(left.severity,right.severity)/2)});
  }
  return {correlations:correlations.sort((a,b)=>b.score-a.score)};
}

export function buildRecoveryPriorityQueueV67(i:V67ReliabilityRecoveryInput){
  const activeAffected=new Set(i.incidents.filter(x=>x.active).flatMap(x=>x.services));
  const queue=i.services.map(s=>{
    const isDegraded=degraded(i,s);
    const incidentBoost=activeAffected.has(s.name)?30:0;
    const rawScore=s.criticality*0.6+(isDegraded?30:0)+incidentBoost;
    const score=Math.min(100,rawScore);
    return {service:s.name,priorityScore:Number(score.toFixed(2)),rawPriorityScore:Number(rawScore.toFixed(2)),criticality:s.criticality,requiresRecovery:isDegraded||activeAffected.has(s.name),execute:false};
  }).filter(x=>x.requiresRecovery).sort((a,b)=>b.rawPriorityScore-a.rawPriorityScore||b.criticality-a.criticality);
  return {queue};
}

export function evaluateRecoveryReadinessV67(i:V67ReliabilityRecoveryInput){
  const degradedServices=i.services.filter(s=>degraded(i,s));
  const unsupportedCritical=i.services.filter(s=>s.criticality>=80&&!evidenceReady(i,s.evidenceRefs));
  const criticalIncidents=i.incidents.filter(x=>x.active&&x.severity>=80&&evidenceReady(i,x.evidenceRefs));
  const unsupportedCriticalIncidents=i.incidents.filter(x=>x.active&&x.severity>=80&&!evidenceReady(i,x.evidenceRefs));
  const retry=calculateRetryBudgetV67(i);
  const recoveryNeeded=degradedServices.length>0||i.incidents.some(x=>x.active);
  const retryBlocked=recoveryNeeded&&retry.remaining===0;
  const ready=unsupportedCritical.length===0&&criticalIncidents.length===0&&unsupportedCriticalIncidents.length===0&&!retryBlocked;
  return {status:ready?'READY':'BLOCKED',degradedServices:degradedServices.map(s=>s.name),unsupportedCritical:unsupportedCritical.map(s=>s.name),criticalIncidents:criticalIncidents.map(x=>x.id),unsupportedCriticalIncidents:unsupportedCriticalIncidents.map(x=>x.id),retryRemaining:retry.remaining,recoveryNeeded,retryBlocked};
}

export function buildReliabilitySnapshotV67(i:V67ReliabilityRecoveryInput){
  return {
    objective:i.objective,
    circuitBreakers:buildCircuitBreakerPlanV67(i),
    retryBudget:calculateRetryBudgetV67(i),
    degradedMode:buildDegradedModePlanV67(i),
    failureCorrelation:correlateFailuresV67(i),
    recoveryQueue:buildRecoveryPriorityQueueV67(i),
    readiness:evaluateRecoveryReadinessV67(i),
    selfExecutionClaim:false,
    persistenceClaim:false,
    externalRecoveryClaim:false
  };
}
