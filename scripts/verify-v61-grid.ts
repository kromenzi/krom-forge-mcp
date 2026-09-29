import assert from 'node:assert/strict';
import { v61GridSchema } from '../src/v61-schema';
import {
 detectCriticalProjectPath,prioritizeMissionsV61,scoreEvidenceLineageV61,propagateRiskAcrossProjectsV61,
 balanceProjectCapacityV61,auditDecisionEvidenceV61,buildIntelligenceGridSnapshotV61
} from '../src/v61-engine';
const i=v61GridSchema.parse({
 objective:'grid benchmark',
 projects:[{id:'a',priority:10,capacity:2,risk:20},{id:'b',priority:5,capacity:1,dependencies:['a'],risk:10}],
 missions:[{id:'m1',projectId:'a',priority:10,impact:90,risk:20},{id:'m2',projectId:'b',priority:1,impact:20,risk:10}],
 evidence:[{id:'e',verified:true,fresh:true,confidence:95}],
 decisions:[{id:'d',evidenceRefs:['e']}]
});
assert.deepEqual(detectCriticalProjectPath(i).criticalPath,['a','b']);
assert.equal(prioritizeMissionsV61(i).missions[0].id,'m1');
assert.ok(scoreEvidenceLineageV61(i).evidence[0].score>90);
assert.equal(propagateRiskAcrossProjectsV61(i).projects.length,2);
assert.ok(balanceProjectCapacityV61(i).projects.every(p=>p.state==='OK'));
assert.deepEqual(auditDecisionEvidenceV61(i).supported,['d']);
const snap=buildIntelligenceGridSnapshotV61(i);assert.equal(snap.status,'READY');assert.equal(snap.executionClaim,false);
console.log(JSON.stringify({status:'PASS',criticalPath:true,missionPriority:true,evidenceLineage:true,riskPropagation:true,capacityBalance:true,decisionEvidence:true,intelligenceGridSnapshot:true},null,2));
