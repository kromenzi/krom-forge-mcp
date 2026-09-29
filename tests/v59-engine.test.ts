import assert from 'node:assert/strict';
import test from 'node:test';
import { v59FabricSchema } from '../src/v59-schema';
import {
 buildRuntimeEventBus,detectDuplicateEvents,buildIdempotentEventPlan,buildDurableStateAdapterContract,
 detectStateVersionConflicts,coordinateDistributedMissions,buildMissionOwnershipHandoff,buildAgentHandoffProtocol,
 scoreToolReputation,auditToolHealth,buildSemanticCachePlan,compileWorkflowV59,buildSagaCompensationPlan,
 buildRollbackOrchestration,governBackpressure,buildCheckpointJournal,selectResilientProviderV59,
 buildProviderFailoverChain,buildControlCenterCommandContract,buildControlCenterEventContract,evaluateRuntimeSlosV59,
 auditControlFabricConsistency,buildControlFabricSnapshot
} from '../src/v59-engine';

const base=()=>v59FabricSchema.parse({
 objective:'operate safely',nowEpoch:100,maxInFlight:2,eventBudget:10,
 events:[{id:'e1',type:'mission.ready',key:'m2',sequence:1,payloadHash:'a'}],
 missions:[{id:'m1',projectId:'p',state:'DONE'},{id:'m2',projectId:'p',state:'PENDING',dependsOn:['m1'],risk:20,workflowId:'w1'}],
 agents:[{id:'a1',skills:['api'],reliability:95},{id:'a2',skills:['api'],reliability:80}],
 providers:[{id:'p1',healthy:true,successes:10,failures:0,latencyMs:100,cost:1},{id:'p2',healthy:true,successes:5,failures:1,latencyMs:200,cost:1}],
 tools:[{name:'api_verify',healthy:true,successRate:.95,latencyMs:100,capabilities:['api']}],
 workflows:[{id:'w1',steps:[{id:'inspect',action:'inspect'},{id:'deploy',action:'deploy',dependsOn:['inspect'],reversible:true}]}],
 stateRecords:[{key:'mission:m2',version:1,valueHash:'x',adapter:'portable'}],
 cacheEntries:[{key:'api:release',valueHash:'v',fresh:true,confidence:90}],
 commands:[{id:'c1',type:'start',target:'m2',idempotencyKey:'cmd-1',approved:true}],
 slo:[{name:'latency',value:100,target:500,direction:'MAX'}]
});

test('event bus orders events',()=>{assert.deepEqual(buildRuntimeEventBus(base()).events.map(e=>e.id),['e1']);});
test('baseline has no duplicate events',()=>{assert.equal(detectDuplicateEvents(base()).duplicates.length,0);});
test('idempotent event plan schedules unprocessed event',()=>{assert.deepEqual(buildIdempotentEventPlan(base()).process,['e1']);});
test('state adapter contract never claims persistence',()=>{assert.equal(buildDurableStateAdapterContract(base()).persistenceClaim,false);});
test('baseline has no state conflict',()=>{assert.equal(detectStateVersionConflicts(base()).conflicts.length,0);});
test('distributed mission coordinator finds ready mission',()=>{assert.deepEqual(coordinateDistributedMissions(base()).ready,['m2']);});
test('agent handoff protocol is explicit',()=>{assert.ok(buildAgentHandoffProtocol(base()).protocol.includes('checkpoint'));});
test('tool reputation ranks healthy tool',()=>{assert.equal(scoreToolReputation(base()).tools[0].name,'api_verify');});
test('tool health marks baseline healthy',()=>{assert.deepEqual(auditToolHealth(base()).healthy,['api_verify']);});
test('semantic cache accepts fresh high-confidence entry',()=>{assert.deepEqual(buildSemanticCachePlan(base()).usable,['api:release']);});
test('workflow compiler preserves steps',()=>{assert.equal(compileWorkflowV59(base()).workflows[0].stepCount,2);});
test('saga plan includes compensation',()=>{assert.ok(buildSagaCompensationPlan(base()).workflows[0].compensations.length>=1);});
test('rollback orchestration never auto executes',()=>{const i=base();i.missions[1].risk=80;assert.equal(buildRollbackOrchestration(i).missions[0].automaticExecution,false);});
test('backpressure admits baseline work',()=>{assert.equal(governBackpressure(base()).admitNewWork,true);});
test('checkpoint journal never claims persistence',()=>{assert.equal(buildCheckpointJournal(base()).persistenceClaim,false);});
test('resilient provider selects best observed candidate',()=>{assert.equal(selectResilientProviderV59(base()).selected,'p1');});
test('failover chain starts with best provider',()=>{assert.equal(buildProviderFailoverChain(base()).chain[0],'p1');});
test('command contract does not execute mutation',()=>{assert.equal(buildControlCenterCommandContract(base()).mutationExecuted,false);});
test('event contract requires sequence/idempotency',()=>{const r=buildControlCenterEventContract(base());assert.equal(r.sequenceRequired,true);assert.equal(r.idempotencyRequired,true);});
test('runtime SLO baseline passes',()=>{assert.equal(evaluateRuntimeSlosV59(base()).slos[0].state,'PASS');});
test('control fabric consistency baseline clean',()=>{const r=auditControlFabricConsistency(base());assert.equal(Object.values(r).flat().filter(Boolean).length,0);});
test('control fabric snapshot is ready and bounded',()=>{const r=buildControlFabricSnapshot(base());assert.equal(r.status,'READY');assert.equal(r.executionClaim,false);assert.equal(r.persistenceClaim,false);});
