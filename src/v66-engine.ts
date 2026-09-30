import type { V66AutonomousVerificationInput } from './v66-schema';

const uniq=<T>(x:T[])=>[...new Set(x)];
const evidenceReady=(i:V66AutonomousVerificationInput,refs:string[])=>{
  const ok=new Set(i.evidence.filter(e=>e.verified&&e.fresh&&e.confidence>=60).map(e=>e.id));
  return refs.length>0&&refs.every(r=>ok.has(r));
};

export function buildCapabilityDiscoveryV66(i:V66AutonomousVerificationInput){
  return {tools:i.tools.map(t=>({name:t.name,enabled:t.enabled,capabilities:uniq(t.capabilities),evidenceReady:evidenceReady(i,t.evidenceRefs)})),
    capabilities:uniq(i.tools.flatMap(t=>t.capabilities)).sort()};
}

export function scoreToolHealthV66(i:V66AutonomousVerificationInput){
  return {tools:i.tools.map(t=>{
    let score=t.enabled?100:0;
    if(t.latencyMs!==undefined&&t.latencyMs>i.maxLatencyMs) score-=Math.min(40,((t.latencyMs-i.maxLatencyMs)/i.maxLatencyMs)*40);
    if(t.errorRate!==undefined) score-=Math.min(50,(t.errorRate/Math.max(i.maxErrorRate,1))*25);
    if(t.lastSuccessEpoch!==undefined&&i.nowEpoch>0&&i.nowEpoch-t.lastSuccessEpoch>i.staleAfterSeconds) score-=25;
    if(t.evidenceRefs.length&&!evidenceReady(i,t.evidenceRefs)) score-=20;
    return {name:t.name,score:Math.max(0,Math.min(100,Number(score.toFixed(2)))),healthy:score>=70};
  })};
}

export function detectDeadToolsV66(i:V66AutonomousVerificationInput){
  const health=new Map(scoreToolHealthV66(i).tools.map(x=>[x.name,x]));
  return {dead:i.tools.filter(t=>{
    const stale=t.lastSuccessEpoch!==undefined&&i.nowEpoch>0&&i.nowEpoch-t.lastSuccessEpoch>i.staleAfterSeconds;
    const highError=t.errorRate!==undefined&&t.errorRate>Math.max(i.maxErrorRate*2,20);
    return !t.enabled||((health.get(t.name)?.score??0)<40)||(stale&&highError);
  }).map(t=>t.name)};
}

export function detectRegistryDriftV66(i:V66AutonomousVerificationInput){
  const actual=new Set(i.tools.map(t=>t.name)), expected=new Set(i.expectedTools);
  return {missing:i.expectedTools.filter(x=>!actual.has(x)),unexpected:i.tools.map(t=>t.name).filter(x=>!expected.has(x)),duplicates:i.tools.map(t=>t.name).filter((x,idx,a)=>a.indexOf(x)!==idx)};
}

export function evaluateVerificationCoverageV66(i:V66AutonomousVerificationInput){
  const toolNames=new Set(i.tools.map(t=>t.name));
  const verified=i.checks.filter(c=>c.passed&&evidenceReady(i,c.evidenceRefs));
  const covered=new Set(verified.flatMap(c=>c.toolName?[c.toolName]:[]));
  return {totalTools:toolNames.size,coveredTools:covered.size,coveragePercent:toolNames.size?Number((covered.size/toolNames.size*100).toFixed(2)):100,
    failedChecks:i.checks.filter(c=>!c.passed).map(c=>c.id),unsupportedChecks:i.checks.filter(c=>c.evidenceRefs.length&&!evidenceReady(i,c.evidenceRefs)).map(c=>c.id)};
}

export function buildExecutionTracePlanV66(i:V66AutonomousVerificationInput){
  const unhealthy=new Set(scoreToolHealthV66(i).tools.filter(x=>!x.healthy).map(x=>x.name));
  return {objective:i.objective,steps:i.tools.filter(t=>t.enabled).map((t,index)=>({index:index+1,tool:t.name,mode:unhealthy.has(t.name)?'VERIFY_BEFORE_USE':'NORMAL',execute:false})),
    executionClaim:false};
}

export function evaluateOperationalReadinessV66(i:V66AutonomousVerificationInput){
  const drift=detectRegistryDriftV66(i), dead=detectDeadToolsV66(i), coverage=evaluateVerificationCoverageV66(i);
  const unhealthy=scoreToolHealthV66(i).tools.filter(x=>!x.healthy).length;
  const criticalFailed=i.checks.filter(c=>!c.passed&&c.severity>=80).length;
  const ready=drift.missing.length===0&&drift.duplicates.length===0&&dead.dead.length===0&&criticalFailed===0&&coverage.coveragePercent>=80;
  return {status:ready?'READY':'BLOCKED',unhealthyTools:unhealthy,deadTools:dead.dead.length,criticalFailedChecks:criticalFailed,
    coveragePercent:coverage.coveragePercent,missingExpectedTools:drift.missing.length};
}

export function buildSelfDiagnosticsV66(i:V66AutonomousVerificationInput){
  const h=scoreToolHealthV66(i).tools;
  return {summary:{totalTools:i.tools.length,healthy:h.filter(x=>x.healthy).length,unhealthy:h.filter(x=>!x.healthy).length,checks:i.checks.length},
    health:h,deadTools:detectDeadToolsV66(i),registry:detectRegistryDriftV66(i),verification:evaluateVerificationCoverageV66(i)};
}

export function buildAutonomousVerificationSnapshotV66(i:V66AutonomousVerificationInput){
  return {capabilities:buildCapabilityDiscoveryV66(i),diagnostics:buildSelfDiagnosticsV66(i),readiness:evaluateOperationalReadinessV66(i),
    tracePlan:buildExecutionTracePlanV66(i),status:evaluateOperationalReadinessV66(i).status,
    selfExecutionClaim:false,persistenceClaim:false,externalVerificationClaim:false};
}

export function buildVerificationOperatorBriefV66(i:V66AutonomousVerificationInput){
  const s=buildAutonomousVerificationSnapshotV66(i);
  return {status:s.status,totalTools:s.diagnostics.summary.totalTools,healthyTools:s.diagnostics.summary.healthy,
    deadTools:s.diagnostics.deadTools.dead,coveragePercent:s.diagnostics.verification.coveragePercent,
    evidenceBoundary:'Diagnostics are derived only from supplied evidence and telemetry. No host action, deployment, external probe, persistence, or production success is inferred.'};
}


export function rankToolSelectionV66(i:V66AutonomousVerificationInput, requiredCapabilities:string[]=[]){
  const health=new Map(scoreToolHealthV66(i).tools.map(x=>[x.name,x.score]));
  return {ranking:i.tools.map(t=>{
    const matched=requiredCapabilities.filter(c=>t.capabilities.includes(c));
    const coverage=requiredCapabilities.length?matched.length/requiredCapabilities.length:1;
    const score=Number(((health.get(t.name)??0)*0.65 + coverage*35).toFixed(2));
    return {name:t.name,score,matchedCapabilities:matched,eligible:t.enabled&&coverage>0};
  }).filter(x=>x.eligible).sort((a,b)=>b.score-a.score)};
}

export function detectTelemetryAnomaliesV66(i:V66AutonomousVerificationInput){
  return {anomalies:i.tools.flatMap(t=>{
    const out:{tool:string,type:'LATENCY'|'ERROR_RATE'|'STALE_SUCCESS',value:number,threshold:number}[]=[];
    if(t.latencyMs!==undefined&&t.latencyMs>i.maxLatencyMs) out.push({tool:t.name,type:'LATENCY',value:t.latencyMs,threshold:i.maxLatencyMs});
    if(t.errorRate!==undefined&&t.errorRate>i.maxErrorRate) out.push({tool:t.name,type:'ERROR_RATE',value:t.errorRate,threshold:i.maxErrorRate});
    if(t.lastSuccessEpoch!==undefined&&i.nowEpoch>0&&i.nowEpoch-t.lastSuccessEpoch>i.staleAfterSeconds) out.push({tool:t.name,type:'STALE_SUCCESS',value:i.nowEpoch-t.lastSuccessEpoch,threshold:i.staleAfterSeconds});
    return out;
  })};
}

export function buildVerificationRecommendationsV66(i:V66AutonomousVerificationInput){
  const anomalies=detectTelemetryAnomaliesV66(i).anomalies;
  const failed=new Set(i.checks.filter(c=>!c.passed).flatMap(c=>c.toolName?[c.toolName]:[]));
  const dead=new Set(detectDeadToolsV66(i).dead);
  return {recommendations:i.tools.map(t=>{
    const reasons:string[]=[];
    if(dead.has(t.name)) reasons.push('DEAD_TOOL');
    if(failed.has(t.name)) reasons.push('FAILED_CHECK');
    if(anomalies.some(a=>a.tool===t.name)) reasons.push('TELEMETRY_ANOMALY');
    if(t.evidenceRefs.length&&!evidenceReady(i,t.evidenceRefs)) reasons.push('EVIDENCE_NOT_READY');
    return {tool:t.name,priority:reasons.length>=2?'HIGH':reasons.length===1?'MEDIUM':'LOW',reasons};
  }).sort((a,b)=>({HIGH:3,MEDIUM:2,LOW:1}[b.priority]-{HIGH:3,MEDIUM:2,LOW:1}[a.priority]))};
}

export function auditRegistryDeepV66(i:V66AutonomousVerificationInput){
  const drift=detectRegistryDriftV66(i);
  const names=i.tools.map(t=>t.name);
  return {registryCount:names.length,uniqueCount:new Set(names).size,expectedCount:i.expectedTools.length,
    missing:drift.missing,unexpected:drift.unexpected,duplicates:drift.duplicates,
    toolsWithoutCapabilities:i.tools.filter(t=>t.capabilities.length===0).map(t=>t.name),
    toolsWithoutEvidence:i.tools.filter(t=>t.evidenceRefs.length===0).map(t=>t.name)};
}

export function buildAdaptiveVerificationQueueV66(i:V66AutonomousVerificationInput){
  const rec=buildVerificationRecommendationsV66(i).recommendations;
  return {queue:rec.filter(r=>r.priority!=='LOW').map((r,index)=>({order:index+1,tool:r.tool,priority:r.priority,reasons:r.reasons,execute:false})),executionClaim:false};
}

export function buildSelectionDiagnosticsV66(i:V66AutonomousVerificationInput){
  return {telemetry:detectTelemetryAnomaliesV66(i),recommendations:buildVerificationRecommendationsV66(i),
    registry:auditRegistryDeepV66(i),queue:buildAdaptiveVerificationQueueV66(i)};
}


export function scoreRoutingConfidenceV66(i:V66AutonomousVerificationInput, requiredCapabilities:string[]=[]){
  const ranking=rankToolSelectionV66(i,requiredCapabilities).ranking;
  const top=ranking[0], second=ranking[1];
  if(!top) return {confidence:0,selected:null,margin:0,reasons:['NO_ELIGIBLE_TOOL']};
  const margin=Number((top.score-(second?.score??0)).toFixed(2));
  const confidence=Math.max(0,Math.min(100,Number((top.score*0.8+Math.min(margin,25)*0.8).toFixed(2))));
  return {confidence,selected:top.name,margin,reasons:confidence<60?['LOW_CONFIDENCE']:[]};
}

export function buildFallbackPlanV66(i:V66AutonomousVerificationInput, requiredCapabilities:string[]=[]){
  const ranking=rankToolSelectionV66(i,requiredCapabilities).ranking;
  return {primary:ranking[0]?.name??null,fallbacks:ranking.slice(1,4).map(x=>({tool:x.name,score:x.score})),
    condition:'Use fallback only when host-authorized execution reports failure, denial, or health degradation.',execute:false};
}

export function evaluateToolCanaryV66(i:V66AutonomousVerificationInput, candidateTool:string){
  const t=i.tools.find(x=>x.name===candidateTool);
  if(!t) return {candidateTool,status:'BLOCKED',reasons:['UNKNOWN_TOOL'],promote:false};
  const health=scoreToolHealthV66(i).tools.find(x=>x.name===candidateTool);
  const failed=i.checks.filter(c=>c.toolName===candidateTool&&!c.passed);
  const anomalies=detectTelemetryAnomaliesV66(i).anomalies.filter(a=>a.tool===candidateTool);
  const promote=!!health?.healthy&&failed.length===0&&anomalies.length===0&&evidenceReady(i,t.evidenceRefs);
  return {candidateTool,status:promote?'PASS':'BLOCKED',healthScore:health?.score??0,failedChecks:failed.map(x=>x.id),anomalies,promote};
}

export function compareToolCandidatesV66(i:V66AutonomousVerificationInput, candidates:string[], requiredCapabilities:string[]=[]){
  const ranking=rankToolSelectionV66(i,requiredCapabilities).ranking.filter(x=>candidates.includes(x.name));
  return {candidates:ranking,selected:ranking[0]?.name??null,selectionClaim:'Recommendation only; no tool invocation occurs.'};
}

export function buildRoutingDecisionPacketV66(i:V66AutonomousVerificationInput, requiredCapabilities:string[]=[]){
  const confidence=scoreRoutingConfidenceV66(i,requiredCapabilities);
  const fallback=buildFallbackPlanV66(i,requiredCapabilities);
  return {objective:i.objective,requiredCapabilities,confidence,fallback,verification:buildVerificationRecommendationsV66(i),
    execute:false,decisionBoundary:'Routing is advisory and evidence-bound; host authorization is required for execution.'};
}

export function auditSelectionSafetyV66(i:V66AutonomousVerificationInput, requiredCapabilities:string[]=[]){
  const ranking=rankToolSelectionV66(i,requiredCapabilities).ranking;
  const dead=new Set(detectDeadToolsV66(i).dead);
  const unsafe=ranking.filter(x=>dead.has(x.name)||x.score<50).map(x=>x.name);
  return {eligible:ranking.map(x=>x.name),unsafe,pass:unsafe.length===0};
}
