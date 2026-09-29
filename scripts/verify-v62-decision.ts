import assert from 'node:assert/strict';
import { v62DecisionSchema } from '../src/v62-schema';
import {
 fuseDecisionEvidence,scoreDecisionConfidenceV62,calibrateToolConfidenceV62,adjudicateAgentsV62,
 analyzeCounterfactualReleasesV62,routeVerificationEffortV62,buildReleaseDecisionPacketsV62,buildDecisionCoreSnapshotV62
} from '../src/v62-engine';
const i=v62DecisionSchema.parse({
 objective:'decision benchmark',
 evidence:[{id:'e',topic:'release',stance:'SUPPORT',verified:true,fresh:true,confidence:95,sourceQuality:95}],
 decisions:[{id:'d',topic:'release',threshold:60,impact:90,reversibility:50,evidenceRefs:['e']}],
 releases:[{id:'r',readiness:90,risk:20,confidence:90,rollbackReady:true}],
 agents:[{id:'a',vote:'APPROVE',reliability:90,domainFit:90},{id:'b',vote:'APPROVE',reliability:90,domainFit:90}],
 tools:[{name:'verify',observedAccuracy:95,evidenceQuality:95,sampleSize:30,uncertainty:5}],
 scenarios:[{id:'s',releaseId:'r',benefit:90,risk:20,verification:90,reversible:true}],
 verificationCapacity:1
});
assert.ok(fuseDecisionEvidence(i).topics[0].netConfidence>0);
assert.equal(scoreDecisionConfidenceV62(i).decisions[0].state,'READY');
assert.ok(calibrateToolConfidenceV62(i).tools[0].calibrated>80);
assert.equal(adjudicateAgentsV62(i).decision,'APPROVE');
assert.equal(analyzeCounterfactualReleasesV62(i).scenarios[0].simulationOnly,true);
assert.equal(routeVerificationEffortV62(i).selected[0].id,'d');
assert.equal(buildReleaseDecisionPacketsV62(i).packets[0].decision,'EVIDENCE_READY');
const snap=buildDecisionCoreSnapshotV62(i);assert.equal(snap.status,'READY');assert.equal(snap.executionClaim,false);
console.log(JSON.stringify({status:'PASS',evidenceFusion:true,decisionConfidence:true,toolCalibration:true,agentAdjudication:true,counterfactualAnalysis:true,verificationRouting:true,releasePacket:true,decisionCoreSnapshot:true},null,2));
