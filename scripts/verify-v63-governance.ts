import assert from 'node:assert/strict';
import { v63GovernanceSchema } from '../src/v63-schema';
import {
 buildApprovalChainsV63,detectSegregationOfDutiesViolationsV63,authorizeToolsV63,
 buildReleaseGovernanceGateV63,detectGovernanceDriftV63,evaluateWaiversV63,
 buildGovernanceExecutiveSnapshotV63
} from '../src/v63-engine';

const i=v63GovernanceSchema.parse({
 objective:'governance benchmark',nowEpoch:100,
 policies:[{id:'p',action:'DEPLOY',effect:'REQUIRE_APPROVAL',priority:10,approverRoles:['manager'],maxRisk:80}],
 approvals:[{id:'ap',actionId:'a',actor:'mgr',role:'manager',status:'APPROVED',epoch:90},{id:'apr',actionId:'r',actor:'mgr',role:'manager',status:'APPROVED',epoch:90}],
 actions:[{id:'a',kind:'DEPLOY',requestedBy:'dev',risk:20,tool:'deploy',evidenceRefs:['e']}],
 evidence:[{id:'e',verified:true,fresh:true,confidence:95}],
 roles:[{actor:'dev',roles:['developer']}],
 tools:[{name:'deploy',allowedRoles:['developer'],maxRisk:50,enabled:true}],
 releases:[{id:'r',projectId:'p1',risk:20,evidenceRefs:['e'],requiredApprovals:['manager']}],
 waivers:[{id:'w',scope:'DEPLOY',approvedBy:'mgr',expiresEpoch:200,active:true}],
 baselinePolicyHash:'x',currentPolicyHash:'x'
});
assert.equal(buildApprovalChainsV63(i).chains[0].complete,true);
assert.equal(detectSegregationOfDutiesViolationsV63(i).violations.length,0);
assert.equal(authorizeToolsV63(i).actions[0].authorized,true);
assert.equal(buildReleaseGovernanceGateV63(i).releases[0].state,'READY');
assert.equal(detectGovernanceDriftV63(i).drift,false);
assert.equal(evaluateWaiversV63(i).waivers[0].valid,true);
const snap=buildGovernanceExecutiveSnapshotV63(i);assert.equal(snap.status,'READY');assert.equal(snap.executionClaim,false);
console.log(JSON.stringify({status:'PASS',approvalChains:true,segregationOfDuties:true,toolAuthorization:true,releaseGovernance:true,governanceDrift:true,waiverExpiry:true,governanceSnapshot:true},null,2));
