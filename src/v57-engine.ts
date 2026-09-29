import type { V57BrainInput } from './v57-schema';

const uniq=<T>(xs:T[])=>[...new Set(xs)];
const words=(s:string)=>s.toLowerCase().split(/[^a-z0-9_]+/).filter(Boolean);
const objectiveWords=(i:V57BrainInput)=>new Set(words(i.objective));

export function buildProjectMemoryIndex(i:V57BrainInput){
  return{projects:i.projects.map(p=>({projectId:p.id,records:i.memories.filter(m=>m.projectId===p.id).length,verified:i.memories.filter(m=>m.projectId===p.id&&m.verified).length,fresh:i.memories.filter(m=>m.projectId===p.id&&m.fresh).length}))};
}
export function retrieveProjectMemory(i:V57BrainInput){
  const q=objectiveWords(i);
  const ranked=i.memories.map(m=>({id:m.id,projectId:m.projectId,score:words([m.text,...m.tags].join(' ')).filter(w=>q.has(w)).length+(m.verified?2:0)+(m.fresh?1:0),text:m.text})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
  return{results:ranked.slice(0,i.contextBudget),sourceCount:i.memories.length};
}
export function compactLongHorizonMemory(i:V57BrainInput){
  const grouped=new Map<string,typeof i.memories>();
  for(const m of i.memories){const key=`${m.projectId}:${m.kind}`;const arr=grouped.get(key)??[];arr.push(m);grouped.set(key,arr)}
  return{summaries:[...grouped].map(([key,records])=>({key,count:records.length,verified:records.filter(r=>r.verified).length,latest:[...records].sort((a,b)=>b.sequence-a.sequence)[0]?.text??''})),persistenceClaim:false};
}
export function scoreKnowledgeFreshness(i:V57BrainInput){
  return{knowledge:i.knowledge.map(k=>({id:k.id,projectId:k.projectId,score:(k.verified?60:20)+(k.fresh?30:0)-Math.min(k.dependsOn.length*3,15)})).sort((a,b)=>b.score-a.score)};
}
export function buildCrossProjectDependencyGraph(i:V57BrainInput){
  return{nodes:i.projects.map(p=>({id:p.id,name:p.name,status:p.status})),edges:i.projects.flatMap(p=>p.dependencies.map(d=>({from:d,to:p.id}))),orphanDependencies:uniq(i.projects.flatMap(p=>p.dependencies).filter(d=>!i.projects.some(x=>x.id===d)))};
}
export function detectCrossProjectConflicts(i:V57BrainInput){
  const conflicts:Array<{projectA:string;projectB:string;constraint:string}>=[];for(let a=0;a<i.projects.length;a++)for(let b=a+1;b<i.projects.length;b++){for(const c of i.projects[a].constraints)if(i.projects[b].constraints.includes(c))conflicts.push({projectA:i.projects[a].id,projectB:i.projects[b].id,constraint:c})}
  return{conflicts};
}
export function scheduleMissions(i:V57BrainInput){
  const done=new Set(i.missions.filter(m=>m.state==='DONE').map(m=>m.id));const schedulable=i.missions.filter(m=>m.state!=='DONE'&&m.dependsOn.every(d=>done.has(d))&&(!m.requiresApproval||m.approved)).sort((a,b)=>b.priority-a.priority||a.dueOrder-b.dueOrder||a.id.localeCompare(b.id));
  return{next:schedulable[0]?.id??null,queue:schedulable.map(m=>m.id),blocked:i.missions.filter(m=>m.state!=='DONE'&&!schedulable.includes(m)).map(m=>m.id)};
}
export function buildMissionContinuationPlan(i:V57BrainInput){
  const s=scheduleMissions(i);return{resumeOrder:s.queue,blocked:s.blocked,checkpointRequired:true,executionClaim:false};
}
export function evaluateToolLearning(i:V57BrainInput){
  const byTool=new Map<string,typeof i.evals>();for(const e of i.evals){const arr=byTool.get(e.toolName)??[];arr.push(e);byTool.set(e.toolName,arr)}
  return{tools:[...byTool].map(([toolName,ev])=>({toolName,observations:ev.length,verifiedObservations:ev.filter(x=>x.evidenceVerified).length,meanScore:ev.length?Math.round(ev.reduce((s,x)=>s+x.score,0)/ev.length):0,passRate:ev.length?Number((ev.filter(x=>x.passed).length/ev.length).toFixed(3)):0}))};
}
export function rankAdaptiveToolPortfolio(i:V57BrainInput){
  const learned=new Map(evaluateToolLearning(i).tools.map(x=>[x.toolName,x]));
  const ranked=i.tools.filter(t=>t.enabled).map(t=>{const l=learned.get(t.name);const score=(l?.meanScore??t.evalScore)*.35+t.evidenceQuality*.25+t.successRate*30-Math.min(t.cost,20)-Math.min(t.latencyMs/1000,10);return{name:t.name,domain:t.domain,score:Number(score.toFixed(2))}}).sort((a,b)=>b.score-a.score);
  let spent=0;const selected=[] as typeof ranked;for(const r of ranked){const t=i.tools.find(x=>x.name===r.name)!;if(spent+t.cost<=i.portfolioBudget){selected.push(r);spent+=t.cost}}
  return{selected,spent,budget:i.portfolioBudget};
}
export function buildEvalDrivenToolLearningPlan(i:V57BrainInput){
  const observed=new Set(i.evals.map(e=>e.toolName));return{needsEvaluation:i.tools.filter(t=>t.enabled&&!observed.has(t.name)).map(t=>t.name),lowConfidence:evaluateToolLearning(i).tools.filter(t=>t.verifiedObservations===0||t.meanScore<70).map(t=>t.toolName),automaticWeightMutation:false};
}
export function synthesizeSkillCandidate(i:V57BrainInput){
  const relevant=rankAdaptiveToolPortfolio(i).selected.slice(0,5);return{candidate:{id:'skill-candidate',objective:i.objective,steps:relevant.map((t,n)=>`${n+1}. ${t.name}`),evidenceRequirements:['host evidence for every consequential claim'],status:'ADVISORY'},automaticRegistration:false};
}
export function validateSkillCandidate(i:V57BrainInput){
  const c=synthesizeSkillCandidate(i).candidate;return{valid:c.steps.length>0&&c.evidenceRequirements.length>0,requiresHumanReview:true,requiresEvalBeforeRegistration:true};
}
export function buildPolicyAwareOrchestration(i:V57BrainInput){
  const policies=[...i.policies].sort((a,b)=>b.priority-a.priority);
  return{missions:i.missions.map(m=>{const p=policies.find(x=>x.action==='*'||x.action===m.id);const allowed=!p||p.effect==='ALLOW'||(p.effect==='REQUIRE_APPROVAL'&&m.approved);return{id:m.id,policy:p?.id??null,effect:p?.effect??'ALLOW',allowed};})};
}
export function buildProjectContextPackV57(i:V57BrainInput){
  const memory=retrieveProjectMemory(i).results;const knowledge=scoreKnowledgeFreshness(i).knowledge.filter(k=>k.score>=60).slice(0,i.contextBudget);
  return{objective:i.objective,projects:i.projects.slice(0,i.contextBudget).map(p=>p.id),memory,knowledge,tokenBudgetProxy:i.contextBudget};
}
export function reasonAcrossProjects(i:V57BrainInput){
  const graph=buildCrossProjectDependencyGraph(i);const conflicts=detectCrossProjectConflicts(i);return{graph,conflicts,attention:uniq([...graph.edges.map(e=>e.to),...conflicts.conflicts.flatMap(c=>[c.projectA,c.projectB])])};
}
export function buildKnowledgeRefreshPlanV57(i:V57BrainInput){
  const stale=i.knowledge.filter(k=>!k.verified||!k.fresh);return{refresh:stale.map(k=>({knowledgeId:k.id,projectId:k.projectId,reason:!k.verified?'UNVERIFIED':'STALE'})),automaticMutation:false};
}
export function buildControlCenterState(i:V57BrainInput){
  return{objective:i.objective,memory:buildProjectMemoryIndex(i),schedule:scheduleMissions(i),portfolio:rankAdaptiveToolPortfolio(i),projects:reasonAcrossProjects(i),freshness:scoreKnowledgeFreshness(i),policy:buildPolicyAwareOrchestration(i)};
}
export function auditBrainConsistency(i:V57BrainInput){
  const projectIds=new Set(i.projects.map(p=>p.id));const missionIds=new Set(i.missions.map(m=>m.id));
  return{unknownMemoryProjects:i.memories.filter(m=>!projectIds.has(m.projectId)).map(m=>m.id),unknownKnowledgeProjects:i.knowledge.filter(k=>!projectIds.has(k.projectId)).map(k=>k.id),unknownMissionDependencies:uniq(i.missions.flatMap(m=>m.dependsOn).filter(d=>!missionIds.has(d))),duplicateProjectIds:i.projects.map(p=>p.id).filter((x,n,a)=>a.indexOf(x)!==n),duplicateMissionIds:i.missions.map(m=>m.id).filter((x,n,a)=>a.indexOf(x)!==n)};
}
export function buildAutonomousBrainSnapshot(i:V57BrainInput){
  const consistency=auditBrainConsistency(i);return{control:buildControlCenterState(i),continuation:buildMissionContinuationPlan(i),learning:buildEvalDrivenToolLearningPlan(i),skill:synthesizeSkillCandidate(i),consistency,status:Object.values(consistency).every(v=>v.length===0)?'READY':'BLOCKED',executionClaim:false,persistenceClaim:false};
}
