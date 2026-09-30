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
