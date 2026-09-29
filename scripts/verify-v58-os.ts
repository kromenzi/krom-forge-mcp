import assert from 'node:assert/strict';
import { v58OsSchema } from '../src/v58-schema';
import {
 buildIdempotentMissionSchedule,detectMissionLeaseConflicts,detectKnowledgeContradictionsV58,
 matchToolMarketplace,runPredictivePremortem,governExecutionEconomy,evaluateOsPolicyState,
 buildEngineeringOsSnapshot
} from '../src/v58-engine';

const i=v58OsSchema.parse({
 objective:'portfolio ops',nowEpoch:100,budget:5,maxConcurrent:1,
 projects:[{id:'p',priority:10}],
 missions:[
  {id:'done',projectId:'p',state:'DONE',idempotencyKey:'x'},
  {id:'next',projectId:'p',state:'PENDING',priority:10,dependsOn:['done'],idempotencyKey:'y',cost:2,risk:20}
 ],
 knowledge:[{id:'k',projectId:'p',subject:'release',value:'ready',verified:true,fresh:true}],
 toolOffers:[{tool:'release_verify',domains:['p'],capabilities:['release'],quality:95,cost:1}],
 toolDemand:[{id:'d',domain:'p',capability:'release',maxCost:2,minQuality:80}],
 signals:[{id:'s',projectId:'p',severity:'HIGH',verified:true}]
});
assert.deepEqual(buildIdempotentMissionSchedule(i).queue,['next']);
assert.equal(detectMissionLeaseConflicts(i).conflicts.length,0);
assert.equal(detectKnowledgeContradictionsV58(i).contradictions.length,0);
assert.equal(matchToolMarketplace(i).matches[0].selected,'release_verify');
assert.equal(runPredictivePremortem(i).projects[0].predictionClaim,false);
assert.ok(governExecutionEconomy(i).spent<=5);
assert.equal(evaluateOsPolicyState(i).status,'READY');
const snap=buildEngineeringOsSnapshot(i);assert.equal(snap.status,'READY');assert.equal(snap.executionClaim,false);
console.log(JSON.stringify({status:'PASS',idempotentScheduler:true,leaseConflictGuard:true,knowledgeConsistency:true,toolMarket:true,premortemBoundary:true,executionEconomy:true,policyState:true,osSnapshot:true},null,2));
