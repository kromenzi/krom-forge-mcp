import assert from 'node:assert/strict';
import { v66AutonomousVerificationSchema } from '../src/v66-schema';
import { buildCapabilityDiscoveryV66, scoreToolHealthV66, detectDeadToolsV66, detectRegistryDriftV66, evaluateVerificationCoverageV66, evaluateOperationalReadinessV66, buildAutonomousVerificationSnapshotV66 } from '../src/v66-engine';

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
const s=buildAutonomousVerificationSnapshotV66(i);
assert.equal(s.selfExecutionClaim,false);
console.log(JSON.stringify({status:'PASS',capabilityDiscovery:true,toolHealth:true,deadToolGuard:true,registryDrift:true,verificationCoverage:true,readiness:true,snapshot:true},null,2));
