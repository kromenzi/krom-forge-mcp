import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { V80_V42_SHADOW_SEEDS } from '../src/v80-v42-shadow-seeds';
import { buildV42RealBenchmarkManifestV80 } from '../src/v80-real-benchmark-evidence-pipeline';
import { executeV43HostBenchmarkV80 } from '../src/v80-host-benchmark-executor';
import { getV43InstructionManifestEntryV80, loadV43InstructionBundleV80, loadV43InstructionV80 } from '../src/v80-v43-instruction-loader';
import { decodeOriginalUtf8, V80_V43_HASH_CONTRACT, hashOriginalInstructionBytes } from '../src/v80-v43-instruction-contract';
const commit='b'.repeat(40);
const result={outcome:'PASS' as const,validatorPass:true,securityPass:true,unsupportedClaim:false,regressionDetected:false,semanticSimilarity:0,proceduralSimilarity:0,specializationDistinct:true,artifacts:[{kind:'result',content:'x'}]};

test('v4.3 loader preserves exact bytes, new hash, and legacy unproven value',async()=>{
 const name=V80_V42_SHADOW_SEEDS[0].n; const entry=getV43InstructionManifestEntryV80(name); const bundle=await loadV43InstructionBundleV80(name);
 assert.equal(bundle.hashContract,V80_V43_HASH_CONTRACT); assert.equal(bundle.instructionHash,entry.instructionHash); assert.equal(bundle.rawFileHash,entry.rawFileHash); assert.equal(bundle.legacyInstructionHash,entry.legacyInstructionHash); assert.equal(bundle.legacyInstructionHashStatus,'LEGACY_UNPROVEN'); assert.deepEqual(Buffer.from(bundle.instruction,'utf8'),bundle.instructionBytes); assert.equal(hashOriginalInstructionBytes(bundle.instructionBytes,name),entry.instructionHash);
});

test('v4.3 rejects invalid UTF-8 and preserves newline bytes',async()=>{
 assert.throws(()=>decodeOriginalUtf8(Buffer.from([0xc3,0x28]),'invalid'),/INVALID_UTF8/); const bytes=Buffer.from('a\r\nb\n','utf8'); assert.equal(hashOriginalInstructionBytes(bytes,'newline'),createHash('sha256').update(bytes).digest('hex')); assert.notEqual(hashOriginalInstructionBytes(Buffer.from('a\nb\n'),'newline'),hashOriginalInstructionBytes(bytes,'newline'));
});

test('v4.3 preserves a UTF-8 BOM as content and hashes it',async()=>{
 const bytes=Buffer.from([0xef,0xbb,0xbf,0x23,0x20,0x42,0x4f,0x4d,0x0a]);
 const text=decodeOriginalUtf8(bytes,'bom');
 assert.equal(text.charCodeAt(0),0xfeff);
 assert.deepEqual(Buffer.from(text,'utf8'),bytes);
 assert.equal(hashOriginalInstructionBytes(bytes,'bom'),createHash('sha256').update(bytes).digest('hex'));
 assert.notEqual(hashOriginalInstructionBytes(bytes.subarray(3),'bom'),hashOriginalInstructionBytes(bytes,'bom'));
});

test('runner rejects modified text even when adapter reports trusted hashes',async()=>{
 const name=V80_V42_SHADOW_SEEDS[0].n; const original=await loadV43InstructionBundleV80(name); const manifest=buildV42RealBenchmarkManifestV80({benchmarkId:'tamper-v43',cases:[{caseId:'tamper',skillName:name,scenarioId:'safe',scenarioRef:'host',expectedEvidenceKinds:['result'],latencyBudgetMs:100}]}); let called=false;
 const output=await executeV43HostBenchmarkV80({manifest,sourceCommit:commit,adapter:{evidenceOrigin:'HOST_EXECUTION',loadInstruction:()=>Promise.resolve(original.instruction),loadInstructionBundle:()=>Promise.resolve({...original,instruction:original.instruction+'\nTAMPERED'}),execute:async()=>{called=true;return result;}}});
 assert.equal(output.failures[0]?.reason,'HOST_ADAPTER_OR_RESULT_FAILURE'); assert.equal(called,false);
});

test('runner rejects version or contract mismatch before execution',async()=>{
 const name=V80_V42_SHADOW_SEEDS[0].n; const original=await loadV43InstructionBundleV80(name); const manifest=buildV42RealBenchmarkManifestV80({benchmarkId:'contract-v43',cases:[{caseId:'contract',skillName:name,scenarioId:'safe',scenarioRef:'host',expectedEvidenceKinds:['result'],latencyBudgetMs:100}]});
 const output=await executeV43HostBenchmarkV80({manifest,sourceCommit:commit,adapter:{evidenceOrigin:'HOST_EXECUTION',loadInstruction:()=>Promise.resolve(original.instruction),loadInstructionBundle:()=>Promise.resolve({...original,hashContract:'legacy-contract' as never}),execute:async()=>result}});
 assert.equal(output.failures[0]?.reason,'HOST_ADAPTER_OR_RESULT_FAILURE');
});

test('timeout and cancellation stop an executor that ignores AbortSignal',async()=>{
 const name=V80_V42_SHADOW_SEEDS[0].n; const original=V80_V42_SHADOW_SEEDS[0].h; const fixture='bounded test instruction'; Object.defineProperty(V80_V42_SHADOW_SEEDS[0],'h',{value:createHash('sha256').update(fixture).digest('hex'),writable:true});
 const manifest=()=>buildV42RealBenchmarkManifestV80({benchmarkId:'timeout-v43',cases:[{caseId:'timeout',skillName:name,scenarioId:'safe',scenarioRef:'host',expectedEvidenceKinds:['result'],latencyBudgetMs:20}]}); const adapter={evidenceOrigin:'HOST_EXECUTION' as const,loadInstruction:async()=>fixture,execute:async()=>new Promise<never>(()=>{})};
 try { const timed=await executeV43HostBenchmarkV80({manifest:manifest(),sourceCommit:commit,adapter}); assert.equal(timed.failures[0]?.reason,'HOST_CASE_TIMEOUT'); const controller=new AbortController(); const pending=executeV43HostBenchmarkV80({manifest:manifest(),sourceCommit:commit,adapter,signal:controller.signal}); setTimeout(()=>controller.abort(),10); const cancelled=await pending; assert.ok(cancelled.blockers.includes('HOST_EXECUTION_ABORTED')); } finally {Object.defineProperty(V80_V42_SHADOW_SEEDS[0],'h',{value:original,writable:true});}
});
