import assert from 'node:assert/strict';
import { v65IdentityDelegationSchema } from '../src/v65-schema';
import { scoreIdentityAssuranceV65, detectAuthorityEscalationV65, evaluateDelegatedActionAuthorizationV65, detectImpersonationSignalsV65, buildIdentityDelegationSnapshotV65 } from '../src/v65-engine';

const i=v65IdentityDelegationSchema.parse({
 objective:'v65 benchmark',nowEpoch:1000,
 evidence:[{id:'e',verified:true,fresh:true,confidence:99}],
 principals:[{id:'root',kind:'OPERATOR',authorityLevel:95,capabilities:['PATCH'],scopes:['repo']},{id:'agent',kind:'AGENT',authorityLevel:70,capabilities:[],scopes:['repo']}],
 delegations:[{id:'d',delegatorId:'root',delegateeId:'agent',capabilities:['PATCH'],scopes:['repo'],maxRisk:35,issuedAt:900,expiresAt:1500,evidenceRefs:['e']}],
 actions:[{id:'a',principalId:'agent',capability:'PATCH',scope:'repo',risk:20,delegationId:'d',evidenceRefs:['e']}],
 identitySignals:[{id:'s',principalId:'agent',type:'VERIFIED_IDENTITY',severity:20,observedAt:950,evidenceRef:'e'}]
});
assert.ok(scoreIdentityAssuranceV65(i).principals.find(x=>x.principalId==='agent')!.score>50);
assert.equal(detectAuthorityEscalationV65(i).violations.length,0);
assert.equal(evaluateDelegatedActionAuthorizationV65(i).actions[0].authorized,true);
assert.equal(detectImpersonationSignalsV65(i).suspected.length,0);
const s=buildIdentityDelegationSnapshotV65(i); assert.equal(s.status,'READY'); assert.equal(s.identityProofClaim,false); assert.equal(s.executionClaim,false);
console.log(JSON.stringify({status:'PASS',identityAssurance:true,delegationAuthorization:true,authorityGuard:true,impersonationGuard:true,identityDelegationSnapshot:true},null,2));
