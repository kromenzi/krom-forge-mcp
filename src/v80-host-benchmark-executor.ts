import { createHash, randomUUID } from 'node:crypto';
import { assertExecutionTextMatchesBytes, hashOriginalInstructionBytes, V80_V43_HASH_CONTRACT } from './v80-v43-instruction-contract';
import { z } from 'zod';
import { v80RealBenchmarkManifestSchema, v80HostBenchmarkReceiptSchema, verifyV42RealBenchmarkManifestIntegrityV80, verifyV42RealBenchmarkReceiptsV80 } from './v80-real-benchmark-evidence-pipeline';
import { getV43InstructionManifestEntryV80 } from './v80-v43-instruction-loader';

type Manifest = z.infer<typeof v80RealBenchmarkManifestSchema>;
type Case = Manifest['cases'][number];
type Receipt = z.infer<typeof v80HostBenchmarkReceiptSchema>;
const digest=(content:string)=>createHash('sha256').update(content).digest('hex');
const nonblank=z.string().trim().min(1);
const resultSchema=z.object({outcome:z.enum(['PASS','FAIL','BLOCKED']),validatorPass:z.boolean(),securityPass:z.boolean(),unsupportedClaim:z.boolean(),regressionDetected:z.boolean(),semanticSimilarity:z.number().min(0).max(1),proceduralSimilarity:z.number().min(0).max(1),specializationDistinct:z.boolean(),artifacts:z.array(z.object({kind:nonblank,content:nonblank})).min(1).max(100)});
const bundleSchema=z.object({skillName:z.string().min(1),instruction:z.string(),instructionBytes:z.instanceof(Buffer),instructionHash:z.string().regex(/^[a-f0-9]{64}$/),rawFileHash:z.string().regex(/^[a-f0-9]{64}$/),trustedRawFileHash:z.string().regex(/^[a-f0-9]{64}$/),trustedInstructionHash:z.string().regex(/^[a-f0-9]{64}$/),hashContract:z.literal('krom-instruction-raw-utf8-v1'),legacyInstructionHash:z.string().regex(/^[a-f0-9]{64}$/),legacyInstructionHashStatus:z.literal('LEGACY_UNPROVEN'),legacyInstructionHashSource:z.string().min(1)});

export interface V80BenchmarkHostAdapter {
  evidenceOrigin:'HOST_EXECUTION'|'FIXTURE';
  loadInstruction(skillName:string):Promise<string>;
  /** Atomic text/reference read. The executor independently hashes instruction and ignores adapter integrity flags. */
  loadInstructionBundle?(skillName:string):Promise<unknown>;
  execute(input:{benchmarkCase:Readonly<Case>;instruction:string;signal:AbortSignal}):Promise<z.infer<typeof resultSchema>>;
}

export async function executeV43HostBenchmarkV80(input:{manifest:Manifest;sourceCommit:string;adapter?:V80BenchmarkHostAdapter;signal?:AbortSignal;maxCases?:number}){
  const manifest=v80RealBenchmarkManifestSchema.parse(input.manifest); const sourceCommit=z.string().regex(/^[a-f0-9]{40}$/).parse(input.sourceCommit); const maxCases=z.number().int().min(1).max(100).parse(input.maxCases??25);
  const blockers=verifyV42RealBenchmarkManifestIntegrityV80(manifest); if(!input.adapter) blockers.push('HOST_ADAPTER_UNAVAILABLE'); if(manifest.caseCount>maxCases) blockers.push('HOST_CASE_BUDGET_EXCEEDED');
  const receipts:Receipt[]=[]; const artifacts:Array<{caseId:string;kind:string;content:string;sha256:string}>=[]; const failures:Array<{caseId:string;reason:string}>=[]; let executedCases=0; const signal=input.signal??new AbortController().signal;
  if(!blockers.length){
    for(const benchmarkCase of manifest.cases){
      if(signal.aborted){blockers.push('HOST_EXECUTION_ABORTED');break;}
      try {
        let instruction:string;
        if(input.adapter!.loadInstructionBundle){
          const bundle=bundleSchema.parse(await input.adapter!.loadInstructionBundle(benchmarkCase.skillName));
          const trusted=getV43InstructionManifestEntryV80(benchmarkCase.skillName);
          if(bundle.skillName!==benchmarkCase.skillName || bundle.trustedRawFileHash!==trusted.rawFileHash || bundle.trustedInstructionHash!==trusted.instructionHash || bundle.legacyInstructionHash!==trusted.legacyInstructionHash || bundle.legacyInstructionHashStatus!=='LEGACY_UNPROVEN'){failures.push({caseId:benchmarkCase.caseId,reason:'TRUSTED_INSTRUCTION_REFERENCE_MISMATCH'});continue;}
          instruction=bundle.instruction;
          assertExecutionTextMatchesBytes(instruction,bundle.instructionBytes,benchmarkCase.skillName);
          const actualRawHash=hashOriginalInstructionBytes(bundle.instructionBytes,benchmarkCase.skillName);
          if(actualRawHash!==trusted.rawFileHash || bundle.rawFileHash!==actualRawHash || bundle.instructionHash!==actualRawHash){failures.push({caseId:benchmarkCase.caseId,reason:'LOADED_TEXT_RAW_HASH_MISMATCH'});continue;}
          if(bundle.hashContract!==V80_V43_HASH_CONTRACT || actualRawHash!==trusted.instructionHash || benchmarkCase.skillInstructionHash!==trusted.instructionHash){blockers.push('V43_HASH_CONTRACT_OR_MANIFEST_MISMATCH');break;}
        } else {
          // Legacy/fixture seam: still hash the exact text returned by loadInstruction; no adapter integrity claim is read.
          instruction=await input.adapter!.loadInstruction(benchmarkCase.skillName);
          const encoded=Buffer.from(instruction,'utf8');
          if(hashOriginalInstructionBytes(encoded,benchmarkCase.skillName)!==benchmarkCase.skillInstructionHash){failures.push({caseId:benchmarkCase.caseId,reason:'INSTRUCTION_BYTES_HASH_MISMATCH'});continue;}
        }
        if(signal.aborted){blockers.push('HOST_EXECUTION_ABORTED');break;}
        const hostExecutionId=randomUUID(); const started=performance.now(); executedCases++; const caseController=new AbortController(); const onAbort=()=>caseController.abort(signal.reason); signal.addEventListener('abort',onAbort,{once:true});
        let timer:ReturnType<typeof setTimeout>|undefined;
        const timeoutPromise=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{caseController.abort(new Error('HOST_CASE_TIMEOUT'));reject(new Error('HOST_CASE_TIMEOUT'));},benchmarkCase.latencyBudgetMs);});
        let rejectAbort:()=>void=()=>{};
        const abortPromise=new Promise<never>((_,reject)=>{rejectAbort=()=>reject(new Error('HOST_EXECUTION_ABORTED'));if(signal.aborted) rejectAbort(); else signal.addEventListener('abort',rejectAbort,{once:true});});
        try {
          const result=resultSchema.parse(await Promise.race([input.adapter!.execute({benchmarkCase:structuredClone(benchmarkCase),instruction,signal:caseController.signal}),timeoutPromise,abortPromise]));
          const latencyMs=performance.now()-started;
          if(signal.aborted){blockers.push('HOST_EXECUTION_ABORTED');break;}
          const caseArtifacts=result.artifacts.map(artifact=>({caseId:benchmarkCase.caseId,...artifact,sha256:digest(artifact.content)})); const evidenceKinds=[...new Set(caseArtifacts.map(artifact=>artifact.kind))];
          if(benchmarkCase.expectedEvidenceKinds.some(kind=>!evidenceKinds.includes(kind))){failures.push({caseId:benchmarkCase.caseId,reason:'MISSING_EXECUTION_ARTIFACTS'});continue;}
          const receipt=v80HostBenchmarkReceiptSchema.parse({...result,benchmarkId:manifest.benchmarkId,caseId:benchmarkCase.caseId,skillName:benchmarkCase.skillName,manifestCaseDigest:benchmarkCase.caseDigest,hostExecutionId,evidenceOrigin:input.adapter!.evidenceOrigin,executionPerformed:true,sourceRef:'git:'+sourceCommit,latencyMs,evidenceRefs:caseArtifacts.map(artifact=>'sha256:'+artifact.sha256),evidenceKinds,hostAttestation:'host-adapter:'+hostExecutionId,instructionHashContract:V80_V43_HASH_CONTRACT}); receipts.push(receipt);artifacts.push(...caseArtifacts);
        } finally {if(timer) clearTimeout(timer);signal.removeEventListener('abort',onAbort);signal.removeEventListener('abort',rejectAbort);}
      } catch(error){
        const reason=error instanceof Error?error.message:'HOST_ADAPTER_OR_RESULT_FAILURE';
        if(reason==='HOST_EXECUTION_ABORTED'){blockers.push(reason);break;}
        failures.push({caseId:benchmarkCase.caseId,reason:reason==='HOST_CASE_TIMEOUT'?reason:'HOST_ADAPTER_OR_RESULT_FAILURE'});
      }
    }
  }
  const verification=receipts.length?verifyV42RealBenchmarkReceiptsV80({manifest,receipts,requireAllManifestCases:true}):null;
  return {status:blockers.length?'BLOCKED':failures.length?'CONDITIONAL':verification?.status??'NO_EXECUTION_EVIDENCE',blockers,failures,sourceCommit,executedCases,receipts,artifacts,verification,evidenceOrigin:input.adapter?.evidenceOrigin??null,promotionApplied:false,repositoryMutationApplied:false,deploymentMutationApplied:false} as const;
}

export const executeV42HostBenchmarkV80=executeV43HostBenchmarkV80;
