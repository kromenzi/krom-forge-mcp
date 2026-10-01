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


export function buildCriticalDependencyPathV67(i:V67ReliabilityRecoveryInput){
  const byName=new Map(i.services.map(s=>[s.name,s]));
  const memo=new Map<string,{path:string[];score:number}>();
  const visit=(name:string,seen:Set<string>):{path:string[];score:number}=>{
    if(seen.has(name)) return {path:[name],score:0};
    const cached=memo.get(name); if(cached) return cached;
    const s=byName.get(name); if(!s) return {path:[],score:0};
    let best:{path:string[];score:number}={path:[name],score:s.criticality};
    for(const dep of s.dependencies){
      const child=visit(dep,new Set([...seen,name]));
      const candidate={path:[name,...child.path],score:s.criticality+child.score};
      if(candidate.score>best.score) best=candidate;
    }
    memo.set(name,best); return best;
  };
  const paths=i.services.map(s=>({service:s.name,...visit(s.name,new Set())})).sort((a,b)=>b.score-a.score);
  return {criticalPath:paths[0]?.path??[],criticalityScore:paths[0]?.score??0,paths};
}

export function scoreRecoveryEvidenceV67(i:V67ReliabilityRecoveryInput){
  const evidenceById=new Map(i.evidence.map(e=>[e.id,e]));
  return {services:i.services.map(s=>{
    if(!s.evidenceRefs.length) return {service:s.name,score:0,ready:false,missingRefs:[]};
    const refs=s.evidenceRefs.map(r=>evidenceById.get(r));
    const missingRefs=s.evidenceRefs.filter((_,idx)=>!refs[idx]);
    const valid=refs.filter((e):e is NonNullable<typeof e>=>!!e&&e.verified&&e.fresh);
    const score=s.evidenceRefs.length?Number((valid.reduce((sum,e)=>sum+e.confidence,0)/s.evidenceRefs.length).toFixed(2)):0;
    return {service:s.name,score,ready:missingRefs.length===0&&valid.length===s.evidenceRefs.length&&score>=60,missingRefs};
  })};
}

export function scoreRecoveryConfidenceV67(i:V67ReliabilityRecoveryInput){
  const readiness=evaluateRecoveryReadinessV67(i);
  const evidence=scoreRecoveryEvidenceV67(i).services;
  const averageEvidence=evidence.length?evidence.reduce((s,x)=>s+x.score,0)/evidence.length:0;
  const degradedPenalty=readiness.degradedServices.length*10;
  const incidentPenalty=(readiness.criticalIncidents.length+readiness.unsupportedCriticalIncidents.length)*20;
  const score=Math.max(0,Math.min(100,Number((averageEvidence-degradedPenalty-incidentPenalty).toFixed(2))));
  return {score,band:score>=80?'HIGH':score>=60?'MEDIUM':'LOW',readiness:readiness.status,averageEvidence:Number(averageEvidence.toFixed(2))};
}

export function buildFailoverSequenceV67(i:V67ReliabilityRecoveryInput,serviceName:string){
  const source=i.services.find(s=>s.name===serviceName);
  if(!source) return {service:serviceName,known:false,sequence:[],execute:false};
  const candidates=i.services.filter(s=>s.name!==serviceName&&s.healthy&&!degraded(i,s))
    .map(s=>({service:s.name,criticality:s.criticality,evidenceReady:evidenceReady(i,s.evidenceRefs),dependencyDistance:s.dependencies.includes(serviceName)?1:2}))
    .filter(x=>x.evidenceReady)
    .sort((a,b)=>a.dependencyDistance-b.dependencyDistance||b.criticality-a.criticality);
  return {service:serviceName,known:true,sequence:candidates.slice(0,5),execute:false};
}

export function buildIncidentContainmentPlanV67(i:V67ReliabilityRecoveryInput){
  const byService=new Map(i.services.map(s=>[s.name,s]));
  const active=i.incidents.filter(x=>x.active);
  const actions=active.flatMap(incident=>incident.services.map(name=>{
    const s=byService.get(name);
    const criticality=s?.criticality??0;
    return {incident:incident.id,service:name,action:criticality>=80?'ISOLATE_AND_PRESERVE_EVIDENCE':'RATE_LIMIT_AND_VERIFY',priority:Math.min(100,incident.severity*0.6+criticality*0.4),execute:false};
  })).sort((a,b)=>b.priority-a.priority);
  return {actions,executionClaim:false};
}
