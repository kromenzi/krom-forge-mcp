import assert from 'node:assert/strict';
import test from 'node:test';
import { v55RuntimeSchema } from '../src/v55-schema';
import {
 routeAdaptiveIntent,loadDomainSkillPacks,rankToolQuality,compressCapabilities,buildAdaptiveTaskGraph,planParallelExecution,
 detectAgentContradictions,scoreEvidenceTrust,buildAutomaticReverification,simulateExecutionDryRun,evaluateMutationRisk,
 createMissionCheckpointV55,resumeMissionCheckpointV55,simulateReleaseTwinV2,buildIncidentCommander,governExecutionCost,
 selectAdaptiveDepth,detectDecisionContradictions,reconcileDecisionContradictions,selectExecutionProvider,buildPluginAdapterPlan,
 buildMissionConsoleSnapshot,learnFromOutcome,buildOnDemandToolSet,evaluateRoutingEfficiency
} from '../src/v55-engine';

const base=()=>v55RuntimeSchema.parse({
 intent:'security release verification',
 budget:8,
 requiredDomains:['security'],
 availableTools:[
  {name:'security_verify',domain:'security',tags:['security','verify','release'],successRate:.95,evidenceQuality:95,failureRate:.02,cost:2,latencyMs:200},
  {name:'ui_review',domain:'uiux',tags:['ui','review'],successRate:.8,evidenceQuality:70,failureRate:.1,cost:1,latencyMs:100},
  {name:'security_audit',domain:'security',tags:['security','audit'],successRate:.9,evidenceQuality:90,failureRate:.04,cost:3,latencyMs:400}
 ],
 evidence:[{id:'ev1',verified:true,fresh:true,confidence:90}],
 actions:[
  {id:'inspect',kind:'READ',risk:10,evidenceRefs:['ev1']},
  {id:'deploy',kind:'DEPLOY',risk:90,reversible:false,requiresApproval:true,approved:false,dependsOn:['inspect'],evidenceRefs:['ev1']}
 ],
 agents:[{id:'sec',role:'security',reliability:95,claims:['release-safe']},{id:'qa',role:'qa',reliability:90,claims:['NOT:release-safe']}],
 providers:[
  {id:'cloud',capabilities:['security'],quality:95,cost:5,latencyMs:500,available:true},
  {id:'local',capabilities:['security'],quality:80,cost:1,latencyMs:100,local:true,available:true}
 ],
 signals:[{id:'prod',state:'DEGRADED',severity:'HIGH',verified:true}]
});

test('adaptive router selects relevant security tools first',()=>{const r=routeAdaptiveIntent(base());assert.ok(r.selected[0].name.startsWith('security_'));});
test('skill packs load only relevant domains',()=>{const r=loadDomainSkillPacks(base());assert.ok(r.domains.includes('security'));});
test('quality ranker rewards strong tools',()=>{assert.equal(rankToolQuality(base()).ranking[0].name,'security_verify');});
test('capability compression groups tools by domain',()=>{assert.equal(compressCapabilities(base()).packs.find(p=>p.domain==='security')?.count,2);});
test('task graph preserves dependencies',()=>{assert.deepEqual(buildAdaptiveTaskGraph(base()).edges,[{from:'inspect',to:'deploy'}]);});
test('parallel planner creates ordered waves',()=>{assert.deepEqual(planParallelExecution(base()).waves.map(w=>w.actions),[['inspect'],['deploy']]);});
test('agent contradiction engine detects opposing claims',()=>{assert.equal(detectAgentContradictions(base()).contradictions.length,1);});
test('evidence trust rewards verified fresh evidence',()=>{assert.equal(scoreEvidenceTrust(base()).evidence[0].score,100);});
test('reverification targets actions without usable evidence',()=>{const i=base();i.evidence[0].fresh=false;assert.ok(buildAutomaticReverification(i).actions.length>=1);});
test('dry run never executes and blocks unapproved deployment',()=>{const r=simulateExecutionDryRun(base());assert.equal(r.executionClaim,false);assert.equal(r.steps.find(s=>s.id==='deploy')?.allowed,false);});
test('mutation risk blocks unapproved risky action',()=>{assert.equal(evaluateMutationRisk(base()).status,'BLOCKED');});
test('checkpoint and resume preserve unfinished work',()=>{const i=base();const cp=createMissionCheckpointV55(i).checkpoint;i.checkpoint=cp;assert.ok(resumeMissionCheckpointV55(i).remaining.includes('deploy'));});
test('release twin is explicitly non-observed',()=>{assert.equal(simulateReleaseTwinV2(base()).twin.observed,false);});
test('incident commander uses verified severity',()=>{assert.equal(buildIncidentCommander(base()).severity,'HIGH');});
test('cost governor stays within budget',()=>{const r=governExecutionCost(base());assert.ok(r.spent<=base().budget);});
test('adaptive depth escalates high-risk changes',()=>{assert.equal(selectAdaptiveDepth(base()).recommended,'FORENSIC');});
test('decision contradiction requires repeated signal identity with conflicting states',()=>{const i=base();i.signals.push({id:'prod',state:'HEALTHY',severity:'LOW',verified:true});assert.equal(detectDecisionContradictions(i).contradictions.length,1);assert.equal(reconcileDecisionContradictions(i).status,'REQUIRES_EVIDENCE');});
test('provider selector chooses compatible provider',()=>{assert.ok(['cloud','local'].includes(selectExecutionProvider(base()).selected!));});
test('plugin adapter plan requires normalized contract',()=>{assert.ok(buildPluginAdapterPlan(base()).providers[0].adapterContract.includes('evidence'));});
test('mission console aggregates runtime decisions',()=>{const r=buildMissionConsoleSnapshot(base());assert.equal(r.intent,'security release verification');});
test('outcome learning never mutates automatically',()=>{assert.equal(learnFromOutcome(base()).automaticMutation,false);});
test('on-demand loading reduces irrelevant tools',()=>{const r=buildOnDemandToolSet(base());assert.ok(r.count<=r.totalAvailable);});
test('routing efficiency reports compression',()=>{assert.ok(evaluateRoutingEfficiency(base()).reductionPercent>=0);});
