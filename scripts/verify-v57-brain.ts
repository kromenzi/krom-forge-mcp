import assert from 'node:assert/strict';
import { v57BrainSchema } from '../src/v57-schema';
import {
 retrieveProjectMemory,scheduleMissions,rankAdaptiveToolPortfolio,synthesizeSkillCandidate,
 buildProjectContextPackV57,auditBrainConsistency,buildAutonomousBrainSnapshot
} from '../src/v57-engine';

const i=v57BrainSchema.parse({
 objective:'security api release',
 projects:[{id:'p1',domain:'api'}],
 memories:[
  {id:'good',projectId:'p1',text:'security api release',verified:true,fresh:true,sequence:1,tags:['security','api']},
  {id:'bad',projectId:'p1',text:'unrelated ui',verified:false,fresh:false,sequence:2,tags:['ui']}
 ],
 missions:[{id:'a',projectId:'p1',state:'DONE'},{id:'b',projectId:'p1',priority:10,dependsOn:['a'],requiresApproval:true,approved:true}],
 tools:[
  {name:'api_security',domain:'api',successRate:.95,evidenceQuality:95,evalScore:95,cost:1,latencyMs:100},
  {name:'generic',domain:'general',successRate:.5,evidenceQuality:50,evalScore:50,cost:1,latencyMs:100}
 ],
 evals:[{toolName:'api_security',passed:true,score:98,evidenceVerified:true}],
 knowledge:[{id:'k',projectId:'p1',verified:true,fresh:true,content:'api'}],
 contextBudget:3,portfolioBudget:2
});
assert.equal(retrieveProjectMemory(i).results[0].id,'good');
assert.equal(scheduleMissions(i).next,'b');
assert.equal(rankAdaptiveToolPortfolio(i).selected[0].name,'api_security');
assert.equal(synthesizeSkillCandidate(i).automaticRegistration,false);
assert.ok(buildProjectContextPackV57(i).memory.length<=3);
assert.equal(Object.values(auditBrainConsistency(i)).flat().length,0);
const snap=buildAutonomousBrainSnapshot(i);assert.equal(snap.status,'READY');assert.equal(snap.executionClaim,false);
console.log(JSON.stringify({status:'PASS',memoryRetrieval:true,missionScheduling:true,evalDrivenPortfolio:true,skillSynthesisGuard:true,boundedContext:true,consistency:true,brainSnapshot:true},null,2));
