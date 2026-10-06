import { createHash } from 'node:crypto';
import { z } from 'zod';
import { V75_SKILL_NAMES } from './v75-agent-capability-fabric';
import { V80_V42_SHADOW_SEEDS } from './v80-v42-shadow-seeds';
import { V80_PROMOTED_V42_SKILL_NAMES, V80_PROMOTED_V42_SKILL_COUNT } from './v80-promoted-v42-skill-seeds';
import {
  evaluateV42PromotionReadinessV80,
  v80PromotionReadinessSchema
} from './v80-canary-promotion-controller';

const candidateNames=new Set<string>(V80_V42_SHADOW_SEEDS.map(item=>item.n));
const promotedNameSet=new Set<string>(V80_PROMOTED_V42_SKILL_NAMES);
const promotableSeeds=V80_V42_SHADOW_SEEDS.filter(item=>!promotedNameSet.has(item.n));

export const v80PromotionLifecycleSchema=z.enum(['SHADOW','CANARY','STABLE']);

export const v80PromotionStateEntrySchema=z.object({
  skillName:z.string().min(1),
  lifecycle:v80PromotionLifecycleSchema,
  transitionRevision:z.number().int().min(0).default(0),
  lastTransactionId:z.string().min(1).optional()
});

export const v80PromotionStateSchema=z.object({
  registryVersion:z.string().min(1),
  entries:z.array(v80PromotionStateEntrySchema).max(500)
});

export type V80PromotionState=z.infer<typeof v80PromotionStateSchema>;

function canonicalState(input:z.input<typeof v80PromotionStateSchema>){
  const parsed=v80PromotionStateSchema.parse(input);
  return {
    registryVersion:parsed.registryVersion,
    entries:[...parsed.entries]
      .map(item=>({
        skillName:item.skillName,
        lifecycle:item.lifecycle,
        transitionRevision:item.transitionRevision,
        lastTransactionId:item.lastTransactionId??null
      }))
      .sort((a,b)=>a.skillName.localeCompare(b.skillName))
  };
}

export function digestPromotionStateV80(input:z.input<typeof v80PromotionStateSchema>){
  const canonical=canonicalState(input);
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

function cloneState(state:V80PromotionState):V80PromotionState{
  return {
    registryVersion:state.registryVersion,
    entries:state.entries.map(item=>({...item}))
  };
}

function inspectState(state:V80PromotionState){
  const duplicateSkills=[...new Set(
    state.entries
      .map(item=>item.skillName)
      .filter((name,index,array)=>array.indexOf(name)!==index)
  )].sort();
  const unknownSkills=[...new Set(
    state.entries.map(item=>item.skillName).filter(name=>!candidateNames.has(name))
  )].sort();
  return {duplicateSkills,unknownSkills};
}

export const v80PreparePromotionTransactionSchema=z.object({
  state:v80PromotionStateSchema,
  readiness:v80PromotionReadinessSchema
});

export function prepareV42PromotionTransactionV80(input:z.input<typeof v80PreparePromotionTransactionSchema>){
  const parsed=v80PreparePromotionTransactionSchema.parse(input);
  const state=cloneState(parsed.state);
  const stateAudit=inspectState(state);
  const readiness=evaluateV42PromotionReadinessV80(parsed.readiness);
  const beforeDigest=digestPromotionStateV80(state);
  const entry=state.entries.find(item=>item.skillName===parsed.readiness.skillName);

  const blockers:string[]=[];
  if(stateAudit.duplicateSkills.length) blockers.push('DUPLICATE_STATE_ENTRIES');
  if(stateAudit.unknownSkills.length) blockers.push('UNKNOWN_STATE_SKILLS');
  if(promotedNameSet.has(parsed.readiness.skillName)) blockers.push('ALREADY_PROMOTED_STABLE');
  if(!entry) blockers.push('SKILL_NOT_PRESENT_IN_STATE');
  if(entry&&entry.lifecycle!==parsed.readiness.currentLifecycle) blockers.push('STATE_LIFECYCLE_MISMATCH');
  if(readiness.status!=='READY') blockers.push('PROMOTION_READINESS_NOT_READY');

  const targetLifecycle=
    readiness.status==='READY'&&'proposedLifecycle' in readiness
      ? readiness.proposedLifecycle
      : parsed.readiness.currentLifecycle;

  const transactionSeed=[
    'v80-phase7',
    parsed.readiness.skillName,
    entry?.lifecycle??'MISSING',
    targetLifecycle,
    beforeDigest
  ].join('|');
  const transactionId=createHash('sha256').update(transactionSeed).digest('hex');

  return {
    release:'v80',
    phase:'authorized-promotion-executor',
    status:blockers.length?'BLOCKED':'PREPARED',
    transactionId,
    skillName:parsed.readiness.skillName,
    currentLifecycle:entry?.lifecycle??null,
    targetLifecycle,
    expectedStateDigest:beforeDigest,
    blockers,
    stateAudit,
    readiness,
    authorizationRequired:blockers.length===0,
    mutationScope:'CALLER_SUPPLIED_STATE_ONLY',
    repositoryMutation:false,
    runtimeCatalogMutation:false,
    deploymentMutation:false,
    stableCatalogCount:V75_SKILL_NAMES.length,
    executionClaim:false
  } as const;
}

export const v80PostApplyVerificationSchema=z.object({
  passed:z.boolean(),
  observedLifecycle:v80PromotionLifecycleSchema.optional(),
  evidenceRefs:z.array(z.string().min(1)).min(1).max(100)
});

export const v80ExecutePromotionTransactionSchema=z.object({
  state:v80PromotionStateSchema,
  readiness:v80PromotionReadinessSchema,
  expectedStateDigest:z.string().regex(/^[a-f0-9]{64}$/),
  hostAuthorization:z.boolean(),
  authorizationId:z.string().min(1),
  approvalEvidenceRefs:z.array(z.string().min(1)).min(1).max(100),
  postApplyVerification:v80PostApplyVerificationSchema
});

export function executeV42PromotionTransactionV80(input:z.input<typeof v80ExecutePromotionTransactionSchema>){
  const parsed=v80ExecutePromotionTransactionSchema.parse(input);
  const before=cloneState(parsed.state);
  const beforeDigest=digestPromotionStateV80(before);
  const prepared=prepareV42PromotionTransactionV80({state:before,readiness:parsed.readiness});

  const denyReasons:string[]=[];
  if(!parsed.hostAuthorization) denyReasons.push('HOST_AUTHORIZATION_REQUIRED');
  if(parsed.expectedStateDigest!==beforeDigest) denyReasons.push('EXPECTED_STATE_DIGEST_MISMATCH');
  if(prepared.status!=='PREPARED') denyReasons.push(...prepared.blockers);

  if(denyReasons.length){
    const reasons=[...new Set(denyReasons)];
    return {
      release:'v80',
      phase:'authorized-promotion-executor',
      status:'DENIED',
      transactionId:prepared.transactionId,
      skillName:parsed.readiness.skillName,
      reasons,
      beforeState:before,
      attemptedState:null,
      stateAfter:before,
      beforeDigest,
      attemptedDigest:null,
      afterDigest:beforeDigest,
      atomicRollbackApplied:false,
      promotionApplied:false,
      suppliedStateMutationApplied:false,
      repositoryMutation:false,
      runtimeCatalogMutation:false,
      deploymentMutation:false,
      stableCatalogCount:V75_SKILL_NAMES.length,
      evidenceRecord:{
        authorizationId:parsed.authorizationId,
        approvalEvidenceRefs:parsed.approvalEvidenceRefs,
        postApplyEvidenceRefs:parsed.postApplyVerification.evidenceRefs,
        result:'DENIED'
      },
      executionClaim:false
    } as const;
  }

  const attempted=cloneState(before);
  const entry=attempted.entries.find(item=>item.skillName===parsed.readiness.skillName)!;
  const previousLifecycle=entry.lifecycle;
  const targetLifecycle=prepared.targetLifecycle as 'CANARY'|'STABLE';
  entry.lifecycle=targetLifecycle;
  entry.transitionRevision+=1;
  entry.lastTransactionId=prepared.transactionId;
  const attemptedDigest=digestPromotionStateV80(attempted);

  const postApplyPassed=
    parsed.postApplyVerification.passed&&
    parsed.postApplyVerification.observedLifecycle===targetLifecycle;

  if(!postApplyPassed){
    return {
      release:'v80',
      phase:'authorized-promotion-executor',
      status:'ROLLED_BACK',
      transactionId:prepared.transactionId,
      skillName:parsed.readiness.skillName,
      previousLifecycle,
      targetLifecycle,
      beforeState:before,
      attemptedState:attempted,
      stateAfter:before,
      beforeDigest,
      attemptedDigest,
      afterDigest:beforeDigest,
      atomicRollbackApplied:true,
      promotionApplied:false,
      suppliedStateMutationApplied:false,
      repositoryMutation:false,
      runtimeCatalogMutation:false,
      deploymentMutation:false,
      stableCatalogCount:V75_SKILL_NAMES.length,
      evidenceRecord:{
        authorizationId:parsed.authorizationId,
        approvalEvidenceRefs:parsed.approvalEvidenceRefs,
        postApplyEvidenceRefs:parsed.postApplyVerification.evidenceRefs,
        expectedObservedLifecycle:targetLifecycle,
        observedLifecycle:parsed.postApplyVerification.observedLifecycle??null,
        result:'ROLLED_BACK'
      },
      executionClaim:false
    } as const;
  }

  return {
    release:'v80',
    phase:'authorized-promotion-executor',
    status:'COMMITTED_TO_SUPPLIED_STATE',
    transactionId:prepared.transactionId,
    skillName:parsed.readiness.skillName,
    previousLifecycle,
    targetLifecycle,
    beforeState:before,
    attemptedState:attempted,
    stateAfter:attempted,
    beforeDigest,
    attemptedDigest,
    afterDigest:attemptedDigest,
    atomicRollbackApplied:false,
    promotionApplied:true,
    suppliedStateMutationApplied:true,
    repositoryMutation:false,
    runtimeCatalogMutation:false,
    deploymentMutation:false,
    stableCatalogCount:V75_SKILL_NAMES.length,
    evidenceRecord:{
      authorizationId:parsed.authorizationId,
      approvalEvidenceRefs:parsed.approvalEvidenceRefs,
      postApplyEvidenceRefs:parsed.postApplyVerification.evidenceRefs,
      expectedObservedLifecycle:targetLifecycle,
      observedLifecycle:parsed.postApplyVerification.observedLifecycle,
      result:'COMMITTED_TO_SUPPLIED_STATE'
    },
    executionClaim:false
  } as const;
}

export function auditV42AuthorizedPromotionExecutorV80(){
  const skillName=(promotableSeeds[0]??V80_V42_SHADOW_SEEDS[0]).n;
  const shadowState:V80PromotionState={
    registryVersion:'audit-v80-phase7',
    entries:[{skillName,lifecycle:'SHADOW',transitionRevision:0}]
  };
  const readiness={
    skillName,
    currentLifecycle:'SHADOW' as const,
    riskLevel:'medium' as const,
    benchmarkScore:0.97,
    benchmarkCases:40,
    passRate:0.97,
    validatorPassRate:0.98,
    evidenceCompletenessRate:1,
    securityPassRate:1,
    unsupportedClaimRate:0,
    regressionRate:0.01,
    latencyPassRate:0.99,
    evidenceGeneratedAtEpoch:1000,
    nowEpoch:1100,
    freshnessWindowSeconds:3600,
    review:{
      primary:{agent:'architect' as const,status:'PASS' as const},
      validator:{agent:'qa' as const,status:'PASS' as const}
    },
    rollback:{
      ready:true,
      tested:true,
      targetLifecycle:'SHADOW' as const,
      evidenceRefs:['audit:rollback']
    },
    openCriticalIncidents:0
  };

  const digest=digestPromotionStateV80(shadowState);
  const denied=executeV42PromotionTransactionV80({
    state:shadowState,
    readiness,
    expectedStateDigest:digest,
    hostAuthorization:false,
    authorizationId:'audit-denied',
    approvalEvidenceRefs:['audit:approval-denied'],
    postApplyVerification:{passed:true,observedLifecycle:'CANARY',evidenceRefs:['audit:post']}
  });
  const digestMismatch=executeV42PromotionTransactionV80({
    state:shadowState,
    readiness,
    expectedStateDigest:'0'.repeat(64),
    hostAuthorization:true,
    authorizationId:'audit-digest',
    approvalEvidenceRefs:['audit:approval-digest'],
    postApplyVerification:{passed:true,observedLifecycle:'CANARY',evidenceRefs:['audit:post']}
  });
  const rollback=executeV42PromotionTransactionV80({
    state:shadowState,
    readiness,
    expectedStateDigest:digest,
    hostAuthorization:true,
    authorizationId:'audit-rollback',
    approvalEvidenceRefs:['audit:approval-rollback'],
    postApplyVerification:{passed:false,observedLifecycle:'CANARY',evidenceRefs:['audit:post-fail']}
  });
  const committed=executeV42PromotionTransactionV80({
    state:shadowState,
    readiness,
    expectedStateDigest:digest,
    hostAuthorization:true,
    authorizationId:'audit-canary',
    approvalEvidenceRefs:['audit:approval-canary'],
    postApplyVerification:{passed:true,observedLifecycle:'CANARY',evidenceRefs:['audit:post-pass']}
  });

  const canaryState=committed.status==='COMMITTED_TO_SUPPLIED_STATE'?committed.stateAfter:shadowState;
  const stableReadiness={
    ...readiness,
    currentLifecycle:'CANARY' as const,
    benchmarkScore:0.98,
    benchmarkCases:80,
    passRate:0.98,
    validatorPassRate:0.99,
    evidenceCompletenessRate:1,
    regressionRate:0.01,
    canaryExposurePercent:10,
    canaryObservationHours:48,
    rollback:{
      ready:true,
      tested:true,
      targetLifecycle:'CANARY' as const,
      evidenceRefs:['audit:stable-rollback']
    }
  };
  const stableDigest=digestPromotionStateV80(canaryState);
  const stableCommitted=executeV42PromotionTransactionV80({
    state:canaryState,
    readiness:stableReadiness,
    expectedStateDigest:stableDigest,
    hostAuthorization:true,
    authorizationId:'audit-stable',
    approvalEvidenceRefs:['audit:approval-stable'],
    postApplyVerification:{passed:true,observedLifecycle:'STABLE',evidenceRefs:['audit:stable-post-pass']}
  });

  const checks={
    digestDeterministic:digest===digestPromotionStateV80(shadowState),
    authorizationRequired:denied.status==='DENIED'&&denied.reasons.includes('HOST_AUTHORIZATION_REQUIRED'),
    digestMismatchBlocked:digestMismatch.status==='DENIED'&&digestMismatch.reasons.includes('EXPECTED_STATE_DIGEST_MISMATCH'),
    postcheckFailureRollsBack:rollback.status==='ROLLED_BACK'&&rollback.afterDigest===rollback.beforeDigest&&rollback.atomicRollbackApplied,
    shadowCanaryCommit:committed.status==='COMMITTED_TO_SUPPLIED_STATE'&&committed.stateAfter.entries[0]?.lifecycle==='CANARY',
    canaryStableCommit:stableCommitted.status==='COMMITTED_TO_SUPPLIED_STATE'&&stableCommitted.stateAfter.entries[0]?.lifecycle==='STABLE',
    noRepositoryMutation:!committed.repositoryMutation&&!stableCommitted.repositoryMutation,
    noRuntimeCatalogMutation:!committed.runtimeCatalogMutation&&!stableCommitted.runtimeCatalogMutation,
    noDeploymentMutation:!committed.deploymentMutation&&!stableCommitted.deploymentMutation,
    realStableCatalogPreserved:V75_SKILL_NAMES.length===1465+V80_PROMOTED_V42_SKILL_COUNT
  };
  const failures=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
  return {
    release:'v80',
    phase:'authorized-promotion-executor',
    status:failures.length?'FAIL':'PASS',
    checks,
    failures,
    executionClaim:false
  } as const;
}
