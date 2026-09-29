import assert from 'node:assert/strict';
import { v56RuntimeSchema } from '../src/v56-schema';
import {
 replayMissionDeterministically, detectRetryLoop, selectFailoverProvider, detectSemanticToolOverlap,
 evaluateAgentQuorum, propagateEvidenceInvalidation, evaluateRecoveryConfidence, buildSelfHealingCommandSnapshot
} from '../src/v56-engine';

const i=v56RuntimeSchema.parse({
 missionId:'bench',objective:'self heal',
 memory:[{id:'1',content:'a',sequence:2},{id:'0',content:'b',sequence:1}],
 attempts:[{id:'1',actionId:'x',signature:'same',providerId:'p1',toolName:'t'},{id:'2',actionId:'x',signature:'same',providerId:'p1',toolName:'t'}],
 providers:[{id:'p1',failures:5,successes:1,quality:95},{id:'p2',failures:0,successes:5,quality:80}],
 tools:[{name:'api_verify',domain:'api',description:'verify api contract',tags:['api','verify'],successRate:.9},{name:'api_validate',domain:'api',description:'validate api contract',tags:['api','verify'],successRate:.85}],
 evidence:[{id:'e1',verified:true,fresh:true},{id:'e2',verified:true,fresh:true,dependsOn:['e1']}],
 changedEvidenceIds:['e1'],
 actions:[{id:'restore',kind:'RESTORE',evidenceRefs:['e2']}],
 agents:[{id:'a',vote:'APPROVE',reliability:90,evidenceRefs:['e1']},{id:'b',vote:'APPROVE',reliability:80,evidenceRefs:['e1']}]
});
const f1=replayMissionDeterministically(i).replayFingerprint;const f2=replayMissionDeterministically(i).replayFingerprint;assert.equal(f1,f2);
assert.equal(detectRetryLoop(i).loopDetected,true);
assert.equal(selectFailoverProvider(i).selected,'p2');
assert.ok(detectSemanticToolOverlap(i).overlaps.length>=1);
assert.equal(evaluateAgentQuorum(i).decision,'APPROVE');
assert.ok(propagateEvidenceInvalidation(i).invalidatedEvidence.includes('e2'));
assert.equal(evaluateRecoveryConfidence(i).status,'SUPPORTED');
assert.equal(buildSelfHealingCommandSnapshot(i).executionClaim,false);
console.log(JSON.stringify({status:'PASS',replayDeterministic:true,retryLoopGuard:true,providerFailover:true,semanticOverlap:true,agentQuorum:true,evidenceInvalidation:true,recoveryEvidence:true,selfHealingSnapshot:true},null,2));
