import assert from 'node:assert/strict';
import test from 'node:test';
import { v61GridSchema } from '../src/v61-schema';
import {
 buildProjectDependencyIntelligence,detectCriticalProjectPath,prioritizeMissionsV61,buildEvidenceProvenanceGraphV61,
 scoreEvidenceLineageV61,simulatePolicyEffectsV61,arbitrateReleasesV61,correlateAnomaliesV61,matchAgentSpecializationsV61,
 optimizeToolPortfolioV61,detectChangeClustersV61,propagateRiskAcrossProjectsV61,buildImpactWeightedVerificationPlanV61,
 balanceProjectCapacityV61,compileDecisionLedgerV61,auditDecisionEvidenceV61,buildGridExecutiveSnapshotV61,
 auditIntelligenceGridConsistency,buildIntelligenceGridSnapshotV61,buildGridOperatorBriefV61
} from '../src/v61-engine';

const base=()=>v61GridSchema.parse({
 objective:'coordinate portfolio',
 projects:[{id:'core',priority:10,capacity:2,risk:20},{id:'web',priority:5,capacity:1,dependencies:['core'],risk:10}],
 missions:[{id:'core-api',projectId:'core',priority:10,impact:90,risk:40},{id:'web-ui',projectId:'web',priority:5,impact:60,risk:20}],
 evidence:[{id:'e1',verified:true,fresh:true,confidence:90}],
 policies:[{id:'p',action:'core-api',effect:'REQUIRE_APPROVAL',priority:10}],
 anomalies:[{id:'a1',projectId:'core',kind:'latency',severity:'HIGH',signature:'latency'}],
 agents:[{id:'agent-api',skills:['core','api'],reliability:95,cost:1}],
 tools:[{name:'verify',quality:95,successRate:.95,latencyMs:100,cost:1}],
 releases:[{id:'r1',projectId:'core',risk:20,readiness:90}],
 decisions:[{id:'d1',kind:'RELEASE',projectId:'core',rationale:'verified',evidenceRefs:['e1']}],
 budget:5
});

test('dependency intelligence ranks connected project',()=>{assert.ok(buildProjectDependencyIntelligence(base()).projects.length===2);});
test('critical path includes dependency chain',()=>{assert.deepEqual(detectCriticalProjectPath(base()).criticalPath,['core','web']);});
test('mission prioritization puts core first',()=>{assert.equal(prioritizeMissionsV61(base()).missions[0].id,'core-api');});
test('evidence provenance graph emits node',()=>{assert.equal(buildEvidenceProvenanceGraphV61(base()).nodes.length,1);});
test('verified fresh evidence scores high',()=>{assert.ok(scoreEvidenceLineageV61(base()).evidence[0].score>80);});
test('policy simulation never executes',()=>{assert.equal(simulatePolicyEffectsV61(base()).missions[0].executed,false);});
test('release arbitration scores readiness minus risk',()=>{assert.equal(arbitrateReleasesV61(base()).order[0].score,70);});
test('anomaly correlation groups supplied anomaly',()=>{assert.equal(correlateAnomaliesV61(base()).clusters[0].count,1);});
test('agent specialization assigns available agent',()=>{assert.equal(matchAgentSpecializationsV61(base()).missions[0].agent,'agent-api');});
test('tool portfolio respects budget',()=>{const r=optimizeToolPortfolioV61(base());assert.ok(r.spent<=r.budget);});
test('change clusters group missions by project',()=>{assert.equal(detectChangeClustersV61(base()).clusters.length,2);});
test('risk propagation inherits dependency risk',()=>{assert.ok(propagateRiskAcrossProjectsV61(base()).projects.length===2);});
test('verification plan selects forensic for high impact-risk',()=>{assert.equal(buildImpactWeightedVerificationPlanV61(base()).missions[0].verificationDepth,'FORENSIC');});
test('capacity balancing marks baseline OK',()=>{assert.ok(balanceProjectCapacityV61(base()).projects.every(p=>p.state==='OK'));});
test('decision ledger does not claim persistence',()=>{assert.equal(compileDecisionLedgerV61(base()).persistenceClaim,false);});
test('decision evidence marks supported',()=>{assert.deepEqual(auditDecisionEvidenceV61(base()).supported,['d1']);});
test('executive snapshot aggregates core intelligence',()=>{assert.equal(buildGridExecutiveSnapshotV61(base()).missions.missions[0].id,'core-api');});
test('consistency baseline clean',()=>{assert.equal(Object.values(auditIntelligenceGridConsistency(base())).flat().length,0);});
test('grid snapshot ready and non-executing',()=>{const r=buildIntelligenceGridSnapshotV61(base());assert.equal(r.status,'READY');assert.equal(r.executionClaim,false);});
test('operator brief exposes evidence boundary',()=>{assert.ok(buildGridOperatorBriefV61(base()).evidenceBoundary.includes('supplied project state'));});
