import type { V59FabricInput } from './v59-schema';
const uniq=<T>(xs:T[])=>[...new Set(xs)];

export function buildRuntimeEventBus(i:V59FabricInput){
  const ordered=[...i.events].sort((a,b)=>a.sequence-b.sequence||a.id.localeCompare(b.id));
  return{events:ordered.slice(0,i.eventBudget),pending:ordered.filter(e=>!e.processed).map(e=>e.id),executionClaim:false,persistenceClaim:false};
}
export function detectDuplicateEvents(i:V59FabricInput){
  const seen=new Map<string,string[]>();for(const e of i.events){const k=`${e.type}|${e.key}|${e.payloadHash}`;const a=seen.get(k)??[];a.push(e.id);seen.set(k,a)}
  return{duplicates:[...seen].filter(([,ids])=>ids.length>1).map(([signature,ids])=>({signature,ids}))};
}
export function buildIdempotentEventPlan(i:V59FabricInput){
  const duplicates=new Set(detectDuplicateEvents(i).duplicates.flatMap(d=>d.ids.slice(1)));return{process:i.events.filter(e=>!e.processed&&!duplicates.has(e.id)).sort((a,b)=>a.sequence-b.sequence).map(e=>e.id),skip:[...duplicates]};
}
export function buildDurableStateAdapterContract(i:V59FabricInput){
  return{adapters:uniq(i.stateRecords.map(r=>r.adapter)).map(adapter=>({adapter,contract:['read','compare-version','write-if-authorized','checkpoint','restore','evidence'],durableObserved:i.stateRecords.some(r=>r.adapter===adapter&&r.durable)})),persistenceClaim:false};
}
export function detectStateVersionConflicts(i:V59FabricInput){
  const groups=new Map<string,typeof i.stateRecords>();for(const r of i.stateRecords){const a=groups.get(r.key)??[];a.push(r);groups.set(r.key,a)}
  return{conflicts:[...groups].filter(([,rs])=>uniq(rs.map(r=>r.version)).length>1&&uniq(rs.map(r=>r.valueHash)).length>1).map(([key,records])=>({key,versions:records.map(r=>r.version)}))};
}
export function coordinateDistributedMissions(i:V59FabricInput){
  const done=new Set(i.missions.filter(m=>m.state==='DONE').map(m=>m.id));const active=i.missions.filter(m=>m.state!=='DONE'&&m.dependsOn.every(d=>done.has(d))).sort((a,b)=>a.risk-b.risk||a.id.localeCompare(b.id));
  return{ready:active.slice(0,i.maxInFlight).map(m=>m.id),blocked:i.missions.filter(m=>m.state!=='DONE'&&!active.includes(m)).map(m=>m.id),maxInFlight:i.maxInFlight};
}
export function buildMissionOwnershipHandoff(i:V59FabricInput){
  return{handoffs:i.missions.filter(m=>m.state==='RUNNING'&&m.owner).map(m=>({missionId:m.id,from:m.owner,to:i.agents.filter(a=>!a.busy&&a.id!==m.owner).sort((a,b)=>b.reliability-a.reliability)[0]?.id??null,requiresCheckpoint:!m.checkpoint})),executionClaim:false};
}
export function buildAgentHandoffProtocol(i:V59FabricInput){
  return{protocol:['objective','context','completed-actions','evidence','checkpoint','blockers','next-action','authorization-boundary'],assignments:buildMissionOwnershipHandoff(i).handoffs};
}
export function scoreToolReputation(i:V59FabricInput){
  return{tools:i.tools.map(t=>({name:t.name,score:Number(((t.healthy?20:0)+t.successRate*60-Math.min(t.failures*5,25)-Math.min(t.latencyMs/1000,15)).toFixed(2))})).sort((a,b)=>b.score-a.score)};
}
export function auditToolHealth(i:V59FabricInput){
  return{healthy:i.tools.filter(t=>t.healthy&&t.successRate>=.8).map(t=>t.name),degraded:i.tools.filter(t=>!t.healthy||t.successRate<.8).map(t=>t.name)};
}
export function buildSemanticCachePlan(i:V59FabricInput){
  return{usable:i.cacheEntries.filter(c=>c.fresh&&c.confidence>=70).map(c=>c.key),revalidate:i.cacheEntries.filter(c=>!c.fresh||c.confidence<70).map(c=>c.key),persistenceClaim:false};
}
export function compileWorkflowV59(i:V59FabricInput){
  return{workflows:i.workflows.map(w=>({id:w.id,order:[...w.steps].sort((a,b)=>a.dependsOn.length-b.dependsOn.length||a.id.localeCompare(b.id)).map(s=>s.id),stepCount:w.steps.length}))};
}
export function buildSagaCompensationPlan(i:V59FabricInput){
  return{workflows:i.workflows.map(w=>({id:w.id,compensations:[...w.steps].reverse().filter(s=>s.compensates||s.reversible).map(s=>({step:s.id,compensation:s.compensates??'HOST_DEFINED_ROLLBACK'}))}))};
}
export function buildRollbackOrchestration(i:V59FabricInput){
  return{missions:i.missions.filter(m=>m.risk>=60).map(m=>({missionId:m.id,workflowId:m.workflowId??null,checkpoint:m.checkpoint??null,requiresVerifiedRestorePoint:true,automaticExecution:false}))};
}
export function governBackpressure(i:V59FabricInput){
  const pending=i.events.filter(e=>!e.processed).length;const inFlight=i.missions.filter(m=>m.state==='RUNNING').length;return{pendingEvents:pending,inFlight,pressure:pending>i.eventBudget*.8||inFlight>=i.maxInFlight?'HIGH':pending>i.eventBudget*.4?'MEDIUM':'LOW',admitNewWork:inFlight<i.maxInFlight&&pending<i.eventBudget};
}
export function buildCheckpointJournal(i:V59FabricInput){
  return{entries:i.missions.filter(m=>m.checkpoint).map(m=>({missionId:m.id,checkpoint:m.checkpoint,owner:m.owner??null})),persistenceClaim:false};
}
export function selectResilientProviderV59(i:V59FabricInput){
  const ranked=i.providers.filter(p=>p.healthy).map(p=>({id:p.id,score:p.successes*3-p.failures*8-p.cost-Math.min(p.latencyMs/1000,20)})).sort((a,b)=>b.score-a.score);return{selected:ranked[0]?.id??null,candidates:ranked};
}
export function buildProviderFailoverChain(i:V59FabricInput){
  return{chain:i.providers.filter(p=>p.healthy).sort((a,b)=>(b.successes-b.failures)-(a.successes-a.failures)||a.latencyMs-b.latencyMs).map(p=>p.id)};
}
export function buildControlCenterCommandContract(i:V59FabricInput){
  return{commands:i.commands.map(c=>({id:c.id,type:c.type,target:c.target,idempotencyKey:c.idempotencyKey,authorized:c.approved})),mutationExecuted:false};
}
export function buildControlCenterEventContract(i:V59FabricInput){
  return{eventTypes:uniq(i.events.map(e=>e.type)),sequenceRequired:true,idempotencyRequired:true,evidenceRequiredForConsequentialState:true};
}
export function evaluateRuntimeSlosV59(i:V59FabricInput){
  return{slos:i.slo.map(s=>({name:s.name,value:s.value,target:s.target,state:s.direction==='MAX'?(s.value<=s.target?'PASS':'BREACH'):(s.value>=s.target?'PASS':'BREACH')}))};
}
export function auditControlFabricConsistency(i:V59FabricInput){
  const missionIds=new Set(i.missions.map(m=>m.id));const workflowIds=new Set(i.workflows.map(w=>w.id));
  return{unknownMissionDeps:uniq(i.missions.flatMap(m=>m.dependsOn).filter(d=>!missionIds.has(d))),unknownWorkflows:i.missions.filter(m=>m.workflowId&&!workflowIds.has(m.workflowId)).map(m=>m.id),duplicateCommandKeys:i.commands.map(c=>c.idempotencyKey).filter((k,n,a)=>k&&a.indexOf(k)!==n),eventDuplicates:detectDuplicateEvents(i).duplicates.length,stateConflicts:detectStateVersionConflicts(i).conflicts.length};
}
export function buildControlFabricSnapshot(i:V59FabricInput){
  const consistency=auditControlFabricConsistency(i);return{eventBus:buildRuntimeEventBus(i),missions:coordinateDistributedMissions(i),tools:scoreToolReputation(i),cache:buildSemanticCachePlan(i),pressure:governBackpressure(i),provider:selectResilientProviderV59(i),slo:evaluateRuntimeSlosV59(i),consistency,status:Object.values(consistency).every(v=>Array.isArray(v)?v.length===0:v===0)?'READY':'BLOCKED',executionClaim:false,persistenceClaim:false};
}
