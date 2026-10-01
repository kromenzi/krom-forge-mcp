import type { V69OperationsGovernanceInput } from './v69-schema';

const evidenceIndex=(i:V69OperationsGovernanceInput)=>new Map(i.evidence.map(e=>[e.id,e]));
const refsReady=(i:V69OperationsGovernanceInput,refs:string[],min=60)=>{
  if(!refs.length) return false;
  const idx=evidenceIndex(i);
  return refs.every(ref=>{
    const e=idx.get(ref);
    return !!e&&e.verified&&e.fresh&&e.confidence>=min;
  });
};

export function assessChangeRiskV69(i:V69OperationsGovernanceInput){
  const byService=new Map(i.services.map(s=>[s.name,s]));
  const changes=i.changes.map(c=>{
    const serviceCriticality=c.services.reduce((m,n)=>Math.max(m,byService.get(n)?.criticality??0),0);
    const dependencyExposure=i.services.filter(s=>s.dependencies.some(d=>c.services.includes(d))).length;
    const evidencePenalty=refsReady(i,c.evidenceRefs)?0:20;
    const reversibilityPenalty=c.reversible?0:15;
    const score=Math.min(100,c.risk*0.45+serviceCriticality*0.35+Math.min(20,dependencyExposure*5)+evidencePenalty+reversibilityPenalty);
    return {change:c.id,score:Number(score.toFixed(2)),band:score>=80?'CRITICAL':score>=60?'HIGH':score>=35?'MEDIUM':'LOW',evidenceReady:refsReady(i,c.evidenceRefs),reversible:c.reversible};
  }).sort((a,b)=>b.score-a.score);
  return {changes,maxRisk:changes[0]?.score??0};
}

export function evaluateApprovalGateV69(i:V69OperationsGovernanceInput){
  const risk=assessChangeRiskV69(i);
  const requiredScopes=new Set<string>();
  for(const c of risk.changes) if(c.score>=60) requiredScopes.add(c.change);
  for(const p of i.policies) if(p.effect==='REQUIRE_APPROVAL') requiredScopes.add(p.scope);
  const approvals=i.approvals.filter(a=>a.approved&&refsReady(i,a.evidenceRefs));
  const missing=[...requiredScopes].filter(scope=>!approvals.some(a=>a.scope===scope));
  return {requiredScopes:[...requiredScopes],approvedScopes:approvals.map(a=>a.scope),missing,status:missing.length?'BLOCKED':'PASS'};
}

export function evaluatePolicyEnforcementV69(i:V69OperationsGovernanceInput){
  const decisions=i.policies.map(p=>{
    const evidenceForScope=[
      ...i.changes.filter(c=>c.id===p.scope||c.services.includes(p.scope)).flatMap(c=>c.evidenceRefs),
      ...i.services.filter(s=>s.name===p.scope).flatMap(s=>s.evidenceRefs)
    ];
    const evidenceReady=evidenceForScope.length>0&&refsReady(i,[...new Set(evidenceForScope)],p.minEvidenceConfidence);
    const approvalReady=i.approvals.some(a=>a.scope===p.scope&&a.approved&&refsReady(i,a.evidenceRefs,p.minEvidenceConfidence));
    const pass=p.effect==='DENY'?false:p.effect==='REQUIRE_APPROVAL'?approvalReady&&evidenceReady:evidenceReady;
    return {policy:p.id,scope:p.scope,effect:p.effect,evidenceReady,approvalReady,pass};
  });
  return {decisions,pass:decisions.every(d=>d.pass)};
}

export function buildRolloutPlanV69(i:V69OperationsGovernanceInput){
  const risk=assessChangeRiskV69(i).changes;
  const approval=evaluateApprovalGateV69(i);
  const policy=evaluatePolicyEnforcementV69(i);
  const blocked=approval.status==='BLOCKED'||!policy.pass;
  const waves=risk.map((c,idx)=>({
    wave:idx+1,
    change:c.change,
    strategy:c.score>=80?'CANARY_5_PERCENT':c.score>=60?'CANARY_10_PERCENT':c.score>=35?'PROGRESSIVE_25_50_100':'DIRECT_WITH_SMOKE',
    holdForApproval:c.score>=60,
    execute:false
  }));
  return {status:blocked?'BLOCKED':'PLANNED',waves,executionClaim:false};
}

export function buildRollbackPlanV69(i:V69OperationsGovernanceInput){
  const byChange=new Map(i.changes.map(c=>[c.id,c]));
  const risk=assessChangeRiskV69(i).changes;
  const steps=risk.map(r=>{
    const c=byChange.get(r.change);
    return {change:r.change,available:!!c?.reversible,priority:r.score,action:c?.reversible?'REVERT_CHANGE':'MANUAL_RECOVERY_REQUIRED',execute:false};
  }).sort((a,b)=>b.priority-a.priority);
  return {steps,fullyReversible:steps.every(s=>s.available),executionClaim:false};
}

export function evaluateSloHealthV69(i:V69OperationsGovernanceInput){
  const services=i.services.map(s=>{
    const observed=s.availability;
    const evidenceReady=refsReady(i,s.evidenceRefs);
    const target=s.sloTarget;
    const compliant=observed!==undefined&&observed>=target&&evidenceReady;
    const gap=observed===undefined?null:Number((observed-target).toFixed(4));
    return {service:s.name,target,observed:observed??null,gap,compliant,evidenceReady};
  });
  return {services,pass:services.length>0&&services.every(s=>s.compliant)};
}

export function calculateErrorBudgetV69(i:V69OperationsGovernanceInput){
  const budgets=i.services.map(s=>{
    const allowed=Math.max(0,100-s.sloTarget);
    const consumed=s.availability===undefined?null:Math.max(0,100-s.availability);
    const remaining=consumed===null?null:Number((allowed-consumed).toFixed(4));
    return {service:s.name,allowed:Number(allowed.toFixed(4)),consumed:consumed===null?null:Number(consumed.toFixed(4)),remaining,exhausted:remaining===null?true:remaining<0,evidenceReady:refsReady(i,s.evidenceRefs)};
  });
  return {budgets,pass:budgets.length>0&&budgets.every(b=>!b.exhausted&&b.evidenceReady)};
}

export function assessDependencyHealthV69(i:V69OperationsGovernanceInput){
  const byName=new Map(i.services.map(s=>[s.name,s]));
  const rows=i.services.map(s=>{
    const unhealthy=s.dependencies.filter(d=>{
      const dep=byName.get(d);
      return !dep||!dep.healthy||!refsReady(i,dep.evidenceRefs);
    });
    return {service:s.name,dependencies:s.dependencies,unhealthyDependencies:unhealthy,pass:unhealthy.length===0};
  });
  return {services:rows,pass:rows.every(r=>r.pass)};
}

export function evaluateCanaryPromotionV69(i:V69OperationsGovernanceInput){
  const results=i.canaries.map(c=>{
    const enoughSamples=c.sampleSize>=i.minCanarySamples;
    const evidenceReady=refsReady(i,c.evidenceRefs);
    const withinError=c.errorRate<=i.maxErrorRate;
    const withinLatency=c.latencyMs<=i.maxLatencyMs;
    const successEnough=c.successRate>=Math.max(95,100-i.maxErrorRate);
    const promote=enoughSamples&&evidenceReady&&withinError&&withinLatency&&successEnough;
    return {service:c.service,promote,enoughSamples,evidenceReady,withinError,withinLatency,successEnough};
  });
  return {results,pass:results.length>0&&results.every(r=>r.promote),executionClaim:false};
}

export function scoreReleaseConfidenceV69(i:V69OperationsGovernanceInput){
  const components=[
    evaluateApprovalGateV69(i).status==='PASS'?100:0,
    evaluatePolicyEnforcementV69(i).pass?100:0,
    evaluateSloHealthV69(i).pass?100:0,
    calculateErrorBudgetV69(i).pass?100:0,
    assessDependencyHealthV69(i).pass?100:0,
    i.canaries.length? (evaluateCanaryPromotionV69(i).pass?100:0):50
  ];
  const riskPenalty=Math.min(30,assessChangeRiskV69(i).maxRisk*0.3);
  const base=components.reduce((a,b)=>a+b,0)/components.length;
  const score=Math.max(0,Math.min(100,Number((base-riskPenalty).toFixed(2))));
  return {score,threshold:i.releaseConfidenceThreshold,status:score>=i.releaseConfidenceThreshold?'READY':'BLOCKED',components,riskPenalty:Number(riskPenalty.toFixed(2))};
}

export function buildIncidentLearningV69(i:V69OperationsGovernanceInput){
  const lessons=i.incidents.filter(x=>!x.active).map(x=>{
    const evidenceReady=refsReady(i,x.evidenceRefs);
    const rootCauseKnown=!!x.rootCause?.trim();
    const correctiveActions=x.correctiveActions.filter(Boolean);
    return {incident:x.id,evidenceReady,rootCauseKnown,correctiveActionCount:correctiveActions.length,learningReady:evidenceReady&&rootCauseKnown&&correctiveActions.length>0};
  });
  return {lessons,coverage:lessons.length?Number((lessons.filter(x=>x.learningReady).length/lessons.length*100).toFixed(2)):0};
}

export function buildOperationalDecisionPacketV69(i:V69OperationsGovernanceInput){
  const risk=assessChangeRiskV69(i);
  const approval=evaluateApprovalGateV69(i);
  const policy=evaluatePolicyEnforcementV69(i);
  const slo=evaluateSloHealthV69(i);
  const budget=calculateErrorBudgetV69(i);
  const dependency=assessDependencyHealthV69(i);
  const canary=evaluateCanaryPromotionV69(i);
  const release=scoreReleaseConfidenceV69(i);
  return {
    objective:i.objective,
    risk,approval,policy,slo,budget,dependency,canary,release,
    rollout:buildRolloutPlanV69(i),
    rollback:buildRollbackPlanV69(i),
    learning:buildIncidentLearningV69(i),
    decision:release.status,
    execute:false,
    selfExecutionClaim:false,
    persistenceClaim:false,
    externalVerificationClaim:false
  };
}
