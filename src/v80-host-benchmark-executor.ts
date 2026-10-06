import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  v80RealBenchmarkManifestSchema, v80HostBenchmarkReceiptSchema,
  verifyV42RealBenchmarkManifestIntegrityV80, verifyV42RealBenchmarkReceiptsV80
} from './v80-real-benchmark-evidence-pipeline';

type Manifest = z.infer<typeof v80RealBenchmarkManifestSchema>;
type Case = Manifest['cases'][number];
type Receipt = z.infer<typeof v80HostBenchmarkReceiptSchema>;
const digest = (content:string) => createHash('sha256').update(content).digest('hex');
const nonblank = z.string().trim().min(1);
const resultSchema = z.object({
  outcome:z.enum(['PASS','FAIL','BLOCKED']),
  validatorPass:z.boolean(), securityPass:z.boolean(),
  unsupportedClaim:z.boolean(), regressionDetected:z.boolean(),
  semanticSimilarity:z.number().min(0).max(1),
  proceduralSimilarity:z.number().min(0).max(1),
  specializationDistinct:z.boolean(),
  artifacts:z.array(z.object({kind:nonblank, content:nonblank})).min(1).max(100)
});

/** Trusted host code only: never dispatches commands or URLs from the manifest. */
export interface V80BenchmarkHostAdapter {
  evidenceOrigin:'HOST_EXECUTION'|'FIXTURE';
  loadInstruction(skillName:string):Promise<string>;
  execute(input:{benchmarkCase:Readonly<Case>; instruction:string; signal:AbortSignal}):Promise<z.infer<typeof resultSchema>>;
}

export async function executeV42HostBenchmarkV80(input:{
  manifest:Manifest;
  sourceCommit:string;
  adapter?:V80BenchmarkHostAdapter;
  signal?:AbortSignal;
  maxCases?:number;
}) {
  const manifest=v80RealBenchmarkManifestSchema.parse(input.manifest);
  const sourceCommit=z.string().regex(/^[a-f0-9]{40}$/).parse(input.sourceCommit);
  const maxCases=z.number().int().min(1).max(100).parse(input.maxCases??25);
  const blockers=verifyV42RealBenchmarkManifestIntegrityV80(manifest);
  if(!input.adapter) blockers.push('HOST_ADAPTER_UNAVAILABLE');
  if(manifest.caseCount>maxCases) blockers.push('HOST_CASE_BUDGET_EXCEEDED');
  const receipts:Receipt[]=[];
  const artifacts:Array<{caseId:string; kind:string; content:string; sha256:string}>=[];
  const failures:Array<{caseId:string; reason:string}>=[];
  let executedCases=0;
  const signal=input.signal??new AbortController().signal;
  if(!blockers.length){
    for(const benchmarkCase of manifest.cases){
      if(signal.aborted){blockers.push('HOST_EXECUTION_ABORTED'); break;}
      try {
        const instruction=await input.adapter!.loadInstruction(benchmarkCase.skillName);
        if(!instruction.trim()||digest(instruction)!==benchmarkCase.skillInstructionHash){
          failures.push({caseId:benchmarkCase.caseId,reason:'INSTRUCTION_BYTES_HASH_MISMATCH'});
          continue;
        }
        if(signal.aborted){blockers.push('HOST_EXECUTION_ABORTED'); break;}
        const hostExecutionId=randomUUID();
        const started=performance.now();
        executedCases++;
        const result=resultSchema.parse(await input.adapter!.execute({
          benchmarkCase:structuredClone(benchmarkCase), instruction, signal
        }));
        const latencyMs=performance.now()-started;
        if(signal.aborted){blockers.push('HOST_EXECUTION_ABORTED'); break;}
        const caseArtifacts=result.artifacts.map(artifact=>({
          caseId:benchmarkCase.caseId,...artifact,sha256:digest(artifact.content)
        }));
        const evidenceKinds=[...new Set(caseArtifacts.map(artifact=>artifact.kind))];
        if(benchmarkCase.expectedEvidenceKinds.some(kind=>!evidenceKinds.includes(kind))){
          failures.push({caseId:benchmarkCase.caseId,reason:'MISSING_EXECUTION_ARTIFACTS'});
          continue;
        }
        const receipt=v80HostBenchmarkReceiptSchema.parse({
          ...result, benchmarkId:manifest.benchmarkId,caseId:benchmarkCase.caseId,
          skillName:benchmarkCase.skillName,manifestCaseDigest:benchmarkCase.caseDigest,
          hostExecutionId,evidenceOrigin:input.adapter!.evidenceOrigin,
          executionPerformed:true,sourceRef:'git:'+sourceCommit,latencyMs,
          evidenceRefs:caseArtifacts.map(artifact=>'sha256:'+artifact.sha256),evidenceKinds,
          hostAttestation:'host-adapter:'+hostExecutionId
        });
        receipts.push(receipt);
        artifacts.push(...caseArtifacts);
      } catch {
        // Adapter diagnostics can contain credentials; keep them outside this report.
        failures.push({caseId:benchmarkCase.caseId,reason:'HOST_ADAPTER_OR_RESULT_FAILURE'});
      }
    }
  }
  const verification=receipts.length?verifyV42RealBenchmarkReceiptsV80({
    manifest,receipts,requireAllManifestCases:true
  }):null;
  return {
    status:blockers.length?'BLOCKED':failures.length?'CONDITIONAL':verification?.status??'NO_EXECUTION_EVIDENCE',
    blockers,failures,sourceCommit,executedCases,receipts,artifacts,verification,
    evidenceOrigin:input.adapter?.evidenceOrigin??null,
    promotionApplied:false,repositoryMutationApplied:false,deploymentMutationApplied:false
  } as const;
}
