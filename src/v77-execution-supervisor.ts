import { createHash } from 'node:crypto';
import { z } from 'zod';
import { v77AdaptiveRetrySchema, buildAdaptiveRetryDecisionV77, buildSafeReplanV77 } from './v77-adaptive-retry';
import { v77FailureHistorySchema, evaluateFailureLoopV77 } from './v77-failure-history';
import { v77MissionResumeSchema, resumeMissionFromCheckpointV77 } from './v77-mission-recovery';
import { v77MissionClosureSchema, verifyMissionClaimV77 } from './v77-mission-closure';

export const v77ExecutionSupervisorSchema=z.object({
  checkpoint:v77MissionResumeSchema.optional(),
  failure:v77AdaptiveRetrySchema.optional(),
  failureHistory:v77FailureHistorySchema.optional(),
  closure:v77MissionClosureSchema.optional(),
  requireClosureEvidence:z.boolean().default(true)
});

export type V77ExecutionSupervisorInput=z.infer<typeof v77ExecutionSupervisorSchema>;

export type V77SupervisorAction=
  |'CLOSE_MISSION'
  |'VERIFY_CLOSURE'
  |'RESUME_PENDING'
  |'REVERIFY_EVIDENCE'
  |'RETRY_OPERATION'
  |'REPLAN_OPERATION'
  |'STOP_AND_ESCALATE'
  |'REQUEST_EVIDENCE';

function digest(value:unknown){
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function superviseExecutionV77(input:V77ExecutionSupervisorInput){
  const parsed=v77ExecutionSupervisorSchema.parse(input);

  const closure=parsed.closure ? verifyMissionClaimV77(parsed.closure) : null;
  const loop=parsed.failureHistory ? evaluateFailureLoopV77(parsed.failureHistory) : null;
  const retry=parsed.failure ? buildAdaptiveRetryDecisionV77(parsed.failure) : null;
  const replan=parsed.failure ? buildSafeReplanV77(parsed.failure) : null;
  const resume=parsed.checkpoint ? resumeMissionFromCheckpointV77(parsed.checkpoint) : null;

  const reasons:string[]=[];
  let action:V77SupervisorAction='REQUEST_EVIDENCE';
  let dispatchAllowed=false;

  if(closure?.status==='PASS'&&closure.claimAllowed){
    action='CLOSE_MISSION';
    reasons.push('Mission closure evidence and completion claim are verified.');
  } else if(loop?.circuitOpen){
    action='STOP_AND_ESCALATE';
    reasons.push('Repeated equivalent failures opened the circuit.');
  } else if(retry?.decision==='STOP'){
    action='STOP_AND_ESCALATE';
    reasons.push(...retry.blockers);
  } else if(retry?.decision==='REPLAN'){
    action='REPLAN_OPERATION';
    reasons.push(`Failure class ${retry.failureClass} requires replanning before another dispatch.`);
  } else if(retry?.decision==='RETRY'){
    action='RETRY_OPERATION';
    reasons.push(`Transient failure is within retry budget; backoff ${retry.backoffSeconds}s.`);
    dispatchAllowed=true;
  } else if(resume?.status==='BLOCKED'){
    action='STOP_AND_ESCALATE';
    reasons.push(...resume.blockers);
  } else if(resume?.reverifyCompleted.length){
    action='REVERIFY_EVIDENCE';
    reasons.push('Previously completed work has stale or invalidated evidence.');
  } else if(resume?.remainingCapabilities.length){
    action='RESUME_PENDING';
    reasons.push('Checkpoint is valid and pending capability work remains.');
    dispatchAllowed=true;
  } else if(resume?.status==='COMPLETE'){
    action='VERIFY_CLOSURE';
    reasons.push('Checkpoint has no remaining capabilities; closure evidence must be verified next.');
  } else if(parsed.requireClosureEvidence){
    action='REQUEST_EVIDENCE';
    reasons.push('No verified mission closure evidence is available.');
  }

  if(action==='CLOSE_MISSION') dispatchAllowed=false;
  if(action==='STOP_AND_ESCALATE'||action==='REVERIFY_EVIDENCE'||action==='VERIFY_CLOSURE'||action==='REQUEST_EVIDENCE') dispatchAllowed=false;

  const canonical={
    release:'v77',
    action,
    dispatchAllowed,
    reasons,
    closureStatus:closure?.status??null,
    loopStatus:loop?.status??null,
    retryDecision:retry?.decision??null,
    failureClass:retry?.failureClass??null,
    resumeStatus:resume?.status??null,
    remainingCapabilities:resume?.remainingCapabilities??[],
    reverifyCompleted:resume?.reverifyCompleted??[],
    replanDigest:replan?.replanDigest??null
  };

  return {
    ...canonical,
    supervisorDigest:digest(canonical),
    closure,
    loop,
    retry,
    replan,
    resume,
    executionClaim:false,
    persistenceClaim:false
  } as const;
}

export function auditExecutionSupervisorV77(){
  const transient=superviseExecutionV77({
    failure:{
      operation:'fetch dependency',
      attempt:1,
      maxAttempts:3,
      errorMessage:'503 service unavailable',
      httpStatus:503,
      hostAuthorized:true,
      schemaValidated:true,
      priorIdenticalFailures:0,
      sideEffectRisk:'LOW'
    },
    requireClosureEvidence:true
  });

  const auth=superviseExecutionV77({
    failure:{
      operation:'deploy production',
      attempt:0,
      maxAttempts:3,
      errorMessage:'403 permission denied',
      httpStatus:403,
      hostAuthorized:false,
      schemaValidated:true,
      priorIdenticalFailures:0,
      sideEffectRisk:'HIGH'
    },
    requireClosureEvidence:true
  });

  const looped=superviseExecutionV77({
    failureHistory:{
      maxHistory:3,
      loopThreshold:3,
      events:[
        {operation:'fetch dependency',failureClass:'TRANSIENT_NETWORK',errorMessage:'503 service unavailable at https://a.test after 1000ms',httpStatus:503,attempt:1},
        {operation:'fetch dependency',failureClass:'TRANSIENT_NETWORK',errorMessage:'503 service unavailable at https://b.test after 2000ms',httpStatus:503,attempt:2},
        {operation:'fetch dependency',failureClass:'TRANSIENT_NETWORK',errorMessage:'503 service unavailable at https://c.test after 3000ms',httpStatus:503,attempt:3}
      ]
    },
    requireClosureEvidence:true
  });

  const missionDigest='9'.repeat(64);
  const close=superviseExecutionV77({
    closure:{
      missionDigest,
      expectedCapabilities:['cap_a'],
      receipts:[{
        missionDigest,
        capability:'cap_a',
        outcome:'SUCCEEDED',
        outputSummary:'Verified success.',
        evidenceRefs:['evidence:cap_a'],
        verificationPassed:true,
        executionAuthorized:true,
        claimRequested:'PASSED'
      }],
      claimRequested:'COMPLETED',
      requireAllCapabilities:true,
      requireSuccessfulOutcomes:true
    },
    requireClosureEvidence:true
  });

  const checks={
    transientRetry:transient.action==='RETRY_OPERATION'&&transient.dispatchAllowed,
    authStop:auth.action==='STOP_AND_ESCALATE'&&!auth.dispatchAllowed,
    repeatedFailureStops:looped.action==='STOP_AND_ESCALATE'&&!looped.dispatchAllowed,
    verifiedClosureCloses:close.action==='CLOSE_MISSION'&&!close.dispatchAllowed,
    deterministicDigest:/^[a-f0-9]{64}$/.test(close.supervisorDigest),
    noExecutionClaim:transient.executionClaim===false&&close.executionClaim===false
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
