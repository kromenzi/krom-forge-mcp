import assert from 'node:assert/strict';
import { v66AutonomousVerificationSchema } from '../src/v66-schema';
import { buildCapabilityDiscoveryV66, scoreToolHealthV66, detectDeadToolsV66, detectRegistryDriftV66, evaluateVerificationCoverageV66, evaluateOperationalReadinessV66, buildAutonomousVerificationSnapshotV66, rankToolSelectionV66, detectTelemetryAnomaliesV66, auditRegistryDeepV66, scoreRoutingConfidenceV66, buildFallbackPlanV66, evaluateToolCanaryV66, auditSelectionSafetyV66 } from '../src/v66-engine';

const i=v66AutonomousVerificationSchema.parse({
  objective:'v66 benchmark', nowEpoch:1000, expectedTools:['a','b'],
  evidence:[{id:'e',verified:true,fresh:true,confidence:99}],
  tools:[
    {name:'a',enabled:true,capabilities:['inspect'],latencyMs:100,errorRate:0,lastSuccessEpoch:990,evidenceRefs:['e']},
    {name:'b',enabled:true,capabilities:['verify'],latencyMs:120,errorRate:0,lastSuccessEpoch:995,evidenceRefs:['e']}
  ],
  checks:[
    {id:'c1',type:'SMOKE',passed:true,severity:90,toolName:'a',evidenceRefs:['e']},
    {id:'c2',type:'SCHEMA',passed:true,severity:90,toolName:'b',evidenceRefs:['e']}
  ]
});
assert.equal(buildCapabilityDiscoveryV66(i).capabilities.length,2);
assert.equal(scoreToolHealthV66(i).tools.every(x=>x.healthy),true);
assert.equal(detectDeadToolsV66(i).dead.length,0);
assert.equal(detectRegistryDriftV66(i).missing.length,0);
assert.equal(evaluateVerificationCoverageV66(i).coveragePercent,100);
assert.equal(evaluateOperationalReadinessV66(i).status,'READY');
assert.equal(rankToolSelectionV66(i,['inspect']).ranking[0].name,'a');
assert.equal(detectTelemetryAnomaliesV66(i).anomalies.length,0);
assert.equal(auditRegistryDeepV66(i).duplicates.length,0);
assert.equal(scoreRoutingConfidenceV66(i,['inspect']).selected,'a');
assert.equal(buildFallbackPlanV66(i,['inspect']).primary,'a');
assert.equal(evaluateToolCanaryV66(i,'a').promote,true);
assert.equal(auditSelectionSafetyV66(i,['inspect']).pass,true);
const unknownCheck=v66AutonomousVerificationSchema.parse({...i,checks:[...i.checks,{id:'cx',type:'SMOKE',passed:true,severity:10,toolName:'x',evidenceRefs:['e']}]});
assert.equal(evaluateVerificationCoverageV66(unknownCheck).coveragePercent,100);

const unsupportedCritical=v66AutonomousVerificationSchema.parse({...i,checks:[...i.checks,{id:'cc',type:'SMOKE',passed:true,severity:90,toolName:'a',evidenceRefs:['missing']}]});
assert.equal(evaluateOperationalReadinessV66(unsupportedCritical).status,'BLOCKED');

const unexpectedTool=v66AutonomousVerificationSchema.parse({...i,tools:[...i.tools,{name:'x',enabled:true,capabilities:['inspect'],lastSuccessEpoch:999,evidenceRefs:['e']}],checks:[...i.checks,{id:'cx2',type:'SMOKE',passed:true,severity:10,toolName:'x',evidenceRefs:['e']}]});
assert.equal(evaluateOperationalReadinessV66(unexpectedTool).status,'BLOCKED');

const staleTool=v66AutonomousVerificationSchema.parse({...i,staleAfterSeconds:100,tools:[{...i.tools[0],lastSuccessEpoch:800},i.tools[1]]});
assert.equal(detectDeadToolsV66(staleTool).dead.includes('a'),true);

const s=buildAutonomousVerificationSnapshotV66(i);
assert.equal(s.selfExecutionClaim,false);
console.log(JSON.stringify({status:'PASS',capabilityDiscovery:true,toolHealth:true,deadToolGuard:true,registryDrift:true,verificationCoverage:true,readiness:true,toolSelection:true,telemetryAnomalies:true,deepRegistryAudit:true,routingConfidence:true,fallbackPlan:true,toolCanary:true,selectionSafety:true,coverageRegistryBound:true,criticalEvidenceGate:true,unexpectedRegistryGate:true,staleToolGate:true,snapshot:true},null,2));
