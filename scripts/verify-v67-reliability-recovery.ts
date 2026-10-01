import assert from 'node:assert/strict';
import { v67ReliabilityRecoverySchema } from '../src/v67-schema';
import { buildCircuitBreakerPlanV67, calculateRetryBudgetV67, assessBlastRadiusV67, buildDegradedModePlanV67, correlateFailuresV67, buildRecoveryPriorityQueueV67, evaluateRecoveryReadinessV67, buildReliabilitySnapshotV67 } from '../src/v67-engine';

const i=v67ReliabilityRecoverySchema.parse({
  objective:'v67 reliability benchmark',
  evidence:[{id:'e',verified:true,fresh:true,confidence:99}],
  services:[
    {name:'db',criticality:95,healthy:true,latencyMs:100,errorRate:0,evidenceRefs:['e']},
    {name:'api',criticality:90,healthy:true,latencyMs:120,errorRate:0,dependencies:['db'],evidenceRefs:['e']},
    {name:'web',criticality:70,healthy:true,latencyMs:80,errorRate:0,dependencies:['api'],evidenceRefs:['e']}
  ],
  incidents:[],
  retryState:{attempted:0,budget:3}
});

assert.equal(buildCircuitBreakerPlanV67(i).services.every(x=>x.state==='CLOSED'),true);
assert.equal(calculateRetryBudgetV67(i).remaining,3);
assert.deepEqual(assessBlastRadiusV67(i,'db').affected.sort(),['api','db','web']);
assert.equal(buildDegradedModePlanV67(i).mode,'NORMAL');
assert.equal(correlateFailuresV67(i).correlations.length,0);
assert.equal(buildRecoveryPriorityQueueV67(i).queue.length,0);
assert.equal(evaluateRecoveryReadinessV67(i).status,'READY');
assert.equal(buildReliabilitySnapshotV67(i).selfExecutionClaim,false);

const missingEvidence=v67ReliabilityRecoverySchema.parse({...i,evidence:[],services:i.services.map(s=>({...s,evidenceRefs:[]}))});
assert.equal(buildCircuitBreakerPlanV67(missingEvidence).services.every(x=>x.state==='OPEN'),true);
assert.equal(evaluateRecoveryReadinessV67(missingEvidence).status,'BLOCKED');

const saturatedPriority=v67ReliabilityRecoverySchema.parse({...i,services:[
  {...i.services[0],name:'lower',criticality:80,healthy:false},
  {...i.services[1],name:'higher',criticality:95,healthy:false}
],incidents:[
  {id:'inc-a',services:['lower','higher'],severity:50,active:true,evidenceRefs:['e']}
]});
assert.equal(buildRecoveryPriorityQueueV67(saturatedPriority).queue[0]?.service,'higher');

const noRetryNeeded=v67ReliabilityRecoverySchema.parse({...i,retryState:{attempted:3,budget:3}});
assert.equal(evaluateRecoveryReadinessV67(noRetryNeeded).status,'READY');

const unsupportedCriticalIncident=v67ReliabilityRecoverySchema.parse({...i,incidents:[{id:'inc-critical',services:['api'],severity:90,active:true,evidenceRefs:['missing']}]});
assert.equal(evaluateRecoveryReadinessV67(unsupportedCriticalIncident).status,'BLOCKED');

const failure=v67ReliabilityRecoverySchema.parse({...i,services:i.services.map(s=>s.name==='db'?{...s,healthy:false}:s)});
assert.equal(buildCircuitBreakerPlanV67(failure).services.find(x=>x.service==='db')?.state,'OPEN');
assert.equal(buildDegradedModePlanV67(failure).mode,'BLOCKED');

console.log(JSON.stringify({status:'PASS',circuitBreaker:true,retryBudget:true,blastRadius:true,degradedMode:true,failureCorrelation:true,recoveryQueue:true,recoveryReadiness:true,retryOnlyWhenNeeded:true,criticalIncidentEvidenceGate:true,missingEvidenceGate:true,priorityTieBreak:true,reliabilitySnapshot:true},null,2));
