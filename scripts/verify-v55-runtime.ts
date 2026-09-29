import assert from 'node:assert/strict';
import { v55RuntimeSchema } from '../src/v55-schema';
import { routeAdaptiveIntent, evaluateRoutingEfficiency, simulateExecutionDryRun, selectExecutionProvider, detectAgentContradictions } from '../src/v55-engine';

const cases=[
 {intent:'debug production api failure',expected:'debugging'},
 {intent:'security authorization audit',expected:'security'},
 {intent:'database migration verification',expected:'database'},
 {intent:'ui accessibility review',expected:'uiux'},
 {intent:'release rollback readiness',expected:'release'}
];
let passed=0;
for(const c of cases){
 const input=v55RuntimeSchema.parse({intent:c.intent,availableTools:[
  {name:`${c.expected}_primary`,domain:c.expected,tags:c.intent.split(' '),successRate:.95,evidenceQuality:95,failureRate:.01,cost:1,latencyMs:100},
  {name:'generic_other',domain:'general',tags:['misc'],successRate:.6,evidenceQuality:50,failureRate:.2,cost:1,latencyMs:100}
 ]});
 const routed=routeAdaptiveIntent(input);
 assert.equal(routed.selected[0]?.domain,c.expected);
 passed++;
}
const large=v55RuntimeSchema.parse({intent:'security verify release',requiredDomains:['security'],availableTools:Array.from({length:100},(_,n)=>({name:n<5?`security_${n}`:`general_${n}`,domain:n<5?'security':'general',tags:n<5?['security','verify','release']:['misc'],successRate:.8,evidenceQuality:80,failureRate:.1,cost:1,latencyMs:100}))});
const eff=evaluateRoutingEfficiency(large);assert.ok(eff.loaded<=25);assert.ok(eff.reductionPercent>=75);
const dry=v55RuntimeSchema.parse({intent:'deploy',evidence:[{id:'e',verified:true,fresh:true}],actions:[{id:'prod',kind:'DEPLOY',requiresApproval:true,approved:false,evidenceRefs:['e']}]});assert.equal(simulateExecutionDryRun(dry).steps[0].allowed,false);
const provider=v55RuntimeSchema.parse({intent:'security',requiredDomains:['security'],providers:[{id:'bad',capabilities:['ui'],quality:100},{id:'good',capabilities:['security'],quality:80}]});assert.equal(selectExecutionProvider(provider).selected,'good');
const conflict=v55RuntimeSchema.parse({intent:'review',agents:[{id:'a',claims:['safe']},{id:'b',claims:['NOT:safe']}]});assert.equal(detectAgentContradictions(conflict).contradictions.length,1);
console.log(JSON.stringify({status:'PASS',routingCases:passed,compression:eff.reductionPercent,dryRunGuard:true,providerRouting:true,agentContradiction:true},null,2));
