import { createHash } from 'node:crypto';
import { z } from 'zod';

export const v77ExecutionReceiptSchema=z.object({
  missionDigest:z.string().regex(/^[a-f0-9]{64}$/),
  capability:z.string().min(1),
  outcome:z.enum(['SUCCEEDED','FAILED','PARTIAL']),
  outputSummary:z.string().min(1),
  evidenceRefs:z.array(z.string().min(1)).default([]),
  verificationPassed:z.boolean().default(false),
  executionAuthorized:z.boolean().default(false),
  claimRequested:z.enum(['NONE','COMPLETED','DEPLOYED','FIXED','PASSED']).default('NONE')
});

export type V77ExecutionReceiptInput=z.infer<typeof v77ExecutionReceiptSchema>;

export type V77ReceiptFinding={
  code:string;
  severity:'INFO'|'LOW'|'MEDIUM'|'HIGH'|'CRITICAL';
  blocking:boolean;
  message:string;
};

function uniqSorted(values:string[]){
  return [...new Set(values.map(x=>x.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
}

export function buildExecutionReceiptV77(input:V77ExecutionReceiptInput){
  const parsed=v77ExecutionReceiptSchema.parse(input);
  const evidenceRefs=uniqSorted(parsed.evidenceRefs);
  const completionClaim=parsed.claimRequested!=='NONE';
  const findings:V77ReceiptFinding[]=[];

  if(!parsed.executionAuthorized){
    findings.push({
      code:'EXECUTION_AUTHORIZATION_EVIDENCE_MISSING',
      severity:'CRITICAL',
      blocking:completionClaim||parsed.outcome==='SUCCEEDED',
      message:'A success or completion claim requires evidence that execution was authorized.'
    });
  }

  if(evidenceRefs.length===0){
    findings.push({
      code:'EXECUTION_EVIDENCE_MISSING',
      severity:'HIGH',
      blocking:true,
      message:'Execution closure requires at least one evidence reference.'
    });
  }

  if(!parsed.verificationPassed){
    findings.push({
      code:'POST_EXECUTION_VERIFICATION_REQUIRED',
      severity:'HIGH',
      blocking:true,
      message:'Execution closure requires explicit post-execution verification.'
    });
  }

  if(completionClaim && parsed.outcome!=='SUCCEEDED'){
    findings.push({
      code:'COMPLETION_CLAIM_CONFLICTS_WITH_OUTCOME',
      severity:'CRITICAL',
      blocking:true,
      message:'A completion-style claim cannot be issued for FAILED or PARTIAL outcomes.'
    });
  }

  if(parsed.outcome==='PARTIAL'){
    findings.push({
      code:'PARTIAL_OUTCOME_OPEN_ITEMS_REQUIRED',
      severity:'MEDIUM',
      blocking:completionClaim,
      message:'Partial outcomes must remain open and must not be represented as complete.'
    });
  }

  const blockers=findings.filter(x=>x.blocking);
  const claimAllowed=completionClaim
    ? blockers.length===0&&parsed.outcome==='SUCCEEDED'&&parsed.verificationPassed&&parsed.executionAuthorized&&evidenceRefs.length>0
    : false;

  const closureStatus=blockers.length
    ? 'OPEN'
    : parsed.outcome==='SUCCEEDED'
      ? 'VERIFIED_SUCCESS'
      : parsed.outcome==='FAILED'
        ? 'VERIFIED_FAILURE'
        : 'OPEN';

  const canonical={
    release:'v77',
    missionDigest:parsed.missionDigest,
    capability:parsed.capability,
    outcome:parsed.outcome,
    outputSummary:parsed.outputSummary,
    evidenceRefs,
    verificationPassed:parsed.verificationPassed,
    executionAuthorized:parsed.executionAuthorized,
    claimRequested:parsed.claimRequested,
    closureStatus,
    blockingCodes:blockers.map(x=>x.code).sort()
  };

  return {
    ...canonical,
    receiptDigest:createHash('sha256').update(JSON.stringify(canonical)).digest('hex'),
    findings,
    blockers,
    claimAllowed,
    executionClaim:false
  } as const;
}

export function verifyExecutionReceiptV77(input:V77ExecutionReceiptInput){
  const receipt=buildExecutionReceiptV77(input);
  const integrityValid=/^[a-f0-9]{64}$/.test(receipt.receiptDigest);
  const evidenceBound=receipt.evidenceRefs.length>0;
  const verified=receipt.verificationPassed;
  const safeClaim=receipt.claimRequested==='NONE'||receipt.claimAllowed;
  const status=integrityValid&&evidenceBound&&verified&&safeClaim&&receipt.blockers.length===0
    ? 'PASS'
    : 'BLOCKED';

  return {
    release:'v77',
    status,
    integrityValid,
    evidenceBound,
    verificationPassed:verified,
    safeClaim,
    closureStatus:receipt.closureStatus,
    receiptDigest:receipt.receiptDigest,
    blockers:receipt.blockers,
    executionClaim:false
  } as const;
}

export function auditExecutionReceiptV77(){
  const missionDigest='a'.repeat(64);

  const success=verifyExecutionReceiptV77({
    missionDigest,
    capability:'krom_example_capability',
    outcome:'SUCCEEDED',
    outputSummary:'Capability completed and verified.',
    evidenceRefs:['github:commit:abc','test:verify:v77:pass'],
    verificationPassed:true,
    executionAuthorized:true,
    claimRequested:'COMPLETED'
  });

  const noEvidence=verifyExecutionReceiptV77({
    missionDigest,
    capability:'krom_example_capability',
    outcome:'SUCCEEDED',
    outputSummary:'Unsupported success claim.',
    evidenceRefs:[],
    verificationPassed:false,
    executionAuthorized:true,
    claimRequested:'COMPLETED'
  });

  const failedClaim=verifyExecutionReceiptV77({
    missionDigest,
    capability:'krom_example_capability',
    outcome:'FAILED',
    outputSummary:'Execution failed.',
    evidenceRefs:['runtime:error:1'],
    verificationPassed:true,
    executionAuthorized:true,
    claimRequested:'COMPLETED'
  });

  const unauthorized=verifyExecutionReceiptV77({
    missionDigest,
    capability:'krom_example_capability',
    outcome:'SUCCEEDED',
    outputSummary:'Execution authorization not evidenced.',
    evidenceRefs:['runtime:result:1'],
    verificationPassed:true,
    executionAuthorized:false,
    claimRequested:'PASSED'
  });

  const deterministicA=buildExecutionReceiptV77({
    missionDigest,
    capability:'krom_example_capability',
    outcome:'SUCCEEDED',
    outputSummary:'Deterministic receipt.',
    evidenceRefs:['b','a','a'],
    verificationPassed:true,
    executionAuthorized:true,
    claimRequested:'PASSED'
  });
  const deterministicB=buildExecutionReceiptV77({
    missionDigest,
    capability:'krom_example_capability',
    outcome:'SUCCEEDED',
    outputSummary:'Deterministic receipt.',
    evidenceRefs:['a','b'],
    verificationPassed:true,
    executionAuthorized:true,
    claimRequested:'PASSED'
  });

  const checks={
    verifiedSuccess:success.status==='PASS'&&success.closureStatus==='VERIFIED_SUCCESS',
    missingEvidenceBlocked:noEvidence.status==='BLOCKED',
    failedCompletionBlocked:failedClaim.status==='BLOCKED',
    unauthorizedSuccessBlocked:unauthorized.status==='BLOCKED',
    deterministicDigest:deterministicA.receiptDigest===deterministicB.receiptDigest&&/^[a-f0-9]{64}$/.test(deterministicA.receiptDigest),
    noExecutionClaim:success.executionClaim===false&&noEvidence.executionClaim===false
  };
  const passed=Object.values(checks).filter(Boolean).length;

  return {
    release:'v77',
    status:passed===Object.keys(checks).length?'PASS':'FAIL',
    checks,
    passed,
    total:Object.keys(checks).length,
    executionClaim:false
  } as const;
}
