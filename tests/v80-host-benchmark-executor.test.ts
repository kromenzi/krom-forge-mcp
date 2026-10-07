import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { V80_V42_SHADOW_SEEDS } from '../src/v80-v42-shadow-seeds';
import { buildV42RealBenchmarkManifestV80 } from '../src/v80-real-benchmark-evidence-pipeline';
import { executeV42HostBenchmarkV80, type V80BenchmarkHostAdapter } from '../src/v80-host-benchmark-executor';

const commit='a'.repeat(40);
const instruction='Fixture instruction: inspect the supplied evidence.';
function manifest(){
  return buildV42RealBenchmarkManifestV80({benchmarkId:'host-test',cases:[{
    caseId:'one',skillName:V80_V42_SHADOW_SEEDS[0].n,
    scenarioId:'negative-case',scenarioRef:'fixture:negative-case',
    expectedEvidenceKinds:['result','validator','security'],latencyBudgetMs:1000
  }]});
}
const result={
  outcome:'PASS' as const,validatorPass:true,securityPass:true,
  unsupportedClaim:false,regressionDetected:false,
  semanticSimilarity:0.2,proceduralSimilarity:0.3,specializationDistinct:true,
  artifacts:['result','validator','security'].map(kind=>({kind,content:'fixture '+kind}))
};

test('host execution blocks when adapter is absent',async()=>{
  const output=await executeV42HostBenchmarkV80({manifest:manifest(),sourceCommit:commit});
  assert.equal(output.status,'BLOCKED');
  assert.equal(output.executedCases,0);
  assert.equal(output.receipts.length,0);
});

test('metadata alone cannot execute a skill with incorrect instruction bytes',async()=>{
  let called=false;
  const output=await executeV42HostBenchmarkV80({manifest:manifest(),sourceCommit:commit,adapter:{
    evidenceOrigin:'FIXTURE',loadInstruction:async()=>instruction,
    execute:async()=>{called=true;return result;}
  }});
  assert.equal(called,false);
  assert.equal(output.failures[0]?.reason,'INSTRUCTION_BYTES_HASH_MISMATCH');
  assert.equal(output.receipts.length,0);
});

test('tampered manifest blocks before calling the host',async()=>{
  let called=false;
  const altered={...manifest(),manifestDigest:'f'.repeat(64)};
  const output=await executeV42HostBenchmarkV80({manifest:altered,sourceCommit:commit,adapter:{
    evidenceOrigin:'FIXTURE',loadInstruction:async()=>{called=true;return instruction;},execute:async()=>result
  }});
  assert.equal(called,false);
  assert.equal(output.status,'BLOCKED');
});

test('aborted host execution produces no receipt',async()=>{
  const controller=new AbortController();controller.abort();
  const output=await executeV42HostBenchmarkV80({manifest:manifest(),sourceCommit:commit,
    signal:controller.signal,adapter:{evidenceOrigin:'FIXTURE',loadInstruction:async()=>instruction,execute:async()=>result}
  });
  assert.equal(output.executedCases,0);
  assert.equal(output.status,'BLOCKED');
});

test('host receipts bind artifact bytes and fixtures stay ineligible',async()=>{
  // Temporary fixture seed in this isolated test process, restored after the test.
  // This exercises orchestration only; it is not a benchmark of the real skill.
  const seed=V80_V42_SHADOW_SEEDS[0];const original=seed.h;
  Object.defineProperty(seed,'h',{value:createHash('sha256').update(instruction).digest('hex'),writable:true});
  try {
    const adapter:V80BenchmarkHostAdapter={evidenceOrigin:'FIXTURE',loadInstruction:async()=>instruction,execute:async()=>result};
    const output=await executeV42HostBenchmarkV80({manifest:manifest(),sourceCommit:commit,adapter});
    assert.equal(output.executedCases,1);
    assert.equal(output.receipts.length,1);
    assert.equal(output.verification?.verifiedReceipts,0);
    assert.equal(output.status,'INCOMPLETE');
    assert.equal(output.receipts[0].sourceRef,'git:'+commit);
    assert.equal(output.artifacts[0].sha256,createHash('sha256').update('fixture result').digest('hex'));
    assert.equal(output.promotionApplied,false);
    const missing=await executeV42HostBenchmarkV80({manifest:manifest(),sourceCommit:commit,adapter:{
      ...adapter,execute:async()=>({...result,artifacts:[result.artifacts[0]]})
    }});
    assert.equal(missing.receipts.length,0);
    assert.equal(missing.failures[0]?.reason,'MISSING_EXECUTION_ARTIFACTS');
    const failing=await executeV42HostBenchmarkV80({manifest:manifest(),sourceCommit:commit,adapter:{
      ...adapter,execute:async()=>{throw Error('credential must never appear in report');}
    }});
    assert.equal(failing.receipts.length,0);
    assert.equal(JSON.stringify(failing).includes('credential'),false);
  } finally {Object.defineProperty(seed,'h',{value:original,writable:true});}
});

test('runner removes abort listeners after a completed case',async()=>{
  const {default:EventEmitter}=await import('node:events');
  const {loadV43InstructionV80}=await import('../src/v80-v43-instruction-loader');
  const controller=new AbortController();
  const output=await executeV42HostBenchmarkV80({manifest:manifest(),sourceCommit:commit,signal:controller.signal,
    adapter:{evidenceOrigin:'FIXTURE',loadInstruction:loadV43InstructionV80,execute:async()=>result}});
  assert.equal(output.receipts.length,1);
  assert.equal(EventEmitter.getEventListeners(controller.signal,'abort').length,0);
});


test('instruction loading is bounded by the case latency budget',async()=>{
  const seed=V80_V42_SHADOW_SEEDS[0];const original=seed.h;
  Object.defineProperty(seed,'h',{value:createHash('sha256').update(instruction).digest('hex'),writable:true});
  try {
    const started=Date.now();
    const output=await executeV42HostBenchmarkV80({manifest:{
      ...manifest(),
      cases:manifest().cases.map(item=>({...item,latencyBudgetMs:100})),
    },sourceCommit:commit,adapter:{
      evidenceOrigin:'FIXTURE',
      loadInstruction:async()=>new Promise<string>(()=>{}),
      execute:async()=>result
    }});
    assert.equal(output.receipts.length,0);
    assert.ok(output.blockers.includes('V43_HASH_CONTRACT_OR_MANIFEST_MISMATCH') || output.failures.length===1);
    assert.ok(Date.now()-started<1000);
  } finally {Object.defineProperty(seed,'h',{value:original,writable:true});}
});
