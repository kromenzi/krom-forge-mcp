import type { V60MeshInput } from './v60-schema';
const uniq=<T>(xs:T[])=>[...new Set(xs)];

export function buildEventSourcedRuntime(i:V60MeshInput){
  const ordered=[...i.events].sort((a,b)=>a.stream.localeCompare(b.stream)||a.sequence-b.sequence||a.id.localeCompare(b.id));
  return{streams:uniq(ordered.map(e=>e.stream)).map(stream=>({stream,events:ordered.filter(e=>e.stream===stream).map(e=>e.id)})),eventCount:ordered.length,persistenceClaim:false};
}
export function detectEventSequenceGaps(i:V60MeshInput){
  const gaps:{stream:string;from:number;to:number}[]=[];for(const stream of uniq(i.events.map(e=>e.stream))){const seq=[...i.events.filter(e=>e.stream===stream).map(e=>e.sequence)].sort((a,b)=>a-b);for(let n=1;n<seq.length;n++)if(seq[n]-seq[n-1]>1+i.maxEventGap)gaps.push({stream,from:seq[n-1],to:seq[n]})}
  return{gaps};
}
export function buildReplayProtection(i:V60MeshInput){
  const seen=new Map<string,string[]>();for(const e of i.events){const key=`${e.stream}|${e.sequence}|${e.hash}`;const a=seen.get(key)??[];a.push(e.id);seen.set(key,a)}
  return{duplicates:[...seen].filter(([,ids])=>ids.length>1).map(([signature,ids])=>({signature,ids})),replaySafe:[...seen.values()].every(ids=>ids.length===1)};
}
export function buildCommandBusEnvelopes(i:V60MeshInput){
  return{commands:i.commands.map(c=>({id:c.id,type:c.type,target:c.target,idempotencyKey:c.idempotencyKey,authorized:c.policy==='ALLOW'||(c.policy==='REQUIRE_APPROVAL'&&c.approved),mutationExecuted:false}))};
}
export function enforceExecutionEnvelopes(i:V60MeshInput){
  return{allowed:buildCommandBusEnvelopes(i).commands.filter(c=>c.authorized).map(c=>c.id),blocked:buildCommandBusEnvelopes(i).commands.filter(c=>!c.authorized).map(c=>c.id)};
}
export function buildDistributedSchedulerMesh(i:V60MeshInput){
  const done=new Set(i.workloads.filter(w=>w.state==='DONE').map(w=>w.id));const running=i.workloads.filter(w=>w.state==='RUNNING').length;
  const slots=Math.max(0,i.maxConcurrent-running);const ready=i.workloads.filter(w=>w.state==='PENDING'&&w.dependsOn.every(d=>done.has(d))).sort((a,b)=>b.priority-a.priority||a.risk-b.risk);
  return{admit:ready.slice(0,slots).map(w=>w.id),defer:ready.slice(slots).map(w=>w.id),slots};
}
export function evaluateAgentConsensus(i:V60MeshInput){
  const active=i.agents.filter(a=>a.available&&a.vote!=='ABSTAIN');const approve=active.filter(a=>a.vote==='APPROVE').reduce((s,a)=>s+a.reliability,0);const block=active.filter(a=>a.vote==='BLOCK').reduce((s,a)=>s+a.reliability,0);
  return{approveWeight:approve,blockWeight:block,decision:approve>=100&&approve>block?'APPROVE':block>=100&&block>=approve?'BLOCK':'NO_QUORUM'};
}
export function buildRecoveryQuorum(i:V60MeshInput){
  const q=evaluateAgentConsensus(i);return{decision:q.decision,recoveryAllowed:q.decision==='APPROVE',requiresHostExecution:true};
}
export function updateToolReputationFeedback(i:V60MeshInput){
  return{tools:i.tools.map(t=>({name:t.name,score:Number((t.quality*.4+t.successRate*50-Math.min(t.failures*4,20)-Math.min(t.latencyMs/1000,10)).toFixed(2))})).sort((a,b)=>b.score-a.score),automaticMutation:false};
}
export function invalidateSemanticCache(i:V60MeshInput){
  const changed=new Set(i.changedDeps);return{invalidate:i.cache.filter(c=>c.deps.some(d=>changed.has(d))||!c.fresh||c.confidence<70).map(c=>c.key),retain:i.cache.filter(c=>!c.deps.some(d=>changed.has(d))&&c.fresh&&c.confidence>=70).map(c=>c.key)};
}
export function advanceSagaState(i:V60MeshInput){
  return{sagas:i.sagas.map(s=>{const allDone=s.steps.length>0&&s.steps.every(x=>x.done);const next=s.state==='NEW'?'RUNNING':s.state==='RUNNING'&&allDone?'COMPLETED':s.state;return{id:s.id,from:s.state,to:next}})};
}
export function buildSagaRecoveryPlan(i:V60MeshInput){
  return{sagas:i.sagas.filter(s=>s.state==='FAILED'||s.state==='COMPENSATING').map(s=>({id:s.id,compensations:[...s.steps].reverse().filter(x=>x.done&&x.compensation).map(x=>x.compensation!),automaticExecution:false}))};
}
export function buildCheckpointLineage(i:V60MeshInput){
  return{nodes:i.checkpoints.map(c=>({id:c.id,workloadId:c.workloadId,verified:c.verified})),edges:i.checkpoints.filter(c=>c.parentId).map(c=>({from:c.parentId!,to:c.id}))};
}
export function aggregateRuntimeTelemetry(i:V60MeshInput){
  return{metrics:i.telemetry.map(t=>({name:t.name,value:t.value,target:t.target,state:t.target===undefined?'OBSERVED':t.direction==='MAX'?(t.value<=t.target?'PASS':'BREACH'):(t.value>=t.target?'PASS':'BREACH')}))};
}
export function governErrorBudget(i:V60MeshInput){
  const breaches=aggregateRuntimeTelemetry(i).metrics.filter(m=>m.state==='BREACH').length;return{breaches,budgetState:breaches===0?'HEALTHY':breaches===1?'CONSTRAINED':'EXHAUSTED',admitRiskyWork:breaches===0};
}
export function buildDeadLetterQueuePlan(i:V60MeshInput){
  return{retry:i.deadLetters.filter(d=>d.retryable).map(d=>d.id),quarantine:i.deadLetters.filter(d=>!d.retryable).map(d=>d.id),deliveryClaim:false};
}
export function governWorkloadAdmission(i:V60MeshInput){
  const sched=buildDistributedSchedulerMesh(i);const err=governErrorBudget(i);const selected=sched.admit.filter(id=>{const w=i.workloads.find(x=>x.id===id)!;return err.admitRiskyWork||w.risk<50});
  return{admitted:selected,rejected:sched.admit.filter(id=>!selected.includes(id)),deferred:sched.defer};
}
export function buildRuntimeMeshHealth(i:V60MeshInput){
  return{eventGaps:detectEventSequenceGaps(i).gaps.length,replaySafe:buildReplayProtection(i).replaySafe,consensus:evaluateAgentConsensus(i).decision,errorBudget:governErrorBudget(i).budgetState,deadLetters:i.deadLetters.length};
}
export function auditRuntimeMeshConsistency(i:V60MeshInput){
  const workloadIds=new Set(i.workloads.map(w=>w.id));const checkpointIds=new Set(i.checkpoints.map(c=>c.id));
  return{unknownWorkloadDeps:uniq(i.workloads.flatMap(w=>w.dependsOn).filter(d=>!workloadIds.has(d))),unknownCheckpointParents:uniq(i.checkpoints.map(c=>c.parentId).filter((p):p is string=>!!p&&!checkpointIds.has(p))),duplicateCommandKeys:i.commands.map(c=>c.idempotencyKey).filter((k,n,a)=>k&&a.indexOf(k)!==n),eventGaps:detectEventSequenceGaps(i).gaps.length,replayDuplicates:buildReplayProtection(i).duplicates.length};
}
export function buildRuntimeMeshControlPlane(i:V60MeshInput){
  return{commands:enforceExecutionEnvelopes(i),scheduler:buildDistributedSchedulerMesh(i),consensus:evaluateAgentConsensus(i),cache:invalidateSemanticCache(i),sagas:advanceSagaState(i),telemetry:aggregateRuntimeTelemetry(i),admission:governWorkloadAdmission(i),executionClaim:false,persistenceClaim:false};
}
export function buildRuntimeMeshSnapshot(i:V60MeshInput){
  const consistency=auditRuntimeMeshConsistency(i);return{health:buildRuntimeMeshHealth(i),control:buildRuntimeMeshControlPlane(i),consistency,status:Object.values(consistency).every(v=>Array.isArray(v)?v.length===0:v===0)?'READY':'BLOCKED',executionClaim:false,persistenceClaim:false};
}
export function buildRuntimeMeshOperatorBrief(i:V60MeshInput){
  const snap=buildRuntimeMeshSnapshot(i);return{status:snap.status,health:snap.health,nextActions:[...(snap.health.replaySafe?[]:['FIX_EVENT_REPLAY']),...(snap.health.eventGaps?['REPAIR_EVENT_SEQUENCE']:[]),...(snap.health.errorBudget==='EXHAUSTED'?['FREEZE_RISKY_WORK']:[])],evidenceBoundary:'Observed inputs only; no external execution or persistence is inferred.'};
}
export function compareRuntimeMeshStates(i:V60MeshInput){
  return{current:buildRuntimeMeshHealth(i),comparisonBasis:'single supplied state only',historicalComparisonAvailable:false};
}
