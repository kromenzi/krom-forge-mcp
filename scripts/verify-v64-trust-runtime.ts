import assert from 'node:assert/strict';
import { v64TrustRuntimeSchema } from '../src/v64-schema';
import { scoreAdaptivePrincipalTrustV64, evaluateContinuousAuthorizationV64, detectPrivilegeEscalationV64, buildQuarantinePlanV64, buildAdaptiveTrustRuntimeSnapshotV64 } from '../src/v64-engine';

const i=v64TrustRuntimeSchema.parse({
  objective:'v64 benchmark',nowEpoch:10000,
  evidence:[{id:'e',verified:true,fresh:true,confidence:95}],
  principals:[{id:'agent',baselineTrust:85,capabilities:['PATCH'],allowedScopes:['repo']}],
  sessions:[{id:'s',principalId:'agent',scope:'repo',evidenceRefs:['e'],risk:15,lastSeenAt:9950}],
  signals:[{id:'sig',principalId:'agent',type:'VERIFIED_RESULT',weight:8,observedAt:9950,evidenceRef:'e'}],
  policies:[{id:'p',capability:'PATCH',scope:'repo',minTrust:70,maxRisk:40,effect:'ALLOW',priority:10}],
  actions:[{id:'a',sessionId:'s',capability:'PATCH',scope:'repo',risk:15,evidenceRefs:['e']}]
});

assert.ok(scoreAdaptivePrincipalTrustV64(i).principals[0].score>85);
assert.equal(evaluateContinuousAuthorizationV64(i).actions[0].disposition,'ALLOW');
assert.equal(detectPrivilegeEscalationV64(i).violations.length,0);
assert.equal(buildQuarantinePlanV64(i).quarantine.length,0);
const s=buildAdaptiveTrustRuntimeSnapshotV64(i);
assert.equal(s.status,'READY');
assert.equal(s.executionClaim,false);
console.log(JSON.stringify({status:'PASS',adaptiveTrust:true,continuousAuthorization:true,privilegeGuard:true,quarantineControl:true,trustRuntimeSnapshot:true},null,2));
