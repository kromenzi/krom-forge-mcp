import assert from 'node:assert/strict';
import test from 'node:test';
import { v65IdentityDelegationSchema } from '../src/v65-schema';
import { buildPrincipalIdentityGraphV65, scoreIdentityAssuranceV65, detectImpersonationSignalsV65, buildDelegationGraphV65, evaluateDelegationExpiryV65, evaluateDelegationDepthV65, evaluateSubdelegationRightsV65, buildAuthorityEnvelopeV65, detectAuthorityEscalationV65, buildCapabilityDelegationMatrixV65, propagateDelegationRevocationsV65, evaluateDelegatedActionAuthorizationV65, detectDelegatedAuthorityConflictsV65, buildDelegatedRiskBudgetV65, evaluateBreakGlassAuthorityV65, auditIdentityEvidenceCoverageV65, buildAuthorityLineageV65, auditIdentityDelegationConsistencyV65, buildIdentityDelegationHealthV65, buildIdentityDelegationSnapshotV65 } from '../src/v65-engine';

const base=()=>v65IdentityDelegationSchema.parse({
 objective:'identity delegation',nowEpoch:1000,
 evidence:[{id:'e1',verified:true,fresh:true,confidence:95,subjectId:'root'}],
 principals:[
  {id:'root',kind:'OPERATOR',authorityLevel:90,capabilities:['PATCH','DEPLOY'],scopes:['repo'],active:true},
  {id:'agent',kind:'AGENT',authorityLevel:70,capabilities:[],scopes:['repo'],active:true,parentPrincipalId:'root'}
 ],
 delegations:[{id:'d1',delegatorId:'root',delegateeId:'agent',capabilities:['PATCH'],scopes:['repo'],maxRisk:40,issuedAt:900,expiresAt:2000,allowSubdelegation:false,maxDepth:1,evidenceRefs:['e1']}],
 actions:[{id:'a1',principalId:'agent',capability:'PATCH',scope:'repo',risk:20,delegationId:'d1',evidenceRefs:['e1']}],
 identitySignals:[{id:'s1',principalId:'agent',type:'VERIFIED_IDENTITY',severity:20,observedAt:950,evidenceRef:'e1'}]
});
test('identity graph clean',()=>assert.equal(buildPrincipalIdentityGraphV65(base()).danglingParents.length,0));
test('identity assurance positive',()=>assert.ok(scoreIdentityAssuranceV65(base()).principals.find(x=>x.principalId==='agent')!.score>50));
test('no impersonation baseline',()=>assert.equal(detectImpersonationSignalsV65(base()).suspected.length,0));
test('delegation graph acyclic',()=>assert.equal(buildDelegationGraphV65(base()).cycles.length,0));
test('delegation active',()=>assert.equal(evaluateDelegationExpiryV65(base()).delegations[0].active,true));
test('delegation depth bounded',()=>assert.equal(evaluateDelegationDepthV65(base()).principals.find(x=>x.principalId==='agent')!.exceeds,false));
test('subdelegation clean',()=>assert.equal(evaluateSubdelegationRightsV65(base()).violations.length,0));
test('authority envelope active',()=>assert.equal(buildAuthorityEnvelopeV65(base()).delegations[0].active,true));
test('no authority escalation',()=>assert.equal(detectAuthorityEscalationV65(base()).violations.length,0));
test('delegated capability present',()=>assert.ok(buildCapabilityDelegationMatrixV65(base()).principals.find(x=>x.principalId==='agent')!.delegatedCapabilities.includes('PATCH')));
test('no revocation baseline',()=>assert.equal(propagateDelegationRevocationsV65(base()).revoked.length,0));
test('delegated action authorized',()=>assert.equal(evaluateDelegatedActionAuthorizationV65(base()).actions[0].authorized,true));
test('no authority conflicts',()=>assert.equal(detectDelegatedAuthorityConflictsV65(base()).conflicts.length,0));
test('risk budget exists',()=>assert.ok(buildDelegatedRiskBudgetV65(base()).delegations[0].budget>0));
test('no break glass baseline',()=>assert.equal(evaluateBreakGlassAuthorityV65(base()).delegations.length,0));
test('identity evidence covered',()=>assert.equal(auditIdentityEvidenceCoverageV65(base()).delegations[0].covered,true));
test('authority lineage present',()=>assert.deepEqual(buildAuthorityLineageV65(base()).lineage.find(x=>x.principalId==='agent')!.ancestors,['root']));
test('consistency clean',()=>assert.equal(Object.values(auditIdentityDelegationConsistencyV65(base())).flat().length,0));
test('health clean',()=>assert.equal(buildIdentityDelegationHealthV65(base()).escalationViolations,0));
test('snapshot ready and bounded',()=>{const s=buildIdentityDelegationSnapshotV65(base());assert.equal(s.status,'READY');assert.equal(s.identityProofClaim,false);assert.equal(s.executionClaim,false);});
