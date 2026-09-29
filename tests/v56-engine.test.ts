import assert from 'node:assert/strict';
import test from 'node:test';
import { v56RuntimeSchema } from '../src/v56-schema';
import {
 buildSemanticMissionMemory, compactMissionMemory, replayMissionDeterministically, classifyFailureForReplan,
 buildSelfHealingReplan, enforceRetryBudget, detectRetryLoop, updateProviderCircuitBreaker, selectFailoverProvider,
 detectSemanticToolOverlap, recommendToolDeprecations, buildAgentQuorum, evaluateAgentQuorum, compileRuntimePolicy,
 diffRuntimePolicies, propagateEvidenceInvalidation, buildCausalExecutionTrace, evaluateRecoveryConfidence,
 buildRuntimeObservabilitySnapshot, detectRuntimeControlAnomalies, buildSelfHealingCommandSnapshot
} from '../src/v56-engine';

const base=()=>v56RuntimeSchema.parse({
 missionId:'m1',objective:'recover release safely',
 memory:[{id:'m1',kind:'DECISION',content:'inspect',verified:true,sequence:1},{id:'m2',kind:'RESULT',content:'fail',sequence:2}],
 failures:[{id:'f1',class:'RUNTIME',actionId:'deploy',signature:'timeout 504',retryable:true,providerId:'p1',toolName:'deploy'}],
 attempts:[
  {id:'a1',actionId:'deploy',signature:'timeout',providerId:'p1',toolName:'deploy',cost:2},
  {id:'a2',actionId:'deploy',signature:'timeout',providerId:'p1',toolName:'deploy',cost:2}
 ],
 retryBudget:{maxAttempts:3,maxCost:10},
 providers:[
  {id:'p1',capabilities:['deploy'],failures:4,successes:1,circuit:'CLOSED',quality:90,latencyMs:100,cost:1},
  {id:'p2',capabilities:['deploy'],failures:0,successes:5,circuit:'CLOSED',quality:80,latencyMs:200,cost:2}
 ],
 tools:[
  {name:'security_verify',domain:'security',description:'verify security release evidence',tags:['security','verify'],successRate:.95},
  {name:'security_validate',domain:'security',description:'validate security release evidence',tags:['security','verify'],successRate:.80}
 ],
 evidence:[
  {id:'e1',verified:true,fresh:true,confidence:95},
  {id:'e2',verified:true,fresh:true,confidence:90,dependsOn:['e1']}
 ],
 changedEvidenceIds:['e1'],
 actions:[
  {id:'inspect',kind:'INSPECT',risk:10,evidenceRefs:['e1']},
  {id:'rollback',kind:'ROLLBACK',dependsOn:['inspect'],risk:60,evidenceRefs:['e2']}
 ],
 agents:[
  {id:'a',vote:'APPROVE',reliability:90,evidenceRefs:['e1']},
  {id:'b',vote:'APPROVE',reliability:80,evidenceRefs:['e1']}
 ],
 policies:[{id:'prod',effect:'REQUIRE_APPROVAL',actionKinds:['DEPLOY'],minEvidence:1,priority:10}],
 previousPolicies:[{id:'prod',effect:'ALLOW',actionKinds:['DEPLOY'],minEvidence:0,priority:10}],
 metrics:[{name:'error_rate',value:8,threshold:5,direction:'MAX'}]
});

test('semantic memory is ordered and portable',()=>{const r=buildSemanticMissionMemory(base());assert.deepEqual(r.records.map(x=>x.id),['m1','m2']);assert.equal(r.persistenceClaim,false);});
test('memory compaction preserves counts',()=>{assert.equal(compactMissionMemory(base()).sourceCount,2);});
test('mission replay is deterministic',()=>{const i=base();assert.equal(replayMissionDeterministically(i).replayFingerprint,replayMissionDeterministically(i).replayFingerprint);});
test('failure classifier chooses failover or backoff for timeout',()=>{assert.equal(classifyFailureForReplan(base()).failures[0].strategy,'FAILOVER_OR_BACKOFF');});
test('self healing replan never claims mutation',()=>{assert.equal(buildSelfHealingReplan(base()).plan[0].automaticMutation,false);});
test('retry budget stops before unlimited retries',()=>{const r=enforceRetryBudget(base());assert.equal(r.remainingAttempts,1);assert.equal(r.allowed,true);});
test('retry loop detector catches repeated signature',()=>{assert.equal(detectRetryLoop(base()).loopDetected,true);});
test('circuit breaker opens unhealthy provider',()=>{assert.equal(updateProviderCircuitBreaker(base()).providers.find(p=>p.id==='p1')?.circuit,'OPEN');});
test('failover skips open circuit provider',()=>{assert.equal(selectFailoverProvider(base()).selected,'p2');});
test('semantic overlap detects closely related tools',()=>{assert.ok(detectSemanticToolOverlap(base()).overlaps.length>=1);});
test('deprecation remains advisory',()=>{assert.equal(recommendToolDeprecations(base()).automaticDeprecation,false);});
test('agent quorum weights verified evidence',()=>{assert.ok(buildAgentQuorum(base()).votes[0].weight>=80);assert.equal(evaluateAgentQuorum(base()).decision,'APPROVE');});
test('policy compiler is deterministic',()=>{const i=base();assert.equal(compileRuntimePolicy(i).fingerprint,compileRuntimePolicy(i).fingerprint);});
test('policy diff detects changed rule',()=>{assert.deepEqual(diffRuntimePolicies(base()).changed,['prod']);});
test('evidence invalidation propagates transitively',()=>{const r=propagateEvidenceInvalidation(base());assert.ok(r.invalidatedEvidence.includes('e2'));assert.ok(r.impactedActions.includes('rollback'));});
test('causal trace includes action dependency',()=>{assert.ok(buildCausalExecutionTrace(base()).edges.some(e=>e.cause==='inspect'&&e.effect==='rollback'));});
test('recovery confidence requires verified fresh evidence',()=>{assert.equal(evaluateRecoveryConfidence(base()).status,'SUPPORTED');});
test('observability snapshot reports threshold breach',()=>{assert.equal(buildRuntimeObservabilitySnapshot(base()).metrics[0].state,'BREACH');});
test('runtime anomalies include retry loop and metric breach',()=>{const a=detectRuntimeControlAnomalies(base()).anomalies;assert.ok(a.includes('RETRY_LOOP'));assert.ok(a.includes('METRIC:error_rate'));});
test('self-healing command snapshot never claims execution',()=>{assert.equal(buildSelfHealingCommandSnapshot(base()).executionClaim,false);});
