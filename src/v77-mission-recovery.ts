import { createHash } from 'node:crypto';
import { z } from 'zod';

export const v77MissionCheckpointSchema=z.object({
  missionDigest:z.string().regex(/^[a-f0-9]{64}$/),
  checkpointVersion:z.number().int().min(1).default(1),
  expectedCapabilities:z.array(z.string().min(1)).min(1).max(50),
  completedCapabilities:z.array(z.string().min(1)).default([]),
  failedCapabilities:z.array(z.string().min(1)).default([]),
  evidenceRefs:z.array(z.string().min(1)).default([]),
  lastVerifiedStep:z.string().min(1).optional(),
  executionAuthorized:z.boolean().default(false),
  sourceStateDigest:z.string().regex(/^[a-f0-9]{64}$/).optional()
});

export const v77MissionResumeSchema=z.object({
  checkpoint:v77MissionCheckpointSchema.extend({
    checkpointDigest:z.string().regex(/^[a-f0-9]{64}$/)
  }),
  currentExpectedCapabilities:z.array(z.string().min(1)).min(1).max(50).optional(),
  invalidatedEvidenceRefs:z.array(z.string().min(1)).default([]),
  currentSourceStateDigest:z.string().regex(/^[a-f0-9]{64}$/).optional()
});

export type V77MissionCheckpointInput=z.infer<typeof v77MissionCheckpointSchema>;
export type V77MissionResumeInput=z.infer<typeof v77MissionResumeSchema>;

function uniqSorted(values:string[]){
  return [...new Set(values.map(x=>x.trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
}

function digest(value:unknown){
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function buildMissionCheckpointV77(input:V77MissionCheckpointInput){
  const parsed=v77MissionCheckpointSchema.parse(input);
  const expectedCapabilities=uniqSorted(parsed.expectedCapabilities);
  const completedCapabilities=uniqSorted(parsed.completedCapabilities);
  const failedCapabilities=uniqSorted(parsed.failedCapabilities);
  const evidenceRefs=uniqSorted(parsed.evidenceRefs);

  const unknownCompleted=completedCapabilities.filter(x=>!expectedCapabilities.includes(x));
  const unknownFailed=failedCapabilities.filter(x=>!expectedCapabilities.includes(x));
  const completedFailedOverlap=completedCapabilities.filter(x=>failedCapabilities.includes(x));
  const pendingCapabilities=expectedCapabilities.filter(x=>!completedCapabilities.includes(x));
  const blockers:string[]=[];

  if(unknownCompleted.length) blockers.push('UNKNOWN_COMPLETED_CAPABILITY');
  if(unknownFailed.length) blockers.push('UNKNOWN_FAILED_CAPABILITY');
  if(completedFailedOverlap.length) blockers.push('CAPABILITY_BOTH_COMPLETED_AND_FAILED');
  if(completedCapabilities.length>0&&evidenceRefs.length===0) blockers.push('COMPLETED_WITHOUT_EVIDENCE');

  const canonical={
    release:'v77',
    missionDigest:parsed.missionDigest,
    checkpointVersion:parsed.checkpointVersion,
    expectedCapabilities,
    completedCapabilities,
    failedCapabilities,
    pendingCapabilities,
    evidenceRefs,
    lastVerifiedStep:parsed.lastVerifiedStep ?? null,
    executionAuthorized:parsed.executionAuthorized,
    sourceStateDigest:parsed.sourceStateDigest ?? null,
    blockers:uniqSorted(blockers)
  };
  const checkpointDigest=digest(canonical);

  return {
    ...canonical,
    checkpointDigest,
    status:blockers.length?'BLOCKED':pendingCapabilities.length?'RESUMABLE':'COMPLETE',
    unknownCompleted,
    unknownFailed,
    completedFailedOverlap,
    persistence:'HOST_CARRIED',
    persistenceClaim:false,
    executionClaim:false
  } as const;
}

export function resumeMissionFromCheckpointV77(input:V77MissionResumeInput){
  const parsed=v77MissionResumeSchema.parse(input);
  const {checkpointDigest,...checkpointInput}=parsed.checkpoint;
  const rebuilt=buildMissionCheckpointV77(checkpointInput);
  const digestValid=rebuilt.checkpointDigest===checkpointDigest;

  const currentExpected=uniqSorted(parsed.currentExpectedCapabilities ?? rebuilt.expectedCapabilities);
  const expectedChanged=JSON.stringify(currentExpected)!==JSON.stringify(rebuilt.expectedCapabilities);
  const sourceChanged=Boolean(
    rebuilt.sourceStateDigest &&
    parsed.currentSourceStateDigest &&
    rebuilt.sourceStateDigest!==parsed.currentSourceStateDigest
  );
  const invalidatedEvidenceRefs=uniqSorted(parsed.invalidatedEvidenceRefs);
  const evidenceInvalidated=invalidatedEvidenceRefs.some(x=>rebuilt.evidenceRefs.includes(x));

  const completedStillExpected=rebuilt.completedCapabilities.filter(x=>currentExpected.includes(x));
  const removedCapabilities=rebuilt.expectedCapabilities.filter(x=>!currentExpected.includes(x));
  const addedCapabilities=currentExpected.filter(x=>!rebuilt.expectedCapabilities.includes(x));
  const reverifyCompleted=(sourceChanged||evidenceInvalidated)
    ? completedStillExpected
    : [];

  const remainingCapabilities=uniqSorted([
    ...currentExpected.filter(x=>!completedStillExpected.includes(x)),
    ...reverifyCompleted
  ]);

  const blockers:string[]=[];
  if(!digestValid) blockers.push('CHECKPOINT_TAMPER_OR_CORRUPTION');
  if(rebuilt.status==='BLOCKED') blockers.push('CHECKPOINT_STATE_BLOCKED');
  if(evidenceInvalidated&&rebuilt.completedCapabilities.length) blockers.push('EVIDENCE_REVERIFICATION_REQUIRED');
  if(sourceChanged&&rebuilt.completedCapabilities.length) blockers.push('SOURCE_STATE_CHANGED_REVERIFY');

  const status=!digestValid
    ? 'BLOCKED'
    : blockers.some(x=>x==='CHECKPOINT_STATE_BLOCKED')
      ? 'BLOCKED'
      : remainingCapabilities.length
        ? 'RESUME_WITH_REVERIFICATION'
        : 'COMPLETE';

  const canonical={
    release:'v77',
    missionDigest:rebuilt.missionDigest,
    checkpointDigest,
    digestValid,
    currentExpectedCapabilities:currentExpected,
    remainingCapabilities,
    reverifyCompleted,
    removedCapabilities,
    addedCapabilities,
    invalidatedEvidenceRefs,
    expectedChanged,
    sourceChanged,
    evidenceInvalidated,
    blockers:uniqSorted(blockers),
    status
  };

  return {
    ...canonical,
    resumeDigest:digest(canonical),
    checkpoint:rebuilt,
    executionClaim:false,
    persistenceClaim:false
  } as const;
}

export function buildMissionRecoveryPlanV77(input:V77MissionResumeInput){
  const resume=resumeMissionFromCheckpointV77(input);
  const steps:{id:string;action:string;target:string|string[];blocking:boolean}[]=[];

  if(!resume.digestValid){
    steps.push({id:'R1',action:'REJECT_TAMPERED_CHECKPOINT',target:resume.checkpointDigest,blocking:true});
  } else {
    if(resume.reverifyCompleted.length){
      steps.push({id:'R1',action:'REVERIFY_INVALIDATED_COMPLETIONS',target:resume.reverifyCompleted,blocking:true});
    }
    if(resume.addedCapabilities.length){
      steps.push({id:'R2',action:'ADD_NEW_REQUIRED_CAPABILITIES',target:resume.addedCapabilities,blocking:false});
    }
    if(resume.removedCapabilities.length){
      steps.push({id:'R3',action:'RECONCILE_REMOVED_SCOPE',target:resume.removedCapabilities,blocking:false});
    }
    if(resume.remainingCapabilities.length){
      steps.push({id:'R4',action:'RESUME_PENDING_CAPABILITIES',target:resume.remainingCapabilities,blocking:false});
    }
    if(!resume.remainingCapabilities.length){
      steps.push({id:'R5',action:'VERIFY_MISSION_CLOSURE',target:resume.missionDigest,blocking:false});
    }
  }

  const canonical={
    release:'v77',
    missionDigest:resume.missionDigest,
    checkpointDigest:resume.checkpointDigest,
    resumeDigest:resume.resumeDigest,
    status:resume.status,
    steps
  };

  return {
    ...canonical,
    recoveryPlanDigest:digest(canonical),
    dispatchAllowed:resume.status!=='BLOCKED'&&resume.reverifyCompleted.length===0,
    executionClaim:false,
    persistenceClaim:false
  } as const;
}

export function auditMissionRecoveryV77(){
  const base=buildMissionCheckpointV77({
    missionDigest:'f'.repeat(64),
    checkpointVersion:1,
    expectedCapabilities:['cap_a','cap_b','cap_c'],
    completedCapabilities:['cap_a'],
    failedCapabilities:[],
    evidenceRefs:['evidence:cap_a'],
    lastVerifiedStep:'cap_a verified',
    executionAuthorized:true,
    sourceStateDigest:'1'.repeat(64)
  });

  const resume=resumeMissionFromCheckpointV77({
    checkpoint:{
      missionDigest:base.missionDigest,
      checkpointVersion:base.checkpointVersion,
      expectedCapabilities:base.expectedCapabilities,
      completedCapabilities:base.completedCapabilities,
      failedCapabilities:base.failedCapabilities,
      evidenceRefs:base.evidenceRefs,
      lastVerifiedStep:base.lastVerifiedStep ?? undefined,
      executionAuthorized:base.executionAuthorized,
      sourceStateDigest:base.sourceStateDigest ?? undefined,
      checkpointDigest:base.checkpointDigest
    },
    currentExpectedCapabilities:['cap_a','cap_b','cap_c'],
    invalidatedEvidenceRefs:[],
    currentSourceStateDigest:'1'.repeat(64)
  });

  const changedSource=resumeMissionFromCheckpointV77({
    checkpoint:{
      missionDigest:base.missionDigest,
      checkpointVersion:base.checkpointVersion,
      expectedCapabilities:base.expectedCapabilities,
      completedCapabilities:base.completedCapabilities,
      failedCapabilities:base.failedCapabilities,
      evidenceRefs:base.evidenceRefs,
      lastVerifiedStep:base.lastVerifiedStep ?? undefined,
      executionAuthorized:base.executionAuthorized,
      sourceStateDigest:base.sourceStateDigest ?? undefined,
      checkpointDigest:base.checkpointDigest
    },
    currentExpectedCapabilities:['cap_a','cap_b','cap_c'],
    invalidatedEvidenceRefs:[],
    currentSourceStateDigest:'2'.repeat(64)
  });

  const tampered=resumeMissionFromCheckpointV77({
    checkpoint:{
      missionDigest:base.missionDigest,
      checkpointVersion:base.checkpointVersion,
      expectedCapabilities:base.expectedCapabilities,
      completedCapabilities:['cap_a','cap_b'],
      failedCapabilities:base.failedCapabilities,
      evidenceRefs:base.evidenceRefs,
      lastVerifiedStep:base.lastVerifiedStep ?? undefined,
      executionAuthorized:base.executionAuthorized,
      sourceStateDigest:base.sourceStateDigest ?? undefined,
      checkpointDigest:base.checkpointDigest
    },
    invalidatedEvidenceRefs:[]
  });

  const deterministicA=buildMissionRecoveryPlanV77({
    checkpoint:{
      missionDigest:base.missionDigest,
      checkpointVersion:base.checkpointVersion,
      expectedCapabilities:base.expectedCapabilities,
      completedCapabilities:base.completedCapabilities,
      failedCapabilities:base.failedCapabilities,
      evidenceRefs:base.evidenceRefs,
      lastVerifiedStep:base.lastVerifiedStep ?? undefined,
      executionAuthorized:base.executionAuthorized,
      sourceStateDigest:base.sourceStateDigest ?? undefined,
      checkpointDigest:base.checkpointDigest
    },
    invalidatedEvidenceRefs:[]
  });
  const deterministicB=buildMissionRecoveryPlanV77({
    checkpoint:{
      missionDigest:base.missionDigest,
      checkpointVersion:base.checkpointVersion,
      expectedCapabilities:['cap_c','cap_a','cap_b'],
      completedCapabilities:['cap_a'],
      failedCapabilities:[],
      evidenceRefs:['evidence:cap_a'],
      lastVerifiedStep:'cap_a verified',
      executionAuthorized:true,
      sourceStateDigest:'1'.repeat(64),
      checkpointDigest:base.checkpointDigest
    },
    invalidatedEvidenceRefs:[]
  });

  const checks={
    resumable:base.status==='RESUMABLE'&&resume.status==='RESUME_WITH_REVERIFICATION',
    pendingPreserved:resume.remainingCapabilities.includes('cap_b')&&resume.remainingCapabilities.includes('cap_c'),
    sourceChangeReverify:changedSource.reverifyCompleted.includes('cap_a'),
    tamperBlocked:tampered.status==='BLOCKED'&&!tampered.digestValid,
    deterministicRecovery:deterministicA.recoveryPlanDigest===deterministicB.recoveryPlanDigest&&/^[a-f0-9]{64}$/.test(deterministicA.recoveryPlanDigest),
    hostCarriedOnly:base.persistence==='HOST_CARRIED'&&base.persistenceClaim===false,
    noExecutionClaim:base.executionClaim===false&&resume.executionClaim===false
  };
  const passed=Object.values(checks).filter(Boolean).length;

  return {
    release:'v77',
    status:passed===Object.keys(checks).length?'PASS':'FAIL',
    checks,
    passed,
    total:Object.keys(checks).length,
    executionClaim:false,
    persistenceClaim:false
  } as const;
}
