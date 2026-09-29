import type { V58OsInput } from './v58-schema';

const uniq=<T>(xs:T[])=>[...new Set(xs)];

export function acquireMissionLease(i:V58OsInput){
  return{missions:i.missions.map(m=>{
    const active=m.leaseOwner&&m.leaseUntil!==undefined&&m.leaseUntil>i.nowEpoch;
    return{id:m.id,leaseState:active?'HELD':'AVAILABLE',owner:active?m.leaseOwner:null,acquirable:!active&&m.state!=='DONE'};
  })};
}
export function detectMissionLeaseConflicts(i:V58OsInput){
  const keys=new Map<string,string[]>();for(const m of i.missions){if(!m.idempotencyKey)continue;const a=keys.get(m.idempotencyKey)??[];a.push(m.id);keys.set(m.idempotencyKey,a)}
  return{conflicts:[...keys].filter(([,ids])=>ids.length>1).map(([key,ids])=>({key,ids}))};
}
export function buildIdempotentMissionSchedule(i:V58OsInput){
  const done=new Set(i.missions.filter(m=>m.state==='DONE').map(m=>m.id));
  const leased=new Set(i.missions.filter(m=>m.leaseOwner&&m.leaseUntil!==undefined&&m.leaseUntil>i.nowEpoch).map(m=>m.id));
  const eligible=i.missions.filter(m=>m.state!=='DONE'&&!leased.has(m.id)&&m.dependsOn.every(d=>done.has(d))).sort((a,b)=>b.priority-a.priority||a.risk-b.risk||a.id.localeCompare(b.id));
  const seen=new Set<string>();const queue=[] as typeof eligible;
  for(const m of eligible){const key=m.idempotencyKey??m.id;if(seen.has(key))continue;seen.add(key);queue.push(m);if(queue.length>=i.maxConcurrent)break}
  return{queue:queue.map(m=>m.id),blocked:i.missions.filter(m=>m.state!=='DONE'&&!queue.includes(m)).map(m=>m.id),maxConcurrent:i.maxConcurrent};
}
export function buildUnifiedKnowledgeGraphV58(i:V58OsInput){
  return{nodes:i.knowledge.map(k=>({id:k.id,projectId:k.projectId,subject:k.subject,value:k.value,verified:k.verified,fresh:k.fresh,confidence:k.confidence})),projectEdges:i.projects.flatMap(p=>p.dependencies.map(d=>({from:d,to:p.id,type:'PROJECT_DEPENDENCY'})))};
}
export function detectKnowledgeContradictionsV58(i:V58OsInput){
  const groups=new Map<string,typeof i.knowledge>();for(const k of i.knowledge){const key=`${k.projectId}|${k.subject}`;const a=groups.get(key)??[];a.push(k);groups.set(key,a)}
  return{contradictions:[...groups].filter(([,records])=>uniq(records.filter(r=>r.verified&&r.fresh).map(r=>r.value)).length>1).map(([key,records])=>({key,values:uniq(records.filter(r=>r.verified&&r.fresh).map(r=>r.value)),ids:records.map(r=>r.id)}))};
}
export function formDynamicAgentTeams(i:V58OsInput){
  return{teams:i.projects.map(p=>{const needed=uniq(i.toolDemand.filter(d=>d.domain===p.id||d.domain==='general').map(d=>d.capability));const ranked=i.agents.filter(a=>!a.busy).map(a=>({id:a.id,coverage:needed.filter(n=>a.skills.includes(n)).length,score:a.reliability-a.cost})).sort((a,b)=>b.coverage-a.coverage||b.score-a.score);return{projectId:p.id,agents:ranked.slice(0,Math.max(1,Math.min(3,ranked.length))).map(a=>a.id),needed};})};
}
export function matchToolMarketplace(i:V58OsInput){
  return{matches:i.toolDemand.map(d=>{const candidates=i.toolOffers.filter(o=>o.available&&o.cost<=d.maxCost&&o.quality>=d.minQuality&&(o.capabilities.includes(d.capability)||o.domains.includes(d.domain))).map(o=>({tool:o.tool,score:o.quality-o.cost})).sort((a,b)=>b.score-a.score);return{demandId:d.id,selected:candidates[0]?.tool??null,candidates};})};
}
export function auditToolMarketCoverage(i:V58OsInput){
  const m=matchToolMarketplace(i).matches;return{covered:m.filter(x=>x.selected).map(x=>x.demandId),uncovered:m.filter(x=>!x.selected).map(x=>x.demandId),coverage:i.toolDemand.length?Math.round(m.filter(x=>x.selected).length/i.toolDemand.length*100):100};
}
export function runPredictivePremortem(i:V58OsInput){
  const projectRisk=new Map(i.projects.map(p=>[p.id,0]));for(const s of i.signals.filter(s=>s.verified)){const w=s.severity==='CRITICAL'?40:s.severity==='HIGH'?25:s.severity==='MEDIUM'?10:5;if(s.projectId)projectRisk.set(s.projectId,(projectRisk.get(s.projectId)??0)+w)}
  for(const m of i.missions)projectRisk.set(m.projectId,(projectRisk.get(m.projectId)??0)+Math.round(m.risk/4));
  return{projects:[...projectRisk].map(([projectId,risk])=>({projectId,risk:Math.min(100,risk),predictionClaim:false})).sort((a,b)=>b.risk-a.risk),warning:'Pre-mortem is scenario analysis, not a prediction of future events.'};
}
export function buildFailurePreventionQueueV58(i:V58OsInput){
  return{queue:runPredictivePremortem(i).projects.filter(p=>p.risk>=25).map((p,n)=>({order:n+1,projectId:p.projectId,risk:p.risk,action:'COLLECT_EVIDENCE_AND_HARDEN'}))};
}
export function governExecutionEconomy(i:V58OsInput){
  const missions=[...i.missions].filter(m=>m.state!=='DONE').sort((a,b)=>(b.priority-b.risk/10)-(a.priority-a.risk/10));
  let spent=0;const selected:string[]=[];for(const m of missions){if(spent+m.cost<=i.budget){selected.push(m.id);spent+=m.cost}}
  return{budget:i.budget,spent,selected,deferred:missions.map(m=>m.id).filter(id=>!selected.includes(id))};
}
export function allocateProjectBudgets(i:V58OsInput){
  const totalPriority=i.projects.reduce((s,p)=>s+Math.max(0,p.priority),0)||i.projects.length||1;
  return{allocations:i.projects.map(p=>({projectId:p.id,allocated:Number((i.budget*(Math.max(0,p.priority)||1)/totalPriority).toFixed(2))}))};
}
export function buildPortfolioMissionSchedule(i:V58OsInput){
  const projectDeps=new Map(i.projects.map(p=>[p.id,p.dependencies]));
  return{projects:[...i.projects].sort((a,b)=>b.priority-a.priority).map(p=>({projectId:p.id,blockedBy:(projectDeps.get(p.id)??[]).filter(d=>i.projects.some(x=>x.id===d)),missions:i.missions.filter(m=>m.projectId===p.id).map(m=>m.id)}))};
}
export function detectPortfolioDeadlocksV58(i:V58OsInput){
  const deps=new Map(i.projects.map(p=>[p.id,p.dependencies]));const cycles:string[][]=[];
  const visit=(start:string,node:string,path:string[])=>{for(const d of deps.get(node)??[]){if(d===start){cycles.push([...path,node,d]);continue}if(path.includes(d))continue;visit(start,d,[...path,node])}};
  for(const p of i.projects)visit(p.id,p.id,[]);return{cycles:cycles.slice(0,20)};
}
export function evaluateOsPolicyState(i:V58OsInput){
  const lease=detectMissionLeaseConflicts(i);const knowledge=detectKnowledgeContradictionsV58(i);const deadlocks=detectPortfolioDeadlocksV58(i);
  return{status:lease.conflicts.length||knowledge.contradictions.length||deadlocks.cycles.length?'BLOCKED':'READY',leaseConflicts:lease.conflicts.length,knowledgeContradictions:knowledge.contradictions.length,portfolioDeadlocks:deadlocks.cycles.length};
}
export function buildControlCenterBackendV58(i:V58OsInput){
  return{scheduler:buildIdempotentMissionSchedule(i),leases:acquireMissionLease(i),knowledge:buildUnifiedKnowledgeGraphV58(i),teams:formDynamicAgentTeams(i),market:matchToolMarketplace(i),premortem:runPredictivePremortem(i),economy:governExecutionEconomy(i),portfolio:buildPortfolioMissionSchedule(i),policy:evaluateOsPolicyState(i),executionClaim:false,persistenceClaim:false};
}
export function buildMissionLeaseRenewalPlan(i:V58OsInput){
  return{renew:i.missions.filter(m=>m.leaseOwner&&m.leaseUntil!==undefined&&m.leaseUntil<=i.nowEpoch+60&&m.state==='RUNNING').map(m=>({missionId:m.id,owner:m.leaseOwner,action:'RENEW_BY_HOST'})),automaticPersistence:false};
}
export function validateMissionContinuationV58(i:V58OsInput){
  const conflicts=detectMissionLeaseConflicts(i).conflicts;const q=buildIdempotentMissionSchedule(i);return{valid:conflicts.length===0,queue:q.queue,conflicts,requiresHostLeaseWrite:q.queue.length>0};
}
export function buildToolSupplyDemandMap(i:V58OsInput){
  return{offers:i.toolOffers.map(o=>({tool:o.tool,capabilities:o.capabilities,domains:o.domains,available:o.available})),demand:i.toolDemand,matches:matchToolMarketplace(i).matches};
}
export function auditOperatingSystemConsistency(i:V58OsInput){
  const projectIds=new Set(i.projects.map(p=>p.id));const missionIds=new Set(i.missions.map(m=>m.id));
  return{unknownMissionProjects:i.missions.filter(m=>!projectIds.has(m.projectId)).map(m=>m.id),unknownMissionDeps:uniq(i.missions.flatMap(m=>m.dependsOn).filter(d=>!missionIds.has(d))),unknownKnowledgeProjects:i.knowledge.filter(k=>!projectIds.has(k.projectId)).map(k=>k.id),duplicateMissionIds:i.missions.map(m=>m.id).filter((x,n,a)=>a.indexOf(x)!==n),duplicateProjectIds:i.projects.map(p=>p.id).filter((x,n,a)=>a.indexOf(x)!==n)};
}
export function buildEngineeringOsSnapshot(i:V58OsInput){
  const consistency=auditOperatingSystemConsistency(i);return{control:buildControlCenterBackendV58(i),consistency,status:Object.values(consistency).every(v=>v.length===0)&&evaluateOsPolicyState(i).status==='READY'?'READY':'BLOCKED',executionClaim:false,persistenceClaim:false,predictionClaim:false};
}
