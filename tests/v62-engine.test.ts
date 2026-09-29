import assert from 'node:assert/strict';
import test from 'node:test';
import { v62DecisionSchema } from '../src/v62-schema';
import {
 fuseDecisionEvidence,accountDecisionUncertainty,scoreDecisionConfidenceV62,detectConflictingEvidenceV62,
 resolveEvidenceConflictsV62,calibrateToolConfidenceV62,decayEvidenceConfidenceV62,evaluateEvidenceSufficiencyV62,
 routeVerificationEffortV62,escalateVerificationV62,adjudicateAgentsV62,analyzeCounterfactualReleasesV62,
 compareDecisionScenariosV62,compressDependencyRiskV62,analyzeRollbackDecisionV62,buildReleaseDecisionPacketsV62,
 enforceDecisionThresholdsV62,buildDecisionCoreHealthV62,auditDecisionCoreConsistencyV62,buildDecisionCoreSnapshotV62
} from '../src/v62-engine';

const base=()=>v62DecisionSchema.parse({
 objective:'release decision',
 evidence:[
  {id:'e1',topic:'release',stance:'SUPPORT',verified:true,fresh:true,confidence:95,sourceQuality:95},
  {id:'e2',topic:'release',stance:'SUPPORT',verified:true,fresh:true,confidence:90,sourceQuality:90}
 ],
 decisions:[{id:'d1',topic:'release',threshold:70,impact:90,reversibility:40,evidenceRefs:['e1','e2']}],
 releases:[{id:'r1',readiness:90,risk:20,confidence:90,rollbackReady:true}],
 agents:[{id:'a1',vote:'APPROVE',reliability:90,domainFit:90},{id:'a2',vote:'APPROVE',reliability:90,domainFit:90}],
 tools:[{name:'verify',observedAccuracy:95,evidenceQuality:95,sampleSize:30,uncertainty:5}],
 scenarios:[{id:'s1',releaseId:'r1',benefit:90,risk:20,verification:90,reversible:true}],
 dependencies:[{from:'core',to:'web',risk:40}],
 verificationCapacity:2
});

test('evidence fusion positive',()=>{assert.ok(fuseDecisionEvidence(base()).topics[0].netConfidence>0);});
test('uncertainty is bounded',()=>{assert.ok(accountDecisionUncertainty(base()).decisions[0].uncertainty<40);});
test('decision confidence ready',()=>{assert.equal(scoreDecisionConfidenceV62(base()).decisions[0].state,'READY');});
test('no evidence conflict in baseline',()=>{assert.equal(detectConflictingEvidenceV62(base()).conflicts.length,0);});
test('conflict resolution requires human review',()=>{const i=base();i.evidence.push({id:'e3',topic:'release',stance:'OPPOSE',verified:true,fresh:true,confidence:80,sourceQuality:80,age:0});assert.equal(resolveEvidenceConflictsV62(i).resolutions[0].requiresHumanReview,true);});
test('tool calibration advisory',()=>{assert.equal(calibrateToolConfidenceV62(base()).automaticMutation,false);});
test('confidence decay keeps baseline confidence',()=>{assert.equal(decayEvidenceConfidenceV62(base()).evidence[0].decayed,95);});
test('evidence sufficiency true',()=>{assert.equal(evaluateEvidenceSufficiencyV62(base()).decisions[0].sufficient,true);});
test('verification routing selects decision',()=>{assert.equal(routeVerificationEffortV62(base()).selected[0].id,'d1');});
test('verification escalation returns array',()=>{assert.ok(Array.isArray(escalateVerificationV62(base()).escalations));});
test('agent adjudication approves',()=>{assert.equal(adjudicateAgentsV62(base()).decision,'APPROVE');});
test('counterfactual scenario is simulation only',()=>{assert.equal(analyzeCounterfactualReleasesV62(base()).scenarios[0].simulationOnly,true);});
test('scenario comparison never executes',()=>{assert.equal(compareDecisionScenariosV62(base()).executed,false);});
test('dependency risk compression returns nodes',()=>{assert.equal(compressDependencyRiskV62(base()).nodes.length,2);});
test('rollback analysis never auto executes',()=>{assert.equal(analyzeRollbackDecisionV62(base()).releases[0].automaticExecution,false);});
test('release packet evidence ready',()=>{assert.equal(buildReleaseDecisionPacketsV62(base()).packets[0].decision,'EVIDENCE_READY');});
test('decision threshold passes',()=>{assert.equal(enforceDecisionThresholdsV62(base()).decisions[0].passes,true);});
test('decision core health reports consensus',()=>{assert.equal(buildDecisionCoreHealthV62(base()).agentConsensus,'APPROVE');});
test('decision core consistency clean',()=>{assert.equal(Object.values(auditDecisionCoreConsistencyV62(base())).flat().length,0);});
test('decision core snapshot ready and non-executing',()=>{const r=buildDecisionCoreSnapshotV62(base());assert.equal(r.status,'READY');assert.equal(r.executionClaim,false);assert.equal(r.persistenceClaim,false);});
