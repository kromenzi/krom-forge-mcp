import type { V61GridInput } from './v61-schema';
const uniq=<T>(xs:T[])=>[...new Set(xs)];

export function buildProjectDependencyIntelligence(i:V61GridInput){
  const incoming=new Map(i.projects.map(p=>[p.id,0]));
  for(const p of i.projects)for(const d of p.dependencies)incoming.set(d,(incoming.get(d)??0)+1);
  return{projects:i.projects.map(p=>({id:p.id,outDegree:p.dependencies.length,inDegree:incoming.get(p.id)??0,centrality:(incoming.get(p.id)??0)+p.dependencies.length})).sort((a,b)=>b.centrality-a.centrality)};
}
export function detectCriticalProjectPath(i:V61GridInput){
  const byId=new Map(i.projects.map(p=>[p.id,p]));const memo=new Map<string,string[]>();
  const walk=(id:string,seen=new Set<string>()):string[]=>{if(seen.has(id))return[id];if(memo.has(id))return memo.get(id)!;const p=byId.get(id);if(!p||!p.dependencies.length)return[id];const next=new Set(seen);next.add(id);const tails=p.dependencies.map(d=>walk(d,next));const best=tails.sort((a,b)=>b.length-a.length)[0]??[];const path=[...best,id];memo.set(id,path);return path};
  const paths=i.projects.map(p=>walk(p.id)).sort((a,b)=>b.length-a.length);return{criticalPath:paths[0]??[],length:paths[0]?.length??0};
}
export function prioritizeMissionsV61(i:V61GridInput){
  const projectPriority=new Map(i.projects.map(p=>[p.id,p.priority]));
  return{missions:i.missions.map(m=>({id:m.id,score:(projectPriority.get(m.projectId)??0)*10+m.priority*5+m.impact-m.risk*.5})).sort((a,b)=>b.score-a.score)};
}
export function buildEvidenceProvenanceGraphV61(i:V61GridInput){
  return{nodes:i.evidence.map(e=>({id:e.id,source:e.source,verified:e.verified,fresh:e.fresh,confidence:e.confidence})),edges:i.evidence.flatMap(e=>e.parentIds.map(p=>({from:p,to:e.id})))};
}
export function scoreEvidenceLineageV61(i:V61GridInput){
  return{evidence:i.evidence.map(e=>({id:e.id,score:(e.verified?50:0)+(e.fresh?25:0)+e.confidence*.25-Math.min(e.parentIds.length*2,10)})).sort((a,b)=>b.score-a.score)};
}
export function simulatePolicyEffectsV61(i:V61GridInput){
  const ordered=[...i.policies].sort((a,b)=>b.priority-a.priority);
  return{missions:i.missions.map(m=>{const p=ordered.find(x=>x.action==='*'||x.action===m.id);return{id:m.id,effect:p?.effect??'ALLOW',simulated:true,executed:false};})};
}
export function arbitrateReleasesV61(i:V61GridInput){
  const depIds=new Set(i.releases.map(r=>r.id));
  return{order:[...i.releases].sort((a,b)=>(b.readiness-b.risk)-(a.readiness-a.risk)).map(r=>({id:r.id,score:r.readiness-r.risk,missingDeps:r.dependsOn.filter(d=>!depIds.has(d))}))};
}
export function correlateAnomaliesV61(i:V61GridInput){
  const groups=new Map<string,typeof i.anomalies>();for(const a of i.anomalies){const k=`${a.projectId??'global'}|${a.signature||a.kind}`;const arr=groups.get(k)??[];arr.push(a);groups.set(k,arr)}
  return{clusters:[...groups].map(([key,items])=>({key,count:items.length,maxSeverity:items.some(x=>x.severity==='CRITICAL')?'CRITICAL':items.some(x=>x.severity==='HIGH')?'HIGH':items.some(x=>x.severity==='MEDIUM')?'MEDIUM':'LOW',ids:items.map(x=>x.id)})).sort((a,b)=>b.count-a.count)};
}
export function matchAgentSpecializationsV61(i:V61GridInput){
  return{missions:i.missions.map(m=>{const candidates=i.agents.filter(a=>a.available).map(a=>({id:a.id,coverage:a.skills.filter(s=>m.id.toLowerCase().includes(s.toLowerCase())||m.projectId.toLowerCase().includes(s.toLowerCase())).length,score:a.reliability-a.cost})).sort((a,b)=>b.coverage-a.coverage||b.score-a.score);return{missionId:m.id,agent:candidates[0]?.id??null,candidates};})};
}
export function optimizeToolPortfolioV61(i:V61GridInput){
  const ranked=i.tools.map(t=>({name:t.name,score:t.quality*.35+t.successRate*50-Math.min(t.latencyMs/1000,10)-t.cost})).sort((a,b)=>b.score-a.score);
  let spent=0;const selected=[] as typeof ranked;for(const r of ranked){const t=i.tools.find(x=>x.name===r.name)!;if(spent+t.cost<=i.budget){selected.push(r);spent+=t.cost}}
  return{selected,spent,budget:i.budget};
}
export function detectChangeClustersV61(i:V61GridInput){
  const byProject=new Map<string,string[]>();for(const m of i.missions){const a=byProject.get(m.projectId)??[];a.push(m.id);byProject.set(m.projectId,a)}
  return{clusters:[...byProject].map(([projectId,missions])=>({projectId,missions,count:missions.length})).sort((a,b)=>b.count-a.count)};
}
export function propagateRiskAcrossProjectsV61(i:V61GridInput){
  const base=new Map(i.projects.map(p=>[p.id,p.risk]));let changed=true;let guard=0;while(changed&&guard++<i.projects.length+2){changed=false;for(const p of i.projects){const inherited=Math.max(0,...p.dependencies.map(d=>(base.get(d)??0)*.5));const next=Math.min(100,Math.max(base.get(p.id)??0,inherited));if(next!==(base.get(p.id)??0)){base.set(p.id,next);changed=true}}}
  return{projects:[...base].map(([id,risk])=>({id,risk:Number(risk.toFixed(2))})).sort((a,b)=>b.risk-a.risk)};
}
export function buildImpactWeightedVerificationPlanV61(i:V61GridInput){
  const ev=new Set(i.evidence.filter(e=>e.verified&&e.fresh).map(e=>e.id));return{missions:[...i.missions].sort((a,b)=>(b.impact+b.risk)-(a.impact+a.risk)).map((m,n)=>({order:n+1,missionId:m.id,verificationDepth:m.impact+m.risk>=120?'FORENSIC':m.impact+m.risk>=70?'DEEP':'STANDARD',freshEvidenceAvailable:ev.size>0}))};
}
export function balanceProjectCapacityV61(i:V61GridInput){
  return{projects:i.projects.map(p=>{const load=i.missions.filter(m=>m.projectId===p.id&&m.state!=='DONE').length;return{id:p.id,capacity:p.capacity,load,utilization:p.capacity?Number((load/p.capacity).toFixed(2)):null,state:p.capacity&&load>p.capacity?'OVER_CAPACITY':'OK'}}).sort((a,b)=>(b.utilization??0)-(a.utilization??0))};
}
export function compileDecisionLedgerV61(i:V61GridInput){
  const valid=new Set(i.evidence.map(e=>e.id));return{decisions:i.decisions.map(d=>({id:d.id,projectId:d.projectId??null,kind:d.kind,rationale:d.rationale,evidenceRefs:d.evidenceRefs,missingEvidence:d.evidenceRefs.filter(e=>!valid.has(e))})),persistenceClaim:false};
}
export function auditDecisionEvidenceV61(i:V61GridInput){
  const ledger=compileDecisionLedgerV61(i).decisions;return{supported:ledger.filter(d=>d.evidenceRefs.length>0&&d.missingEvidence.length===0).map(d=>d.id),unsupported:ledger.filter(d=>!d.evidenceRefs.length||d.missingEvidence.length>0).map(d=>d.id)};
}
export function buildGridExecutiveSnapshotV61(i:V61GridInput){
  return{dependency:buildProjectDependencyIntelligence(i),criticalPath:detectCriticalProjectPath(i),missions:prioritizeMissionsV61(i),risk:propagateRiskAcrossProjectsV61(i),capacity:balanceProjectCapacityV61(i),releases:arbitrateReleasesV61(i),evidence:scoreEvidenceLineageV61(i)};
}
export function auditIntelligenceGridConsistency(i:V61GridInput){
  const projectIds=new Set(i.projects.map(p=>p.id));const missionIds=new Set(i.missions.map(m=>m.id));const evidenceIds=new Set(i.evidence.map(e=>e.id));const releaseIds=new Set(i.releases.map(r=>r.id));
  return{unknownProjectDeps:uniq(i.projects.flatMap(p=>p.dependencies).filter(d=>!projectIds.has(d))),unknownMissionProjects:i.missions.filter(m=>!projectIds.has(m.projectId)).map(m=>m.id),unknownMissionDeps:uniq(i.missions.flatMap(m=>m.dependsOn).filter(d=>!missionIds.has(d))),unknownEvidenceParents:uniq(i.evidence.flatMap(e=>e.parentIds).filter(d=>!evidenceIds.has(d))),unknownReleaseDeps:uniq(i.releases.flatMap(r=>r.dependsOn).filter(d=>!releaseIds.has(d)))};
}
export function buildIntelligenceGridSnapshotV61(i:V61GridInput){
  const consistency=auditIntelligenceGridConsistency(i);return{executive:buildGridExecutiveSnapshotV61(i),policy:simulatePolicyEffectsV61(i),anomalies:correlateAnomaliesV61(i),agents:matchAgentSpecializationsV61(i),tools:optimizeToolPortfolioV61(i),decisions:auditDecisionEvidenceV61(i),consistency,status:Object.values(consistency).every(v=>v.length===0)?'READY':'BLOCKED',executionClaim:false,persistenceClaim:false};
}
export function buildGridOperatorBriefV61(i:V61GridInput){
  const s=buildIntelligenceGridSnapshotV61(i);return{status:s.status,criticalPath:s.executive.criticalPath.criticalPath,topMission:s.executive.missions.missions[0]?.id??null,topRisk:s.executive.risk.projects[0]?.id??null,overCapacity:s.executive.capacity.projects.filter(p=>p.state==='OVER_CAPACITY').map(p=>p.id),evidenceBoundary:'Derived from supplied project state only; no execution or persistence inferred.'};
}
