import type { V68IncidentCommandInput } from './v68-schema';

const evidenceReady=(i:V68IncidentCommandInput,refs:string[])=>{
  if(!refs.length) return false;
  const valid=new Set(i.evidence.filter(e=>e.verified&&e.fresh&&e.confidence>=60).map(e=>e.id));
  return refs.every(r=>valid.has(r));
};

export function buildIncidentCommandStateV68(i:V68IncidentCommandInput){
  const active=i.incidents.filter(x=>x.active);
  const critical=active.filter(x=>x.severity>=i.escalationSeverity);
  return {
    objective:i.objective,
    activeIncidents:active.map(x=>x.id),
    criticalIncidents:critical.map(x=>x.id),
    commandMode:critical.length?'CRITICAL':active.length?'ACTIVE':'STANDBY',
    executionClaim:false
  };
}

export function buildContainmentWavePlanV68(i:V68IncidentCommandInput){
  const byService=new Map(i.services.map(s=>[s.name,s]));
  const actions=i.incidents.filter(x=>x.active).flatMap(incident=>
    incident.services.map(serviceName=>{
      const service=byService.get(serviceName);
      const criticality=service?.criticality??0;
      const priority=Math.min(100,incident.severity*0.65+criticality*0.35);
      return {
        incident:incident.id,
        service:serviceName,
        priority:Number(priority.toFixed(2)),
        action:criticality>=80?'ISOLATE_AND_PRESERVE_EVIDENCE':'RATE_LIMIT_AND_VERIFY',
        evidenceReady:evidenceReady(i,incident.evidenceRefs)&&!!service&&evidenceReady(i,service.evidenceRefs),
        execute:false
      };
    })
  ).sort((a,b)=>b.priority-a.priority);
  const waves=[
    {wave:1,actions:actions.filter(x=>x.priority>=80)},
    {wave:2,actions:actions.filter(x=>x.priority>=60&&x.priority<80)},
    {wave:3,actions:actions.filter(x=>x.priority<60)}
  ].filter(x=>x.actions.length);
  return {waves,executionClaim:false};
}

export function buildRecoveryWavePlanV68(i:V68IncidentCommandInput){
  const activeAffected=new Set(i.incidents.filter(x=>x.active).flatMap(x=>x.services));
  const candidates=i.services.filter(s=>activeAffected.has(s.name)||!s.healthy).map(s=>{
    const dependencyRisk=s.dependencies.filter(d=>activeAffected.has(d)).length;
    const score=s.criticality+dependencyRisk*10+(s.healthy?0:20);
    return {service:s.name,score,criticality:s.criticality,evidenceReady:evidenceReady(i,s.evidenceRefs),execute:false};
  }).sort((a,b)=>b.score-a.score||b.criticality-a.criticality);
  return {
    waves:[
      {wave:1,services:candidates.filter(x=>x.score>=100)},
      {wave:2,services:candidates.filter(x=>x.score>=70&&x.score<100)},
      {wave:3,services:candidates.filter(x=>x.score<70)}
    ].filter(x=>x.services.length),
    executionClaim:false
  };
}

export function evaluateEscalationPolicyV68(i:V68IncidentCommandInput){
  const results=i.incidents.filter(x=>x.active).map(x=>{
    const supported=evidenceReady(i,x.evidenceRefs);
    const escalate=x.severity>=i.escalationSeverity||!supported;
    return {incident:x.id,severity:x.severity,evidenceReady:supported,escalate,reason:!supported?'EVIDENCE_GAP':x.severity>=i.escalationSeverity?'SEVERITY_THRESHOLD':'NONE'};
  });
  return {results,requiresEscalation:results.some(x=>x.escalate)};
}

export function buildIncidentTimelineV68(i:V68IncidentCommandInput,incidentId:string){
  const incident=i.incidents.find(x=>x.id===incidentId);
  const events=i.events.filter(x=>x.incidentId===incidentId).sort((a,b)=>a.epoch-b.epoch).map(x=>({
    id:x.id,type:x.type,epoch:x.epoch,evidenceReady:evidenceReady(i,x.evidenceRefs)
  }));
  return {incidentId,known:!!incident,startedAtEpoch:incident?.startedAtEpoch??null,events};
}

export function verifyRecoveryEvidenceV68(i:V68IncidentCommandInput){
  const services=i.services.map(s=>({
    service:s.name,
    evidenceReady:evidenceReady(i,s.evidenceRefs),
    evidenceRefs:s.evidenceRefs
  }));
  const incidents=i.incidents.map(x=>({
    incident:x.id,
    evidenceReady:evidenceReady(i,x.evidenceRefs),
    evidenceRefs:x.evidenceRefs
  }));
  return {
    services,
    incidents,
    pass:services.every(x=>x.evidenceReady)&&incidents.filter(x=>x.active).every(x=>x.evidenceReady)
  };
}

export function buildPostRecoveryVerificationPlanV68(i:V68IncidentCommandInput){
  const recovered=new Set(i.events.filter(x=>x.type==='RECOVERED').map(x=>x.incidentId));
  const verified=new Set(i.events.filter(x=>x.type==='VERIFIED'&&evidenceReady(i,x.evidenceRefs)).map(x=>x.incidentId));
  const pending=[...recovered].filter(id=>!verified.has(id));
  return {
    pending,
    checks:pending.map(id=>({incident:id,checks:['SERVICE_HEALTH','DEPENDENCY_HEALTH','EVIDENCE_FRESHNESS','REGRESSION_SMOKE'],execute:false})),
    complete:pending.length===0,
    executionClaim:false
  };
}

export function buildIncidentCommandSnapshotV68(i:V68IncidentCommandInput){
  return {
    command:buildIncidentCommandStateV68(i),
    containment:buildContainmentWavePlanV68(i),
    recovery:buildRecoveryWavePlanV68(i),
    escalation:evaluateEscalationPolicyV68(i),
    evidence:verifyRecoveryEvidenceV68(i),
    postRecovery:buildPostRecoveryVerificationPlanV68(i),
    selfExecutionClaim:false,
    persistenceClaim:false,
    externalVerificationClaim:false
  };
}
