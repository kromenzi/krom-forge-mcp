import assert from 'node:assert/strict';
import { v68IncidentCommandSchema } from '../src/v68-schema';
import { buildIncidentCommandStateV68, buildContainmentWavePlanV68, buildRecoveryWavePlanV68, evaluateEscalationPolicyV68, buildIncidentTimelineV68, verifyRecoveryEvidenceV68, buildPostRecoveryVerificationPlanV68, buildIncidentCommandSnapshotV68 } from '../src/v68-engine';

const i=v68IncidentCommandSchema.parse({
  objective:'v68 incident command benchmark',
  nowEpoch:2000,
  evidence:[{id:'e',verified:true,fresh:true,confidence:99}],
  services:[
    {name:'db',criticality:95,healthy:false,evidenceRefs:['e']},
    {name:'api',criticality:90,healthy:true,dependencies:['db'],evidenceRefs:['e']},
    {name:'web',criticality:70,healthy:true,dependencies:['api'],evidenceRefs:['e']}
  ],
  incidents:[
    {id:'inc-1',severity:90,active:true,services:['db','api'],startedAtEpoch:1900,evidenceRefs:['e']}
  ],
  events:[
    {id:'ev-1',incidentId:'inc-1',type:'DETECTED',epoch:1900,evidenceRefs:['e']},
    {id:'ev-2',incidentId:'inc-1',type:'RECOVERY_STARTED',epoch:1950,evidenceRefs:['e']}
  ],
  approvals:[]
});

assert.equal(buildIncidentCommandStateV68(i).commandMode,'CRITICAL');
assert.equal(buildContainmentWavePlanV68(i).waves.length>0,true);
const recoveryPlan=buildRecoveryWavePlanV68(i);
assert.equal(recoveryPlan.waves.length>0,true);
assert.equal(recoveryPlan.waves[0]?.services[0]?.service,'db');
assert.equal(recoveryPlan.waves[1]?.services[0]?.service,'api');
assert.equal(recoveryPlan.cycleDetected,false);
assert.equal(evaluateEscalationPolicyV68(i).requiresEscalation,true);
assert.equal(buildIncidentTimelineV68(i,'inc-1').events.length,2);
assert.equal(verifyRecoveryEvidenceV68(i).pass,true);
const emptyEvidenceInput=v68IncidentCommandSchema.parse({objective:'empty evidence benchmark'});
assert.equal(verifyRecoveryEvidenceV68(emptyEvidenceInput).pass,false);
assert.equal(buildPostRecoveryVerificationPlanV68(i).complete,true);
assert.equal(buildIncidentCommandSnapshotV68(i).selfExecutionClaim,false);

const evidenceGap=v68IncidentCommandSchema.parse({...i,evidence:[],incidents:[{...i.incidents[0],severity:30,evidenceRefs:[]}]});
assert.equal(evaluateEscalationPolicyV68(evidenceGap).requiresEscalation,true);
assert.equal(verifyRecoveryEvidenceV68(evidenceGap).pass,false);

const recovered=v68IncidentCommandSchema.parse({...i,events:[...i.events,{id:'ev-3',incidentId:'inc-1',type:'RECOVERED',epoch:1980,evidenceRefs:['e']}]});
assert.deepEqual(buildPostRecoveryVerificationPlanV68(recovered).pending,['inc-1']);

const staleVerification=v68IncidentCommandSchema.parse({...i,events:[
  {id:'ev-v',incidentId:'inc-1',type:'VERIFIED',epoch:1970,evidenceRefs:['e']},
  {id:'ev-r',incidentId:'inc-1',type:'RECOVERED',epoch:1980,evidenceRefs:['e']}
]});
assert.deepEqual(buildPostRecoveryVerificationPlanV68(staleVerification).pending,['inc-1']);

const freshVerification=v68IncidentCommandSchema.parse({...i,events:[
  {id:'ev-r2',incidentId:'inc-1',type:'RECOVERED',epoch:1980,evidenceRefs:['e']},
  {id:'ev-v2',incidentId:'inc-1',type:'VERIFIED',epoch:1990,evidenceRefs:['e']}
]});
assert.equal(buildPostRecoveryVerificationPlanV68(freshVerification).complete,true);

console.log(JSON.stringify({status:'PASS',commandState:true,containmentWaves:true,recoveryWaves:true,dependencyOrder:true,escalation:true,timeline:true,recoveryEvidence:true,emptyEvidenceGuard:true,postRecoveryVerification:true,verificationChronology:true,snapshot:true},null,2));
