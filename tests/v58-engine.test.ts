import assert from 'node:assert/strict';
import test from 'node:test';
import { v58OsSchema } from '../src/v58-schema';
import {
 acquireMissionLease,detectMissionLeaseConflicts,buildIdempotentMissionSchedule,buildUnifiedKnowledgeGraphV58,
 detectKnowledgeContradictionsV58,formDynamicAgentTeams,matchToolMarketplace,auditToolMarketCoverage,
 runPredictivePremortem,buildFailurePreventionQueueV58,governExecutionEconomy,allocateProjectBudgets,
 buildPortfolioMissionSchedule,detectPortfolioDeadlocksV58,evaluateOsPolicyState,buildControlCenterBackendV58,
 buildMissionLeaseRenewalPlan,validateMissionContinuationV58,buildToolSupplyDemandMap,auditOperatingSystemConsistency,
 buildEngineeringOsSnapshot
} from '../src/v58-engine';

const base=()=>v58OsSchema.parse({
 objective:'operate portfolio safely',nowEpoch:1000,budget:10,maxConcurrent:2,
 projects:[{id:'p1',priority:10},{id:'p2',dependencies:['p1'],priority:5}],
 missions:[
  {id:'m1',projectId:'p1',state:'DONE',priority:10,idempotencyKey:'a',cost:2,risk:10},
  {id:'m2',projectId:'p1',state:'PENDING',priority:9,dependsOn:['m1'],idempotencyKey:'b',cost:3,risk:30},
  {id:'m3',projectId:'p2',state:'PENDING',priority:5,dependsOn:['m2'],idempotencyKey:'c',cost:4,risk:60}
 ],
 knowledge:[{id:'k1',projectId:'p1',subject:'api',value:'v1',verified:true,fresh:true,confidence:90}],
 agents:[{id:'a1',skills:['api'],reliability:95,cost:1},{id:'a2',skills:['deploy'],reliability:80,cost:2}],
 toolOffers:[{tool:'api_verify',domains:['p1'],capabilities:['api'],quality:95,cost:1,available:true}],
 toolDemand:[{id:'d1',domain:'p1',capability:'api',maxCost:2,minQuality:80}],
 signals:[{id:'s1',projectId:'p2',severity:'HIGH',kind:'failure-risk',verified:true}]
});

test('expired/no lease is acquirable',()=>{assert.equal(acquireMissionLease(base()).missions.find(m=>m.id==='m2')?.acquirable,true);});
test('idempotent schedule selects only eligible missions',()=>{assert.deepEqual(buildIdempotentMissionSchedule(base()).queue,['m2']);});
test('no duplicate idempotency conflicts in baseline',()=>{assert.equal(detectMissionLeaseConflicts(base()).conflicts.length,0);});
test('knowledge graph includes project dependency edge',()=>{assert.deepEqual(buildUnifiedKnowledgeGraphV58(base()).projectEdges,[{from:'p1',to:'p2',type:'PROJECT_DEPENDENCY'}]);});
test('baseline has no verified fresh knowledge contradiction',()=>{assert.equal(detectKnowledgeContradictionsV58(base()).contradictions.length,0);});
test('dynamic agent teams are formed',()=>{assert.ok(formDynamicAgentTeams(base()).teams.length>=1);});
test('tool marketplace matches demand',()=>{assert.equal(matchToolMarketplace(base()).matches[0].selected,'api_verify');});
test('market coverage is complete',()=>{assert.equal(auditToolMarketCoverage(base()).coverage,100);});
test('premortem never claims prediction',()=>{assert.equal(runPredictivePremortem(base()).projects[0].predictionClaim,false);});
test('failure prevention queue surfaces risky project',()=>{assert.ok(buildFailurePreventionQueueV58(base()).queue.some(x=>x.projectId==='p2'));});
test('execution economy respects budget',()=>{const r=governExecutionEconomy(base());assert.ok(r.spent<=r.budget);});
test('budget allocation returns projects',()=>{assert.equal(allocateProjectBudgets(base()).allocations.length,2);});
test('portfolio schedule preserves project dependency',()=>{assert.ok(buildPortfolioMissionSchedule(base()).projects.find(p=>p.projectId==='p2')?.blockedBy.includes('p1'));});
test('baseline has no project dependency cycle',()=>{assert.equal(detectPortfolioDeadlocksV58(base()).cycles.length,0);});
test('OS policy baseline ready',()=>{assert.equal(evaluateOsPolicyState(base()).status,'READY');});
test('control center is non-executing/non-persistent',()=>{const r=buildControlCenterBackendV58(base());assert.equal(r.executionClaim,false);assert.equal(r.persistenceClaim,false);});
test('lease renewal plan never persists automatically',()=>{assert.equal(buildMissionLeaseRenewalPlan(base()).automaticPersistence,false);});
test('continuation valid without lease conflicts',()=>{assert.equal(validateMissionContinuationV58(base()).valid,true);});
test('supply demand map contains matches',()=>{assert.equal(buildToolSupplyDemandMap(base()).matches[0].selected,'api_verify');});
test('OS consistency baseline clean',()=>{assert.equal(Object.values(auditOperatingSystemConsistency(base())).flat().length,0);});
test('OS snapshot ready and bounded',()=>{const r=buildEngineeringOsSnapshot(base());assert.equal(r.status,'READY');assert.equal(r.executionClaim,false);assert.equal(r.persistenceClaim,false);assert.equal(r.predictionClaim,false);});
