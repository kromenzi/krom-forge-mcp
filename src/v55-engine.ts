import type { V55RuntimeInput } from './v55-schema';

const uniq=<T>(items:T[])=>[...new Set(items)];
const tokens=(s:string)=>s.toLowerCase().split(/[^a-z0-9_]+/).filter(Boolean);
const intentTokens=(i:V55RuntimeInput)=>new Set(tokens(i.intent));
const verifiedEvidence=(i:V55RuntimeInput)=>new Set(i.evidence.filter(e=>e.verified&&e.fresh).map(e=>e.id));

export function routeAdaptiveIntent(i:V55RuntimeInput){
  const it=intentTokens(i);
  const ranked=i.availableTools.filter(t=>t.enabled).map(t=>{
    const overlap=uniq([...tokens(t.name),...t.tags.map(x=>x.toLowerCase()),t.domain.toLowerCase()]).filter(x=>it.has(x)).length;
    const quality=t.successRate*40+t.evidenceQuality*0.3-(t.failureRate*25)-(Math.min(t.latencyMs,10000)/10000)*5-Math.min(t.cost,20);
    return{name:t.name,domain:t.domain,score:Number((overlap*20+quality).toFixed(2)),overlap};
  }).sort((a,b)=>b.score-a.score);
  return{intent:i.intent,selected:ranked.slice(0,i.mode==='FAST'?3:i.mode==='DEEP'?10:i.mode==='FORENSIC'?16:6),candidates:ranked.length};
}
export function loadDomainSkillPacks(i:V55RuntimeInput){
  const route=routeAdaptiveIntent(i);const domains=uniq([...i.requiredDomains,...route.selected.map(x=>x.domain)]);
  return{domains,packs:domains.map(domain=>({domain,tools:i.availableTools.filter(t=>t.enabled&&t.domain===domain).map(t=>t.name)}))};
}
export function rankToolQuality(i:V55RuntimeInput){
  return{ranking:i.availableTools.filter(t=>t.enabled).map(t=>({name:t.name,score:Number((t.successRate*35+t.evidenceQuality*0.35-(t.failureRate*30)-Math.min(t.cost,20)-(Math.min(t.latencyMs,10000)/1000)).toFixed(2))})).sort((a,b)=>b.score-a.score)};
}
export function compressCapabilities(i:V55RuntimeInput){
  const byDomain=new Map<string,string[]>();for(const t of i.availableTools.filter(t=>t.enabled)){const a=byDomain.get(t.domain)??[];a.push(t.name);byDomain.set(t.domain,a)}
  return{packs:[...byDomain].map(([domain,names])=>({domain,count:names.length,representatives:names.slice(0,5)})),total:i.availableTools.filter(t=>t.enabled).length};
}
export function buildAdaptiveTaskGraph(i:V55RuntimeInput){
  return{nodes:i.actions.map(a=>({id:a.id,kind:a.kind,dependsOn:a.dependsOn})),edges:i.actions.flatMap(a=>a.dependsOn.map(d=>({from:d,to:a.id}))),roots:i.actions.filter(a=>!a.dependsOn.length).map(a=>a.id)};
}
export function planParallelExecution(i:V55RuntimeInput){
  const done=new Set<string>(),waves:Array<{wave:number;actions:string[]}>=[];let remaining=[...i.actions];
  for(let w=1;remaining.length&&w<=i.actions.length+1;w++){const ready=remaining.filter(a=>a.dependsOn.every(d=>done.has(d)));if(!ready.length)break;waves.push({wave:w,actions:ready.map(a=>a.id)});ready.forEach(a=>done.add(a.id));remaining=remaining.filter(a=>!done.has(a.id))}
  return{waves,blocked:remaining.map(a=>a.id)};
}
export function buildAgentCommandCenter(i:V55RuntimeInput){
  return{agents:[...i.agents].sort((a,b)=>Number(a.busy)-Number(b.busy)||b.reliability-a.reliability),available:i.agents.filter(a=>!a.busy).map(a=>a.id),busy:i.agents.filter(a=>a.busy).map(a=>a.id)};
}
export function detectAgentContradictions(i:V55RuntimeInput){
  const claims=new Map<string,string[]>();for(const a of i.agents)for(const c of a.claims){const k=c.replace(/^NOT:/,'');const arr=claims.get(k)??[];arr.push(c.startsWith('NOT:')?`-${a.id}`:`+${a.id}`);claims.set(k,arr)}
  return{contradictions:[...claims].filter(([,v])=>v.some(x=>x.startsWith('+'))&&v.some(x=>x.startsWith('-'))).map(([claim,agents])=>({claim,agents}))};
}
export function scoreEvidenceTrust(i:V55RuntimeInput){
  return{evidence:i.evidence.map(e=>({id:e.id,score:Math.max(0,Math.min(100,e.confidence+(e.verified?20:-20)+(e.fresh?10:-30)-Math.min(e.dependsOn.length*2,10)))})).sort((a,b)=>b.score-a.score)};
}
export function buildAutomaticReverification(i:V55RuntimeInput){
  const stale=new Set(i.evidence.filter(e=>!e.fresh||!e.verified).map(e=>e.id));return{actions:i.actions.filter(a=>a.evidenceRefs.some(r=>stale.has(r))||!a.evidenceRefs.length).map(a=>({actionId:a.id,reason:!a.evidenceRefs.length?'NO_EVIDENCE':'STALE_OR_UNVERIFIED_EVIDENCE'}))};
}
export function simulateExecutionDryRun(i:V55RuntimeInput){
  const ev=verifiedEvidence(i);return{steps:i.actions.map(a=>({id:a.id,allowed:a.evidenceRefs.every(r=>ev.has(r))&&(!a.requiresApproval||a.approved),risk:a.risk,cost:a.cost,reversible:a.reversible,mutationExecuted:false})),executionClaim:false};
}
export function evaluateMutationRisk(i:V55RuntimeInput){
  const risky=i.actions.filter(a=>!a.reversible||a.risk>=70||a.requiresApproval);return{status:risky.some(a=>a.requiresApproval&&!a.approved)?'BLOCKED':risky.length?'REVIEW':'PASS',riskyActions:risky.map(a=>a.id)};
}
export function createMissionCheckpointV55(i:V55RuntimeInput){
  const completed=i.actions.filter(a=>a.risk<50).map(a=>a.id);return{checkpoint:{id:`cp-${completed.length}-${i.evidence.length}`,completedActionIds:completed,evidenceRefs:i.evidence.filter(e=>e.verified).map(e=>e.id),portable:true}};
}
export function resumeMissionCheckpointV55(i:V55RuntimeInput){
  const completed=new Set(i.checkpoint?.completedActionIds??[]);return{remaining:i.actions.filter(a=>!completed.has(a.id)).map(a=>a.id),checkpoint:i.checkpoint??null};
}
export function assessChangeImpactV2(i:V55RuntimeInput){
  const changed=new Set(i.actions.map(a=>a.id));const impacted=new Set(changed);let progress=true;while(progress){progress=false;for(const a of i.actions)if(a.dependsOn.some(d=>impacted.has(d))&&!impacted.has(a.id)){impacted.add(a.id);progress=true}}
  return{impacted:[...impacted],highRisk:i.actions.filter(a=>impacted.has(a.id)&&a.risk>=70).map(a=>a.id)};
}
export function simulateReleaseTwinV2(i:V55RuntimeInput){
  const dry=simulateExecutionDryRun(i);return{twin:{plannedSteps:dry.steps.length,blockedSteps:dry.steps.filter(s=>!s.allowed).map(s=>s.id),predicted:false,observed:false},warning:'Digital twin output is a bounded simulation, not production evidence.'};
}
export function buildIncidentCommander(i:V55RuntimeInput){
  const severity=i.signals.some(s=>s.verified&&s.severity==='CRITICAL')?'CRITICAL':i.signals.some(s=>s.verified&&s.severity==='HIGH')?'HIGH':'NORMAL';
  return{severity,verifiedSignals:i.signals.filter(s=>s.verified).map(s=>s.id),containment:i.actions.filter(a=>/contain|rollback|isolate/i.test(a.kind)).map(a=>a.id)};
}
export function evaluateIncidentAction(i:V55RuntimeInput){
  const cmd=buildIncidentCommander(i);const dry=simulateExecutionDryRun(i);return{severity:cmd.severity,next:dry.steps.filter(s=>s.allowed).sort((a,b)=>a.risk-b.risk)[0]?.id??null,blocked:dry.steps.filter(s=>!s.allowed).map(s=>s.id)};
}
export function governExecutionCost(i:V55RuntimeInput){
  const ranking=rankToolQuality(i).ranking;let spent=0;const selected:string[]=[];for(const r of ranking){const t=i.availableTools.find(x=>x.name===r.name)!;if(spent+t.cost<=i.budget){selected.push(t.name);spent+=t.cost}}
  return{budget:i.budget,spent,selected,excluded:ranking.map(r=>r.name).filter(n=>!selected.includes(n))};
}
export function selectAdaptiveDepth(i:V55RuntimeInput){
  const maxRisk=Math.max(0,...i.actions.map(a=>a.risk));const critical=i.signals.some(s=>s.verified&&s.severity==='CRITICAL');const mode=critical||maxRisk>=85?'FORENSIC':maxRisk>=60?'DEEP':maxRisk>=30?'STANDARD':'FAST';return{recommended:mode,requested:i.mode};
}
export function detectDecisionContradictions(i:V55RuntimeInput){
  const signalStates=new Map<string,Set<string>>();for(const s of i.signals){const a=signalStates.get(s.id)??new Set();a.add(s.state);signalStates.set(s.id,a)}return{contradictions:[...signalStates].filter(([,v])=>v.size>1).map(([id,states])=>({id,states:[...states]}))};
}
export function reconcileDecisionContradictions(i:V55RuntimeInput){
  const c=detectDecisionContradictions(i);return{status:c.contradictions.length?'REQUIRES_EVIDENCE':'CLEAR',actions:c.contradictions.map(x=>({signalId:x.id,action:'COLLECT_FRESH_AUTHORITATIVE_EVIDENCE'}))};
}
export function selectExecutionProvider(i:V55RuntimeInput){
  const required=uniq(i.requiredDomains);const candidates=i.providers.filter(p=>p.available&&required.every(r=>p.capabilities.includes(r))).map(p=>({...p,score:p.quality-p.cost-(Math.min(p.latencyMs,10000)/1000)+(p.local?3:0)})).sort((a,b)=>b.score-a.score);return{selected:candidates[0]?.id??null,candidates:candidates.map(p=>({id:p.id,score:Number(p.score.toFixed(2))}))};
}
export function buildPluginAdapterPlan(i:V55RuntimeInput){
  return{providers:i.providers.map(p=>({providerId:p.id,capabilities:p.capabilities,adapterContract:['health','capabilities','execute','evidence','timeout','error-normalization'],enabled:p.available}))};
}
export function buildMissionConsoleSnapshot(i:V55RuntimeInput){
  return{intent:i.intent,depth:selectAdaptiveDepth(i),tools:routeAdaptiveIntent(i).selected,agents:buildAgentCommandCenter(i),evidence:scoreEvidenceTrust(i),cost:governExecutionCost(i),incident:buildIncidentCommander(i)};
}
export function learnFromOutcome(i:V55RuntimeInput){
  const previous=i.previousState as Record<string,unknown>;return{learningRecord:{intent:i.intent,selectedTools:routeAdaptiveIntent(i).selected.map(x=>x.name),verifiedEvidence:i.evidence.filter(e=>e.verified).length,previousStatePresent:Object.keys(previous).length>0},automaticMutation:false};
}
export function buildOnDemandToolSet(i:V55RuntimeInput){
  const packs=loadDomainSkillPacks(i);const route=routeAdaptiveIntent(i);const selected=uniq([...route.selected.map(x=>x.name),...packs.packs.flatMap(p=>p.tools.slice(0,8))]);return{selected,count:selected.length,totalAvailable:i.availableTools.length,reductionPercent:i.availableTools.length?Math.round((1-selected.length/i.availableTools.length)*100):0};
}
export function evaluateRoutingEfficiency(i:V55RuntimeInput){
  const od=buildOnDemandToolSet(i);const top=routeAdaptiveIntent(i).selected;return{loaded:od.count,total:od.totalAvailable,reductionPercent:od.reductionPercent,topScores:top.map(x=>({name:x.name,score:x.score})),efficient:od.totalAvailable===0||od.count<=Math.max(20,Math.ceil(od.totalAvailable*0.25))};
}
