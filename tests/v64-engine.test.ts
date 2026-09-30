import assert from 'node:assert/strict';
import test from 'node:test';
import { v64TrustRuntimeSchema } from '../src/v64-schema';
import {
  scoreAdaptivePrincipalTrustV64, detectTrustDriftV64, evaluateSessionRiskV64,
  buildCapabilityGrantMatrixV64, evaluateRevocationStateV64, detectPrivilegeEscalationV64,
  detectBehaviorAnomaliesV64, buildTrustBudgetV64, consumeTrustBudgetV64,
  detectTrustPolicyConflictsV64, auditTrustEvidenceCoverageV64, evaluateContinuousAuthorizationV64,
  routeHighRiskActionsV64, buildQuarantinePlanV64, evaluateRehabilitationV64,
  buildRuntimeTrustLedgerV64, buildTrustDecisionPacketsV64, auditAdaptiveTrustConsistencyV64,
  evaluateTrustRuntimeHealthV64, buildAdaptiveTrustRuntimeSnapshotV64
} from '../src/v64-engine';

const base=()=>v64TrustRuntimeSchema.parse({
  objective:'continuous trust runtime',
  nowEpoch:10000,
  evidence:[{id:'e1',verified:true,fresh:true,confidence:95}],
  principals:[{id:'agent1',kind:'AGENT',baselineTrust:80,capabilities:['PATCH'],allowedScopes:['repo']}],
  sessions:[{id:'s1',principalId:'agent1',scope:'repo',evidenceRefs:['e1'],risk:20,startedAt:9000,lastSeenAt:9900}],
  signals:[{id:'sig1',principalId:'agent1',type:'VERIFIED_RESULT',weight:10,observedAt:9950,evidenceRef:'e1'}],
  policies:[{id:'p1',capability:'PATCH',scope:'repo',minTrust:70,maxRisk:40,requireFreshEvidence:true,effect:'ALLOW',priority:10}],
  actions:[{id:'a1',sessionId:'s1',capability:'PATCH',scope:'repo',risk:20,evidenceRefs:['e1']}]
});

test('adaptive trust rises with verified results',()=>assert.ok(scoreAdaptivePrincipalTrustV64(base()).principals[0].score>80));
test('baseline has no significant drift',()=>assert.equal(detectTrustDriftV64(base()).drift.length,1));
test('session stays non-stale',()=>assert.equal(evaluateSessionRiskV64(base()).sessions[0].stale,false));
test('capability matrix includes PATCH',()=>assert.ok(buildCapabilityGrantMatrixV64(base()).grants[0].capabilities.includes('PATCH')));
test('baseline has no revocations',()=>assert.equal(evaluateRevocationStateV64(base()).revoked.length,0));
test('baseline has no privilege escalation',()=>assert.equal(detectPrivilegeEscalationV64(base()).violations.length,0));
test('baseline has no anomalies',()=>assert.equal(detectBehaviorAnomaliesV64(base()).principals.length,0));
test('trust budget positive',()=>assert.ok(buildTrustBudgetV64(base()).budgets[0].budget>0));
test('trust budget not exhausted',()=>assert.equal(consumeTrustBudgetV64(base()).principals[0].exhausted,false));
test('no policy conflicts',()=>assert.equal(detectTrustPolicyConflictsV64(base()).conflicts.length,0));
test('evidence coverage complete',()=>assert.equal(auditTrustEvidenceCoverageV64(base()).actions[0].covered,true));
test('action continuously authorized',()=>assert.equal(evaluateContinuousAuthorizationV64(base()).actions[0].disposition,'ALLOW'));
test('low risk action auto eligible',()=>assert.deepEqual(routeHighRiskActionsV64(base()).autoEligible,['a1']));
test('no quarantine baseline',()=>assert.equal(buildQuarantinePlanV64(base()).quarantine.length,0));
test('rehabilitation eligibility evidence bounded',()=>assert.equal(evaluateRehabilitationV64(base()).principals[0].eligible,true));
test('ledger does not claim persistence',()=>assert.equal(buildRuntimeTrustLedgerV64(base()).persistenceClaim,false));
test('decision packet does not claim execution',()=>assert.equal(buildTrustDecisionPacketsV64(base()).packets[0].executionClaim,false));
test('consistency clean',()=>assert.equal(Object.values(auditAdaptiveTrustConsistencyV64(base())).flat().length,0));
test('runtime health is healthy enough',()=>assert.ok(evaluateTrustRuntimeHealthV64(base()).averageTrust>80));
test('snapshot ready and bounded',()=>{const s=buildAdaptiveTrustRuntimeSnapshotV64(base());assert.equal(s.status,'READY');assert.equal(s.executionClaim,false);assert.equal(s.certificationClaim,false)});
