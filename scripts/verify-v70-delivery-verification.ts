import assert from 'node:assert/strict';
import { v70DeliveryVerificationSchema } from '../src/v70-schema';
import { evaluateEvidenceFreshnessV70, buildDeploymentWavePlanV70, evaluateObservationWindowV70, detectRollbackTriggersV70, buildImpactReverificationPlanV70, coordinateReleaseTrainV70, detectDeliveryDriftV70, evaluatePostDeployVerificationV70, evaluateDeliveryClosureV70, buildDeliveryDecisionPacketV70 } from '../src/v70-engine';

const i=v70DeliveryVerificationSchema.parse({
  objective:'v70 delivery verification benchmark',
  nowEpoch:2000,
  evidence:[
    {id:'e-release',verified:true,fresh:true,confidence:99,observedAtEpoch:1900,kind:'RELEASE'},
    {id:'e-run',verified:true,fresh:true,confidence:98,observedAtEpoch:1950,kind:'RUNTIME'},
    {id:'e-check',verified:true,fresh:true,confidence:97,observedAtEpoch:1960,kind:'CHECK'}
  ],
  releases:[{id:'rel-1',services:['api'],environment:'production',changeRisk:45,approved:true,reversible:true,evidenceRefs:['e-release']}],
  services:[
    {name:'db',healthy:true,criticality:95,evidenceRefs:['e-run']},
    {name:'api',healthy:true,criticality:90,dependencies:['db'],evidenceRefs:['e-run']},
    {name:'web',healthy:true,criticality:70,dependencies:['api'],evidenceRefs:['e-run']}
  ],
  observations:[
    {id:'pre-api',releaseId:'rel-1',service:'api',phase:'PRE_DEPLOY',healthy:true,errorRate:0.1,latencyMs:100,epoch:1500,evidenceRefs:['e-run']},
    {id:'post-api',releaseId:'rel-1',service:'api',phase:'POST_DEPLOY',healthy:true,errorRate:0.2,latencyMs:120,epoch:1000,evidenceRefs:['e-run']}
  ],
  verificationChecks:[
    {id:'check-1',releaseId:'rel-1',service:'api',kind:'SMOKE',passed:true,severity:90,evidenceRefs:['e-check']}
  ],
  observationWindowSeconds:900
});

assert.equal(evaluateEvidenceFreshnessV70(i).pass,true);
assert.equal(buildDeploymentWavePlanV70(i).plans[0]?.strategy,'CANARY_THEN_PROGRESSIVE');
assert.equal(evaluateObservationWindowV70(i,'rel-1').pass,true);
assert.equal(detectRollbackTriggersV70(i,'rel-1').rollbackRecommended,false);
assert.deepEqual(buildImpactReverificationPlanV70(i,'rel-1').services.sort(),['api','web']);
assert.equal(coordinateReleaseTrainV70(i).pass,true);
assert.equal(detectDeliveryDriftV70(i,'rel-1').pass,true);
assert.equal(evaluatePostDeployVerificationV70(i,'rel-1').pass,true);
assert.equal(evaluateDeliveryClosureV70(i,'rel-1').status,'CLOSED');
assert.equal(buildDeliveryDecisionPacketV70(i,'rel-1').execute,false);

const stale=v70DeliveryVerificationSchema.parse({...i,nowEpoch:100000,evidence:i.evidence.map(e=>({...e,observedAtEpoch:1}))});
assert.equal(evaluateEvidenceFreshnessV70(stale).pass,false);
assert.equal(evaluateDeliveryClosureV70(stale,'rel-1').status,'BLOCKED');

const rollback=v70DeliveryVerificationSchema.parse({...i,observations:[...i.observations,{id:'post-bad',releaseId:'rel-1',service:'api',phase:'POST_DEPLOY',healthy:false,errorRate:20,latencyMs:5000,epoch:1000,evidenceRefs:['e-run']}]});
assert.equal(detectRollbackTriggersV70(rollback,'rel-1').rollbackRecommended,true);
assert.equal(evaluateDeliveryClosureV70(rollback,'rel-1').status,'BLOCKED');

const conflict=v70DeliveryVerificationSchema.parse({...i,releases:[...i.releases,{id:'rel-2',services:['api'],environment:'production',changeRisk:10,approved:true,reversible:true,evidenceRefs:['e-release']}]});
assert.equal(coordinateReleaseTrainV70(conflict).pass,false);

console.log(JSON.stringify({status:'PASS',freshness:true,deploymentWaves:true,observationWindow:true,rollbackTriggers:true,impactReverification:true,releaseTrain:true,deliveryDrift:true,postDeploy:true,closure:true,decisionPacket:true},null,2));
