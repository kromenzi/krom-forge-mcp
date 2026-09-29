import assert from 'node:assert/strict';
import { v60MeshSchema } from '../src/v60-schema';
import {
 buildReplayProtection,buildDistributedSchedulerMesh,evaluateAgentConsensus,invalidateSemanticCache,
 governErrorBudget,buildDeadLetterQueuePlan,buildRuntimeMeshSnapshot
} from '../src/v60-engine';
const i=v60MeshSchema.parse({
 objective:'mesh benchmark',
 events:[{id:'e1',stream:'s',sequence:1,type:'x',hash:'a'}],
 workloads:[{id:'done',state:'DONE'},{id:'next',dependsOn:['done'],priority:5,risk:10}],
 agents:[{id:'a',vote:'APPROVE',reliability:90},{id:'b',vote:'APPROVE',reliability:80}],
 cache:[{key:'k',deps:['d'],fresh:true,confidence:95}],changedDeps:['d'],
 telemetry:[{name:'latency',value:50,target:100,direction:'MAX'}],
 deadLetters:[{id:'dlq',eventId:'e',retryable:false}]
});
assert.equal(buildReplayProtection(i).replaySafe,true);
assert.deepEqual(buildDistributedSchedulerMesh(i).admit,['next']);
assert.equal(evaluateAgentConsensus(i).decision,'APPROVE');
assert.deepEqual(invalidateSemanticCache(i).invalidate,['k']);
assert.equal(governErrorBudget(i).budgetState,'HEALTHY');
assert.deepEqual(buildDeadLetterQueuePlan(i).quarantine,['dlq']);
const snap=buildRuntimeMeshSnapshot(i);assert.equal(snap.status,'READY');assert.equal(snap.executionClaim,false);
console.log(JSON.stringify({status:'PASS',replayProtection:true,distributedScheduler:true,agentConsensus:true,cacheInvalidation:true,errorBudget:true,deadLetterQueue:true,runtimeMeshSnapshot:true},null,2));
