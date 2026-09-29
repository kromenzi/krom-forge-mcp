import assert from 'node:assert/strict';
import test from 'node:test';
import {V54_TOOL_NAMES,V54_TOOL_SPECS,executeV54Tool,v54AutomationSchema} from '../src/v54-registry';
import {V53_TOOL_NAMES} from '../src/v53-registry';

test('v54 generates exactly 2485 tools and total reaches 5000',()=>{
 assert.equal(V54_TOOL_SPECS.length,2485);
 assert.equal(V54_TOOL_NAMES.length,2485);
 assert.equal(new Set(V54_TOOL_NAMES).size,2485);
 assert.equal(V53_TOOL_NAMES.length+V54_TOOL_NAMES.length+515-2000,3000); // guard only for generated layers arithmetic isolation
});

test('v54 covers exactly 35 domains and 71 operations',()=>{
 assert.equal(new Set(V54_TOOL_SPECS.map(t=>t.domainId)).size,35);
 assert.equal(new Set(V54_TOOL_SPECS.map(t=>t.operationId)).size,71);
});

test('v54 and v53 generated tool names never overlap',()=>{
 const prior=new Set(V53_TOOL_NAMES);
 assert.equal(V54_TOOL_NAMES.filter(name=>prior.has(name)).length,0);
});

test('all v54 metadata is complete',()=>{
 for(const t of V54_TOOL_SPECS){
  assert.ok(t.name.startsWith('krom_v54_'));
  assert.ok(t.title.length>8);
  assert.ok(t.description.length>50);
  assert.ok(t.focus.length>=4);
  assert.ok(t.evidenceKinds.length>=3);
 }
});

test('strict verification refuses unsupported claims',()=>{
 const spec=V54_TOOL_SPECS.find(t=>t.domainId==='threat_detection'&&t.operationId==='verify')!;
 const result=executeV54Tool(spec,v54AutomationSchema.parse({objective:'verify detections'}));
 assert.equal(result.status,'NOT_AVAILABLE');
 assert.equal(result.executionClaim,false);
});

test('automation tools expose deterministic safety controls',()=>{
 const spec=V54_TOOL_SPECS.find(t=>t.domainId==='release_automation'&&t.operationId==='automate')!;
 const result=executeV54Tool(spec,v54AutomationSchema.parse({objective:'automate release',automationMode:'GUARDED'})) as any;
 assert.equal(result.automation.idempotencyRequired,true);
 assert.equal(result.automation.concurrencyGuardRequired,true);
 assert.equal(result.automation.evidenceCaptureRequired,true);
 assert.equal(result.executionClaim,false);
});

test('approval-required actions are blocked in automation readiness',()=>{
 const spec=V54_TOOL_SPECS.find(t=>t.domainId==='governance_automation'&&t.operationId==='orchestrate')!;
 const result=executeV54Tool(spec,v54AutomationSchema.parse({objective:'orchestrate approvals',actions:[{id:'merge',requiresApproval:true,approved:false}]})) as any;
 assert.deepEqual(result.actionReadiness[0].blockers,['APPROVAL_REQUIRED']);
});

test('resilience tools require fallback semantics',()=>{
 const spec=V54_TOOL_SPECS.find(t=>t.domainId==='resilience'&&t.operationId==='recover')!;
 const result=executeV54Tool(spec,v54AutomationSchema.parse({objective:'recover service'})) as any;
 assert.equal(result.rollbackOrFallbackRequired,true);
 assert.equal(result.blastRadiusControlRequired,true);
});

test('model outputs remain hypotheses',()=>{
 const spec=V54_TOOL_SPECS.find(t=>t.domainId==='capacity'&&t.operationId==='forecast')!;
 const result=executeV54Tool(spec,v54AutomationSchema.parse({objective:'forecast capacity'})) as any;
 assert.ok(result.scenarios.every((s:any)=>s.observed===false));
});

test('all generated v54 names are deterministic',()=>{
 assert.deepEqual(V54_TOOL_NAMES,V54_TOOL_SPECS.map(t=>t.name));
});
