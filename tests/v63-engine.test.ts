import assert from 'node:assert/strict';
import test from 'node:test';
import { v63GovernanceSchema } from '../src/v63-schema';
import {
 reasonGovernancePolicy,buildApprovalChainsV63,detectSegregationOfDutiesViolationsV63,evaluateWaiversV63,
 auditEvidenceAttestationsV63,authorizeToolsV63,evaluateChangeGovernanceV63,buildReleaseGovernanceGateV63,
 detectGovernanceDriftV63,compileGovernanceAuditTrailV63,buildComplianceDecisionPacketsV63,
 evaluateCrossProjectRiskGovernanceV63,buildExceptionRegisterV63,evaluateEmergencyOverrideV63,
 buildGovernanceApprovalMatrixV63,detectApprovalExpiryRiskV63,buildGovernanceEvidenceMatrixV63,
 auditGovernanceConsistencyV63,buildGovernanceExecutiveSnapshotV63,buildGovernanceOperatorBriefV63
} from '../src/v63-engine';

const base=()=>v63GovernanceSchema.parse({
 objective:'govern release',nowEpoch:1000,
 policies:[{id:'p1',action:'DEPLOY',effect:'REQUIRE_APPROVAL',priority:10,approverRoles:['manager'],maxRisk:80}],
 approvals:[{id:'ap1',actionId:'a1',actor:'manager1',role:'manager',status:'APPROVED',epoch:900},{id:'ap2',actionId:'r1',actor:'manager1',role:'manager',status:'APPROVED',epoch:900}],
 actions:[{id:'a1',kind:'DEPLOY',projectId:'core',requestedBy:'dev1',risk:40,tool:'deploy-tool',evidenceRefs:['e1']}],
 evidence:[{id:'e1',verified:true,fresh:true,confidence:95,attestationId:'at1'}],
 attestations:[{id:'at1',evidenceId:'e1',issuer:'ci',issuedEpoch:800,signatureObserved:true}],
 waivers:[{id:'w1',scope:'DEPLOY',approvedBy:'manager1',expiresEpoch:2000,reason:'temporary'}],
 roles:[{actor:'dev1',roles:['developer']}],
 tools:[{name:'deploy-tool',allowedRoles:['developer'],maxRisk:60,enabled:true}],
 releases:[{id:'r1',projectId:'core',risk:30,evidenceRefs:['e1'],requiredApprovals:['manager']}],
 auditEvents:[{id:'ev1',kind:'APPROVAL',actor:'manager1',actionId:'a1',epoch:900,evidenceRefs:['e1']}],
 baselinePolicyHash:'abc',currentPolicyHash:'abc'
});

test('policy requires approval',()=>{assert.equal(reasonGovernancePolicy(base()).actions[0].effect,'REQUIRE_APPROVAL');});
test('approval chain complete',()=>{assert.equal(buildApprovalChainsV63(base()).chains[0].complete,true);});
test('baseline has no SoD violation',()=>{assert.equal(detectSegregationOfDutiesViolationsV63(base()).violations.length,0);});
test('waiver valid before expiry',()=>{assert.equal(evaluateWaiversV63(base()).waivers[0].valid,true);});
test('attestation observed without signature verification claim',()=>{const r=auditEvidenceAttestationsV63(base());assert.equal(r.evidence[0].attested,true);assert.equal(r.signatureVerificationClaim,false);});
test('tool authorization passes role/risk',()=>{assert.equal(authorizeToolsV63(base()).actions[0].authorized,true);});
test('change governance ready',()=>{assert.equal(evaluateChangeGovernanceV63(base()).actions[0].state,'GOVERNED_READY');});
test('release governance ready',()=>{assert.equal(buildReleaseGovernanceGateV63(base()).releases[0].state,'READY');});
test('no policy drift baseline',()=>{assert.equal(detectGovernanceDriftV63(base()).drift,false);});
test('audit trail non-persistent',()=>{assert.equal(compileGovernanceAuditTrailV63(base()).persistenceClaim,false);});
test('compliance packet makes no compliance claim',()=>{assert.equal(buildComplianceDecisionPacketsV63(base()).packets[0].complianceClaim,false);});
test('cross-project governance returns project',()=>{assert.equal(evaluateCrossProjectRiskGovernanceV63(base()).projects[0].projectId,'core');});
test('exception register is portable',()=>{assert.equal(buildExceptionRegisterV63(base()).persistenceClaim,false);});
test('emergency override requires human approval',()=>{const i=base();i.actions.push({id:'em1',kind:'EMERGENCY_OVERRIDE',requestedBy:'ops',risk:90,evidenceRefs:[]});assert.equal(evaluateEmergencyOverrideV63(i).actions[0].requiresHumanApproval,true);});
test('approval matrix includes manager',()=>{assert.ok(buildGovernanceApprovalMatrixV63(base()).matrix[0].approvedRoles.includes('manager'));});
test('baseline has no expired waiver',()=>{assert.equal(detectApprovalExpiryRiskV63(base()).expiredWaivers.length,0);});
test('governance evidence matrix verified',()=>{assert.equal(buildGovernanceEvidenceMatrixV63(base()).actions[0].evidence[0].verified,true);});
test('governance consistency clean',()=>{assert.equal(Object.values(auditGovernanceConsistencyV63(base())).flat().length,0);});
test('executive snapshot ready and bounded',()=>{const r=buildGovernanceExecutiveSnapshotV63(base());assert.equal(r.status,'READY');assert.equal(r.approvalClaim,false);assert.equal(r.executionClaim,false);});
test('operator brief carries evidence boundary',()=>{assert.ok(buildGovernanceOperatorBriefV63(base()).evidenceBoundary.includes('supplied policy'));});
