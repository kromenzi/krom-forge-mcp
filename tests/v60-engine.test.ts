import assert from 'node:assert/strict';
import test from 'node:test';
import { v60MeshSchema } from '../src/v60-schema';
import {
 buildEventSourcedRuntime,detectEventSequenceGaps,buildReplayProtection,buildCommandBusEnvelopes,enforceExecutionEnvelopes,
 buildDistributedSchedulerMesh,evaluateAgentConsensus,buildRecoveryQuorum,updateToolReputationFeedback,invalidateSemanticCache,
 advanceSagaState,buildSagaRecoveryPlan,buildCheckpointLineage,aggregateRuntimeTelemetry,governErrorBudget,buildDeadLetterQueuePlan,
 governWorkloadAdmission,buildRuntimeMeshHealth,auditRuntimeMeshConsistency,buildRuntimeMeshControlPlane,buildRuntimeMeshSnapshot,buildRuntimeMeshOperatorBrief
} from '../src/v60-engine';

const base=()=>v60MeshSchema.parse({
 objective:'runtime mesh',
 events:[{id:'e1',stream:'m',sequence:1,type:'ready',hash:'a'},{id:'e2',stream:'m',sequence:2,type:'started',hash:'b'}],
 commands:[{id:'c1',type:'start',target:'w2',idempotencyKey:'k1',policy:'REQUIRE_APPROVAL',approved:true}],
 workloads:[{id:'w1',state:'DONE'},{id:'w2',priority:10,dependsOn:['w1'],risk:20}],
 agents:[{id:'a1',vote:'APPROVE',reliability:90},{id:'a2',vote:'APPROVE',reliability:80}],
 tools:[{name:'verify',successRate:.95,quality:95,latencyMs:100}],
 cache:[{key:'ctx',deps:['api'],fresh:true,confidence:90}],
 sagas:[{id:'s1',state:'RUNNING',steps:[{id:'x',done:true,compensation:'undo-x'}]}],
 checkpoints:[{id:'cp1',workloadId:'w2',verified:true}],
 telemetry:[{name:'latency',value:100,target:500,direction:'MAX'}],
 deadLetters:[{id:'d1',eventId:'x',reason:'poison',retryable:false}],
 changedDeps:['api'],maxConcurrent:2,eventBudget:10
});

test('event source keeps stream',()=>{assert.equal(buildEventSourcedRuntime(base()).streams[0].stream,'m');});
test('baseline has no sequence gaps',()=>{assert.equal(detectEventSequenceGaps(base()).gaps.length,0);});
test('replay protection baseline safe',()=>{assert.equal(buildReplayProtection(base()).replaySafe,true);});
test('approved command envelope authorized',()=>{assert.equal(buildCommandBusEnvelopes(base()).commands[0].authorized,true);});
test('execution envelope allows approved command',()=>{assert.deepEqual(enforceExecutionEnvelopes(base()).allowed,['c1']);});
test('scheduler admits dependency-ready work',()=>{assert.deepEqual(buildDistributedSchedulerMesh(base()).admit,['w2']);});
test('agent consensus approves',()=>{assert.equal(evaluateAgentConsensus(base()).decision,'APPROVE');});
test('recovery quorum still requires host execution',()=>{assert.equal(buildRecoveryQuorum(base()).requiresHostExecution,true);});
test('tool feedback is advisory',()=>{assert.equal(updateToolReputationFeedback(base()).automaticMutation,false);});
test('cache invalidates changed dependency',()=>{assert.deepEqual(invalidateSemanticCache(base()).invalidate,['ctx']);});
test('saga advances when done',()=>{assert.equal(advanceSagaState(base()).sagas[0].to,'COMPLETED');});
test('saga recovery never auto executes',()=>{const i=base();i.sagas[0].state='FAILED';assert.equal(buildSagaRecoveryPlan(i).sagas[0].automaticExecution,false);});
test('checkpoint lineage emits node',()=>{assert.equal(buildCheckpointLineage(base()).nodes.length,1);});
test('telemetry baseline passes',()=>{assert.equal(aggregateRuntimeTelemetry(base()).metrics[0].state,'PASS');});
test('error budget healthy',()=>{assert.equal(governErrorBudget(base()).budgetState,'HEALTHY');});
test('dead letter poison quarantined',()=>{assert.deepEqual(buildDeadLetterQueuePlan(base()).quarantine,['d1']);});
test('workload admission accepts safe work',()=>{assert.deepEqual(governWorkloadAdmission(base()).admitted,['w2']);});
test('mesh health replay safe',()=>{assert.equal(buildRuntimeMeshHealth(base()).replaySafe,true);});
test('mesh consistency baseline clean',()=>{assert.equal(Object.values(auditRuntimeMeshConsistency(base())).flat().filter(Boolean).length,0);});
test('control plane never claims execution',()=>{assert.equal(buildRuntimeMeshControlPlane(base()).executionClaim,false);});
test('mesh snapshot ready',()=>{assert.equal(buildRuntimeMeshSnapshot(base()).status,'READY');});
test('operator brief has evidence boundary',()=>{assert.ok(buildRuntimeMeshOperatorBrief(base()).evidenceBoundary.includes('Observed inputs'));});
