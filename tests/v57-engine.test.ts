import assert from 'node:assert/strict';
import test from 'node:test';
import { v57BrainSchema } from '../src/v57-schema';
import {
 buildProjectMemoryIndex,retrieveProjectMemory,compactLongHorizonMemory,scoreKnowledgeFreshness,
 buildCrossProjectDependencyGraph,detectCrossProjectConflicts,scheduleMissions,buildMissionContinuationPlan,
 evaluateToolLearning,rankAdaptiveToolPortfolio,buildEvalDrivenToolLearningPlan,synthesizeSkillCandidate,
 validateSkillCandidate,buildPolicyAwareOrchestration,buildProjectContextPackV57,reasonAcrossProjects,
 buildKnowledgeRefreshPlanV57,buildControlCenterState,auditBrainConsistency,buildAutonomousBrainSnapshot
} from '../src/v57-engine';

const base=()=>v57BrainSchema.parse({
 objective:'secure release api project',
 projects:[
  {id:'p1',name:'API',domain:'api',constraints:['shared-db']},
  {id:'p2',name:'Web',domain:'frontend',dependencies:['p1'],constraints:['shared-db']}
 ],
 memories:[
  {id:'m1',projectId:'p1',kind:'DECISION',text:'secure api release',verified:true,fresh:true,sequence:1,tags:['security','api']},
  {id:'m2',projectId:'p2',kind:'NOTE',text:'frontend waits for api',verified:false,fresh:true,sequence:2,tags:['frontend']}
 ],
 missions:[
  {id:'inspect',projectId:'p1',priority:10,state:'DONE'},
  {id:'release',projectId:'p1',priority:9,state:'PENDING',dependsOn:['inspect'],requiresApproval:true,approved:true},
  {id:'web',projectId:'p2',priority:5,state:'PENDING',dependsOn:['release']}
 ],
 tools:[
  {name:'api_verify',domain:'api',successRate:.95,evidenceQuality:95,latencyMs:100,cost:2,evalScore:90},
  {name:'ui_review',domain:'frontend',successRate:.8,evidenceQuality:70,latencyMs:100,cost:2,evalScore:75}
 ],
 evals:[{toolName:'api_verify',passed:true,score:95,scenario:'api',evidenceVerified:true}],
 policies:[{id:'release-policy',action:'release',effect:'REQUIRE_APPROVAL',priority:10}],
 knowledge:[
  {id:'k1',projectId:'p1',verified:true,fresh:true,content:'api contract'},
  {id:'k2',projectId:'p2',verified:false,fresh:false,content:'old ui note'}
 ],
 contextBudget:6,portfolioBudget:5
});

test('memory index counts project records',()=>{assert.equal(buildProjectMemoryIndex(base()).projects.find(p=>p.projectId==='p1')?.records,1);});
test('memory retrieval favors verified relevant record',()=>{assert.equal(retrieveProjectMemory(base()).results[0].id,'m1');});
test('memory compaction never claims persistence',()=>{assert.equal(compactLongHorizonMemory(base()).persistenceClaim,false);});
test('freshness scores verified fresh knowledge highest',()=>{assert.equal(scoreKnowledgeFreshness(base()).knowledge[0].id,'k1');});
test('cross-project graph preserves dependency',()=>{assert.deepEqual(buildCrossProjectDependencyGraph(base()).edges,[{from:'p1',to:'p2'}]);});
test('cross-project conflicts are visible',()=>{assert.equal(detectCrossProjectConflicts(base()).conflicts.length,1);});
test('mission scheduler honors dependencies and approvals',()=>{assert.equal(scheduleMissions(base()).next,'release');});
test('continuation plan is non-executing',()=>{assert.equal(buildMissionContinuationPlan(base()).executionClaim,false);});
test('tool learning uses verified evals',()=>{assert.equal(evaluateToolLearning(base()).tools.find(t=>t.toolName==='api_verify')?.verifiedObservations,1);});
test('adaptive portfolio stays under budget',()=>{const r=rankAdaptiveToolPortfolio(base());assert.ok(r.spent<=r.budget);});
test('learning plan never mutates weights automatically',()=>{assert.equal(buildEvalDrivenToolLearningPlan(base()).automaticWeightMutation,false);});
test('skill synthesis remains advisory',()=>{assert.equal(synthesizeSkillCandidate(base()).automaticRegistration,false);});
test('skill validation requires human review and eval',()=>{const r=validateSkillCandidate(base());assert.equal(r.requiresHumanReview,true);assert.equal(r.requiresEvalBeforeRegistration,true);});
test('policy-aware orchestration recognizes approved mission',()=>{assert.equal(buildPolicyAwareOrchestration(base()).missions.find(m=>m.id==='release')?.allowed,true);});
test('context pack respects bounded retrieval',()=>{assert.ok(buildProjectContextPackV57(base()).memory.length<=base().contextBudget);});
test('multi-project reasoning surfaces attention projects',()=>{assert.ok(reasonAcrossProjects(base()).attention.includes('p2'));});
test('knowledge refresh identifies stale or unverified records',()=>{assert.ok(buildKnowledgeRefreshPlanV57(base()).refresh.some(x=>x.knowledgeId==='k2'));});
test('control center aggregates brain state',()=>{assert.equal(buildControlCenterState(base()).objective,'secure release api project');});
test('brain consistency passes valid graph',()=>{const r=auditBrainConsistency(base());assert.equal(Object.values(r).flat().length,0);});
test('brain snapshot is ready and non-executing',()=>{const r=buildAutonomousBrainSnapshot(base());assert.equal(r.status,'READY');assert.equal(r.executionClaim,false);assert.equal(r.persistenceClaim,false);});
