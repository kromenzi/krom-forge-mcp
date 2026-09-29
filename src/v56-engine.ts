import type { V56RuntimeInput } from './v56-schema';

const uniq=<T>(items:T[])=>[...new Set(items)];
const stable=(value:unknown)=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const words=(s:string)=>new Set(s.toLowerCase().split(/[^a-z0-9_]+/).filter(Boolean));
const verifiedFresh=(i:V56RuntimeInput)=>new Set(i.evidence.filter(e=>e.verified&&e.fresh).map(e=>e.id));

export function buildSemanticMissionMemory(i:V56RuntimeInput){
  const ordered=[...i.memory].sort((a,b)=>a.sequence-b.sequence||a.id.localeCompare(b.id));
  return{missionId:i.missionId,records:ordered,verifiedRecords:ordered.filter(r=>r.verified).map(r=>r.id),portable:true,persistenceClaim:false};
}
export function compactMissionMemory(i:V56RuntimeInput){
  const byKind=new Map<string,typeof i.memory>();for(const r of i.memory){const a=byKind.get(r.kind)??[];a.push(r);byKind.set(r.kind,a)}
  return{summary:[...byKind].map(([kind,records])=>({kind,count:records.length,verified:records.filter(r=>r.verified).length,latest:[...records].sort((a,b)=>b.sequence-a.sequence)[0]?.content??''})),sourceCount:i.memory.length};
}
export function replayMissionDeterministically(i:V56RuntimeInput){
  const events=[...i.memory].sort((a,b)=>a.sequence-b.sequence||a.id.localeCompare(b.id)).map(r=>({id:r.id,kind:r.kind,content:r.content,evidenceRefs:[...r.evidenceRefs].sort()}));
  return{missionId:i.missionId,events,replayFingerprint:stable(events),executionClaim:false};
}
export function compareMissionReplays(i:V56RuntimeInput){
  const current=replayMissionDeterministically(i);const previous=typeof i.memory[0]?.content==='string'?stable(i.previousPolicies):stable(i.previousPolicies);
  return{currentFingerprint:current.replayFingerprint,referenceFingerprint:previous,equal:current.replayFingerprint===previous};
}
export function classifyFailureForReplan(i:V56RuntimeInput){
  return{failures:i.failures.map(f=>({id:f.id,class:f.class||'UNKNOWN',strategy:!f.retryable?'ESCALATE':/auth|permission|401|403/i.test(f.signature)?'REAUTHORIZE':/timeout|rate|429/i.test(f.signature)?'FAILOVER_OR_BACKOFF':'REPLAN_AND_VERIFY'}))};
}
export function buildSelfHealingReplan(i:V56RuntimeInput){
  const classes=classifyFailureForReplan(i).failures;return{plan:classes.map((f,n)=>({order:n+1,failureId:f.id,strategy:f.strategy,requiresFreshEvidence:true,automaticMutation:false})),blocked:classes.some(f=>f.strategy==='ESCALATE')};
}
export function enforceRetryBudget(i:V56RuntimeInput){
  const spent=i.attempts.reduce((s,a)=>s+a.cost,0);return{attempts:i.attempts.length,spent,remainingAttempts:Math.max(0,i.retryBudget.maxAttempts-i.attempts.length),remainingCost:Math.max(0,i.retryBudget.maxCost-spent),allowed:i.attempts.length<i.retryBudget.maxAttempts&&spent<i.retryBudget.maxCost};
}
export function detectRetryLoop(i:V56RuntimeInput){
  const counts=new Map<string,number>();for(const a of i.attempts){const k=`${a.actionId}|${a.signature}|${a.providerId??''}|${a.toolName??''}`;counts.set(k,(counts.get(k)??0)+1)}
  return{loops:[...counts].filter(([,n])=>n>=2).map(([signature,count])=>({signature,count})),loopDetected:[...counts.values()].some(n=>n>=2)};
}
export function updateProviderCircuitBreaker(i:V56RuntimeInput){
  return{providers:i.providers.map(p=>{const total=p.failures+p.successes;const rate=total?p.failures/total:0;const circuit=p.failures>=3&&rate>=0.5?'OPEN':p.circuit==='OPEN'&&p.successes>0?'HALF_OPEN':p.circuit;return{id:p.id,circuit,failureRate:Number(rate.toFixed(3))}})};
}
export function selectFailoverProvider(i:V56RuntimeInput){
  const states=new Map(updateProviderCircuitBreaker(i).providers.map(p=>[p.id,p.circuit]));const ranked=i.providers.filter(p=>p.available&&states.get(p.id)!=='OPEN').map(p=>({id:p.id,score:p.quality-p.cost-(Math.min(p.latencyMs,10000)/1000)-(p.failures*5)+(p.successes*2)})).sort((a,b)=>b.score-a.score);
  return{selected:ranked[0]?.id??null,candidates:ranked.map(x=>({id:x.id,score:Number(x.score.toFixed(2))))};
}
export function buildToolShadowEvaluation(i:V56RuntimeInput){
  return{shadowPairs:i.tools.filter(t=>!t.deprecated).slice(0,10).map((t,idx)=>({primary:t.name,shadow:i.tools.filter(x=>!x.deprecated&&x.domain===t.domain&&x.name!==t.name)[0]?.name??null,executeShadow:false,index:idx}))};
}
export function evaluateToolCanary(i:V56RuntimeInput){
  return{tools:i.tools.map(t=>({name:t.name,eligible:!t.deprecated&&t.successRate>=0.8,successRate:t.successRate})),promotionRequiresObservedResults:true};
}
export function detectSemanticToolOverlap(i:V56RuntimeInput){
  const pairs:Array<{a:string;b:string;score:number}>=[];for(let a=0;a<i.tools.length;a++)for(let b=a+1;b<i.tools.length;b++){const wa=words([i.tools[a].name,i.tools[a].description,...i.tools[a].tags].join(' '));const wb=words([i.tools[b].name,i.tools[b].description,...i.tools[b].tags].join(' '));const inter=[...wa].filter(x=>wb.has(x)).length;const union=new Set([...wa,...wb]).size;const score=union?inter/union:0;if(score>=0.5)pairs.push({a:i.tools[a].name,b:i.tools[b].name,score:Number(score.toFixed(3))})}
  return{overlaps:pairs.sort((a,b)=>b.score-a.score)};
}
export function recommendToolDeprecations(i:V56RuntimeInput){
  const overlaps=detectSemanticToolOverlap(i).overlaps;return{recommendations:overlaps.filter(p=>p.score>=0.7).map(p=>({keep:(i.tools.find(t=>t.name===p.a)?.successRate??0)>=(i.tools.find(t=>t.name===p.b)?.successRate??0)?p.a:p.b,review:(i.tools.find(t=>t.name===p.a)?.successRate??0)>=(i.tools.find(t=>t.name===p.b)?.successRate??0)?p.b:p.a,reason:'HIGH_SEMANTIC_OVERLAP'})),automaticDeprecation:false};
}
export function buildAgentQuorum(i:V56RuntimeInput){
  const ev=verifiedFresh(i);const weighted=i.agents.map(a=>({id:a.id,vote:a.vote,weight:a.reliability*(a.evidenceRefs.every(r=>ev.has(r))&&a.evidenceRefs.length?1:0.5)}));return{votes:weighted};
}
export function evaluateAgentQuorum(i:V56RuntimeInput){
  const q=buildAgentQuorum(i).votes;const approve=q.filter(v=>v.vote==='APPROVE').reduce((s,v)=>s+v.weight,0);const block=q.filter(v=>v.vote==='BLOCK').reduce((s,v)=>s+v.weight,0);return{approveWeight:approve,blockWeight:block,decision:approve>block&&approve>=100?'APPROVE':block>=approve&&block>=100?'BLOCK':'NO_QUORUM'};
}
export function compileRuntimePolicy(i:V56RuntimeInput){
  return{policies:[...i.policies].sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id)),fingerprint:stable([...i.policies].sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id)))};
}
export function diffRuntimePolicies(i:V56RuntimeInput){
  const now=new Map(i.policies.map(p=>[p.id,stable(p)]));const prev=new Map(i.previousPolicies.map(p=>[p.id,stable(p)]));return{added:[...now.keys()].filter(k=>!prev.has(k)),removed:[...prev.keys()].filter(k=>!now.has(k)),changed:[...now.keys()].filter(k=>prev.has(k)&&prev.get(k)!==now.get(k))};
}
export function propagateEvidenceInvalidation(i:V56RuntimeInput){
  const invalid=new Set(i.changedEvidenceIds);let progress=true;while(progress){progress=false;for(const e of i.evidence)if(e.dependsOn.some(d=>invalid.has(d))&&!invalid.has(e.id)){invalid.add(e.id);progress=true}}
  const impactedActions=i.actions.filter(a=>a.evidenceRefs.some(r=>invalid.has(r))).map(a=>a.id);return{invalidatedEvidence:[...invalid],impactedActions};
}
export function buildCausalExecutionTrace(i:V56RuntimeInput){
  return{nodes:i.actions.map(a=>({id:a.id,kind:a.kind,risk:a.risk})),edges:i.actions.flatMap(a=>a.dependsOn.map(d=>({cause:d,effect:a.id}))),evidenceEdges:i.actions.flatMap(a=>a.evidenceRefs.map(e=>({evidence:e,action:a.id})))};
}
export function evaluateRecoveryConfidence(i:V56RuntimeInput){
  const ev=verifiedFresh(i);const recovery=i.actions.filter(a=>/recover|rollback|restore|contain|isolate/i.test(a.kind));const supported=recovery.filter(a=>a.evidenceRefs.length&&a.evidenceRefs.every(r=>ev.has(r)));const confidence=recovery.length?Math.round((supported.length/recovery.length)*100):0;return{confidence,supported:supported.map(a=>a.id),unsupported:recovery.filter(a=>!supported.includes(a)).map(a=>a.id),status:confidence===100&&recovery.length?'SUPPORTED':'NOT_PROVEN'};
}
export function buildRuntimeObservabilitySnapshot(i:V56RuntimeInput){
  return{metrics:i.metrics.map(m=>({name:m.name,value:m.value,threshold:m.threshold,state:m.threshold===undefined?'OBSERVED':m.direction==='MAX'?(m.value<=m.threshold?'OK':'BREACH'):(m.value>=m.threshold?'OK':'BREACH')})),attempts:i.attempts.length,failures:i.failures.length,openCircuits:updateProviderCircuitBreaker(i).providers.filter(p=>p.circuit==='OPEN').map(p=>p.id)};
}
export function detectRuntimeControlAnomalies(i:V56RuntimeInput){
  const obs=buildRuntimeObservabilitySnapshot(i);return{anomalies:[...obs.metrics.filter(m=>m.state==='BREACH').map(m=>`METRIC:${m.name}`),...(detectRetryLoop(i).loopDetected?['RETRY_LOOP']:[]),...obs.openCircuits.map(p=>`OPEN_CIRCUIT:${p}`)]};
}
export function buildSelfHealingCommandSnapshot(i:V56RuntimeInput){
  return{missionId:i.missionId,replan:buildSelfHealingReplan(i),retry:enforceRetryBudget(i),loops:detectRetryLoop(i),failover:selectFailoverProvider(i),quorum:evaluateAgentQuorum(i),recovery:evaluateRecoveryConfidence(i),anomalies:detectRuntimeControlAnomalies(i),executionClaim:false};
}
