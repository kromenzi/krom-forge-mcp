import { createHash } from 'node:crypto';
import { z } from 'zod';
import { v77ExecutionReceiptSchema, verifyExecutionReceiptV77 } from './v77-execution-receipt';

const receiptInputSchema=v77ExecutionReceiptSchema.extend({
  receiptDigest:z.string().regex(/^[a-f0-9]{64}$/).optional()
});

export const v77MissionClosureSchema=z.object({
  missionDigest:z.string().regex(/^[a-f0-9]{64}$/),
  expectedCapabilities:z.array(z.string().min(1)).min(1).max(50),
  receipts:z.array(receiptInputSchema).min(1).max(100),
  claimRequested:z.enum(['NONE','COMPLETED','DEPLOYED','FIXED','PASSED']).default('NONE'),
  requireAllCapabilities:z.boolean().default(true),
  requireSuccessfulOutcomes:z.boolean().default(true)
});

export type V77MissionClosureInput=z.infer<typeof v77MissionClosureSchema>;

export type V77MissionClosureFinding={
  code:string;
  severity:'INFO'|'LOW'|'MEDIUM'|'HIGH'|'CRITICAL';
  blocking:boolean;
  message:string;
  capabilities?:string[];
};

function uniqSorted(values:string[]){
  return [...new Set(values.map(x=>x.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
}

export function closeMissionV77(input:V77MissionClosureInput){
  const parsed=v77MissionClosureSchema.parse(input);
  const expectedCapabilities=uniqSorted(parsed.expectedCapabilities);
  const receiptResults=parsed.receipts.map((receipt,index)=>{
    const verification=verifyExecutionReceiptV77(receipt);
    return {
      index,
      capability:receipt.capability,
      missionDigest:receipt.missionDigest,
      outcome:receipt.outcome,
      receiptDigest:verification.receiptDigest,
      verification
    };
  });

  const findings:V77MissionClosureFinding[]=[];
  const mismatchedMission=receiptResults.filter(x=>x.missionDigest!==parsed.missionDigest);
  if(mismatchedMission.length){
    findings.push({
      code:'MISSION_DIGEST_MISMATCH',
      severity:'CRITICAL',
      blocking:true,
      message:'One or more receipts belong to a different mission digest.',
      capabilities:uniqSorted(mismatchedMission.map(x=>x.capability))
    });
  }

  const verifiedCapabilities=uniqSorted(
    receiptResults.filter(x=>x.verification.status==='PASS').map(x=>x.capability)
  );
  const missingCapabilities=expectedCapabilities.filter(x=>!verifiedCapabilities.includes(x));
  if(parsed.requireAllCapabilities&&missingCapabilities.length){
    findings.push({
      code:'CAPABILITY_COVERAGE_INCOMPLETE',
      severity:'HIGH',
      blocking:true,
      message:'Mission closure is missing verified receipts for required capabilities.',
      capabilities:missingCapabilities
    });
  }

  const unexpectedCapabilities=uniqSorted(
    receiptResults.map(x=>x.capability).filter(x=>!expectedCapabilities.includes(x))
  );
  if(unexpectedCapabilities.length){
    findings.push({
      code:'UNEXPECTED_CAPABILITY_RECEIPT',
      severity:'MEDIUM',
      blocking:false,
      message:'Mission contains receipts for capabilities outside the expected mission scope.',
      capabilities:unexpectedCapabilities
    });
  }

  const failedReceipts=receiptResults.filter(x=>x.verification.status!=='PASS');
  if(failedReceipts.length){
    findings.push({
      code:'UNVERIFIED_RECEIPTS_PRESENT',
      severity:'HIGH',
      blocking:true,
      message:'One or more execution receipts failed evidence closure verification.',
      capabilities:uniqSorted(failedReceipts.map(x=>x.capability))
    });
  }

  const unsuccessfulOutcomes=receiptResults.filter(x=>x.outcome!=='SUCCEEDED');
  if(parsed.requireSuccessfulOutcomes&&unsuccessfulOutcomes.length){
    findings.push({
      code:'UNSUCCESSFUL_OUTCOME_PRESENT',
      severity:'CRITICAL',
      blocking:true,
      message:'Mission completion requires successful outcomes for all required receipts.',
      capabilities:uniqSorted(unsuccessfulOutcomes.map(x=>x.capability))
    });
  }

  const duplicateCapabilities=uniqSorted(
    receiptResults
      .map(x=>x.capability)
      .filter((name,index,array)=>array.indexOf(name)!==index)
  );
  if(duplicateCapabilities.length){
    findings.push({
      code:'DUPLICATE_CAPABILITY_RECEIPTS',
      severity:'LOW',
      blocking:false,
      message:'Multiple receipts exist for the same capability; all remain part of the evidence chain.',
      capabilities:duplicateCapabilities
    });
  }

  const blockers=findings.filter(x=>x.blocking);
  const completionClaim=parsed.claimRequested!=='NONE';
  const claimAllowed=completionClaim &&
    blockers.length===0 &&
    (!parsed.requireAllCapabilities||missingCapabilities.length===0) &&
    (!parsed.requireSuccessfulOutcomes||unsuccessfulOutcomes.length===0);

  const status=blockers.length
    ? 'BLOCKED'
    : parsed.requireAllCapabilities&&missingCapabilities.length
      ? 'OPEN'
      : 'CLOSED';

  const receiptDigests=uniqSorted(receiptResults.map(x=>x.receiptDigest));
  const canonical={
    release:'v77',
    missionDigest:parsed.missionDigest,
    expectedCapabilities,
    verifiedCapabilities,
    missingCapabilities,
    unexpectedCapabilities,
    receiptDigests,
    claimRequested:parsed.claimRequested,
    requireAllCapabilities:parsed.requireAllCapabilities,
    requireSuccessfulOutcomes:parsed.requireSuccessfulOutcomes,
    status,
    blockingCodes:blockers.map(x=>x.code).sort()
  };
  const closureDigest=createHash('sha256').update(JSON.stringify(canonical)).digest('hex');

  return {
    ...canonical,
    closureDigest,
    receipts:receiptResults,
    findings,
    blockers,
    capabilityCoverage:{
      expected:expectedCapabilities.length,
      verified:verifiedCapabilities.filter(x=>expectedCapabilities.includes(x)).length,
      missing:missingCapabilities.length,
      ratio:expectedCapabilities.length
        ? Number((verifiedCapabilities.filter(x=>expectedCapabilities.includes(x)).length/expectedCapabilities.length).toFixed(3))
        : 0
    },
    claimAllowed,
    executionClaim:false
  } as const;
}

export function verifyMissionClaimV77(input:V77MissionClosureInput){
  const closure=closeMissionV77(input);
  const completionClaim=input.claimRequested!=='NONE';
  const reasons:string[]=[];

  if(!completionClaim) reasons.push('No completion-style claim was requested.');
  if(closure.status!=='CLOSED') reasons.push('Mission evidence is not fully closed.');
  if(closure.missingCapabilities.length) reasons.push('Required capability receipts are missing.');
  if(closure.blockers.length) reasons.push('Blocking mission-closure findings remain.');
  if(completionClaim&&!closure.claimAllowed) reasons.push('Requested claim exceeds verified evidence.');

  return {
    release:'v77',
    claimRequested:input.claimRequested,
    status:completionClaim&&closure.claimAllowed?'PASS':'BLOCKED',
    claimAllowed:completionClaim&&closure.claimAllowed,
    closureStatus:closure.status,
    closureDigest:closure.closureDigest,
    capabilityCoverage:closure.capabilityCoverage,
    blockingFindings:closure.blockers,
    reasons,
    executionClaim:false
  } as const;
}

export function auditMissionClosureV77(){
  const missionDigest='c'.repeat(64);
  const mk=(capability:string,outcome:'SUCCEEDED'|'FAILED'|'PARTIAL'='SUCCEEDED')=>({
    missionDigest,
    capability,
    outcome,
    outputSummary:`${capability} outcome ${outcome}`,
    evidenceRefs:[`evidence:${capability}`],
    verificationPassed:true,
    executionAuthorized:true,
    claimRequested:outcome==='SUCCEEDED'?'PASSED' as const:'NONE' as const
  });

  const success=verifyMissionClaimV77({
    missionDigest,
    expectedCapabilities:['cap_a','cap_b'],
    receipts:[mk('cap_a'),mk('cap_b')],
    claimRequested:'COMPLETED',
    requireAllCapabilities:true,
    requireSuccessfulOutcomes:true
  });

  const missing=verifyMissionClaimV77({
    missionDigest,
    expectedCapabilities:['cap_a','cap_b'],
    receipts:[mk('cap_a')],
    claimRequested:'COMPLETED',
    requireAllCapabilities:true,
    requireSuccessfulOutcomes:true
  });

  const failed=verifyMissionClaimV77({
    missionDigest,
    expectedCapabilities:['cap_a','cap_b'],
    receipts:[mk('cap_a'),mk('cap_b','FAILED')],
    claimRequested:'PASSED',
    requireAllCapabilities:true,
    requireSuccessfulOutcomes:true
  });

  const wrongMission=verifyMissionClaimV77({
    missionDigest,
    expectedCapabilities:['cap_a'],
    receipts:[{...mk('cap_a'),missionDigest:'d'.repeat(64)}],
    claimRequested:'FIXED',
    requireAllCapabilities:true,
    requireSuccessfulOutcomes:true
  });

  const deterministicA=closeMissionV77({
    missionDigest,
    expectedCapabilities:['cap_b','cap_a'],
    receipts:[mk('cap_b'),mk('cap_a')],
    claimRequested:'COMPLETED',
    requireAllCapabilities:true,
    requireSuccessfulOutcomes:true
  });
  const deterministicB=closeMissionV77({
    missionDigest,
    expectedCapabilities:['cap_a','cap_b'],
    receipts:[mk('cap_a'),mk('cap_b')],
    claimRequested:'COMPLETED',
    requireAllCapabilities:true,
    requireSuccessfulOutcomes:true
  });

  const checks={
    verifiedMissionClaim:success.status==='PASS'&&success.claimAllowed,
    missingCapabilityBlocked:missing.status==='BLOCKED'&&!missing.claimAllowed,
    failedOutcomeBlocked:failed.status==='BLOCKED'&&!failed.claimAllowed,
    wrongMissionBlocked:wrongMission.status==='BLOCKED'&&!wrongMission.claimAllowed,
    fullCoverage:success.capabilityCoverage.ratio===1,
    deterministicClosureDigest:deterministicA.closureDigest===deterministicB.closureDigest&&/^[a-f0-9]{64}$/.test(deterministicA.closureDigest),
    noExecutionClaim:success.executionClaim===false&&missing.executionClaim===false
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
