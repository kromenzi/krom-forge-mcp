import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  v80RealBenchmarkManifestSchema,
  v80HostBenchmarkReceiptSchema,
  verifyV42RealBenchmarkReceiptsV80
} from './v80-real-benchmark-evidence-pipeline';

const checkpointSchema=z.object({
  resumeVersion:z.literal(1),
  campaignDigest:z.string().regex(/^[a-f0-9]{64}$/),
  sourceCommit:z.string().regex(/^[a-f0-9]{40}$/),
  receipts:z.array(v80HostBenchmarkReceiptSchema).max(20000),
  artifacts:z.array(z.object({caseId:z.string().min(1),kind:z.string().min(1),content:z.string().min(1),sha256:z.string().regex(/^[a-f0-9]{64}$/)})).max(200000)
});
const hash=(content:string)=>createHash('sha256').update(content).digest('hex');

/**
 * Treat resume JSON as untrusted input. It can suppress execution only when it is
 * bound to the same immutable source and full campaign, receipt validation passes,
 * and every referenced artifact byte is present and hashes to its recorded digest.
 * This is integrity checking, not operator/host authentication: a trusted local
 * writer can still fabricate the entire checkpoint.
 */
export function getVerifiedResumeStateV80(input:{checkpoint:unknown;manifest:z.input<typeof v80RealBenchmarkManifestSchema>;sourceCommit:string}){
  const manifest=v80RealBenchmarkManifestSchema.parse(input.manifest);
  const sourceCommit=z.string().regex(/^[a-f0-9]{40}$/).parse(input.sourceCommit);
  const checkpoint=checkpointSchema.parse(input.checkpoint);
  if(checkpoint.sourceCommit!==sourceCommit) throw new Error('RESUME_SOURCE_COMMIT_MISMATCH');
  if(checkpoint.campaignDigest!==manifest.manifestDigest) throw new Error('RESUME_CAMPAIGN_MISMATCH');

  const artifactsByCase=new Map<string,typeof checkpoint.artifacts>();
  for(const artifact of checkpoint.artifacts){
    if(hash(artifact.content)!==artifact.sha256) throw new Error('RESUME_ARTIFACT_DIGEST_MISMATCH');
    const list=artifactsByCase.get(artifact.caseId)??[];
    list.push(artifact);artifactsByCase.set(artifact.caseId,list);
  }
  const verification=verifyV42RealBenchmarkReceiptsV80({manifest,receipts:checkpoint.receipts,requireAllManifestCases:false});
  if(verification.status==='BLOCKED') throw new Error('RESUME_RECEIPT_VALIDATION_FAILED');

  const completed=new Set<string>();
  for(const evaluation of verification.evaluations){
    const receipt=evaluation.receipt;
    const artifacts=artifactsByCase.get(receipt.caseId)??[];
    const refs=new Set(artifacts.map(item=>'sha256:'+item.sha256));
    const kinds=new Set(artifacts.map(item=>item.kind));
    if(!receipt.evidenceRefs.every(ref=>refs.has(ref))||
       !receipt.evidenceKinds.every(kind=>kinds.has(kind))||
       !artifacts.every(item=>receipt.evidenceRefs.includes('sha256:'+item.sha256))){
      throw new Error('RESUME_ARTIFACT_COVERAGE_MISMATCH');
    }
    if(evaluation.verified&&receipt.outcome==='PASS'&&receipt.validatorPass&&receipt.securityPass&&
       !receipt.unsupportedClaim&&!receipt.regressionDetected&&artifacts.length>0){
      completed.add(receipt.caseId);
    }
  }
  const receipts=checkpoint.receipts.filter(item=>completed.has(item.caseId));
  const artifacts=checkpoint.artifacts.filter(item=>completed.has(item.caseId));
  return {completedCaseIds:completed,receipts,artifacts};
}
