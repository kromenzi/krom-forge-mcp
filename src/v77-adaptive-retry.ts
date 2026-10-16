import { createHash } from 'node:crypto';
import { z } from 'zod';

export const v77AdaptiveRetrySchema=z.object({
  operation:z.string().min(1),
  attempt:z.number().int().min(0).max(20),
  maxAttempts:z.number().int().min(1).max(20).default(3),
  errorCode:z.string().optional(),
  errorMessage:z.string().min(1),
  httpStatus:z.number().int().min(100).max(599).optional(),
  hostAuthorized:z.boolean().default(false),
  schemaValidated:z.boolean().default(false),
  priorIdenticalFailures:z.number().int().min(0).max(20).default(0),
  sideEffectRisk:z.enum(['NONE','LOW','MEDIUM','HIGH']).default('LOW')
});

export type V77AdaptiveRetryInput=z.infer<typeof v77AdaptiveRetrySchema>;
export type V77FailureClass=
  |'TRANSIENT_NETWORK'
  |'RATE_LIMIT'
  |'DEPENDENCY_TEMPORARY'
  |'AUTHORIZATION'
  |'VALIDATION'
  |'NOT_FOUND'
  |'CONFLICT'
  |'CODE_DEFECT'
  |'STRUCTURAL'
  |'UNKNOWN';

function norm(value:string){ return value.toLowerCase(); }
function hash(value:unknown){ return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }

export function classifyFailureV77(input:V77AdaptiveRetryInput){
  const parsed=v77AdaptiveRetrySchema.parse(input);
  const m=norm(parsed.errorMessage);
  const code=norm(parsed.errorCode??'');
  const status=parsed.httpStatus;

  let failureClass:V77FailureClass='UNKNOWN';
  if(status===401||status===403||/unauthor|forbidden|permission denied|rls|auth/.test(m+' '+code)) failureClass='AUTHORIZATION';
  else if(status===429||/rate limit|too many requests|quota/.test(m+' '+code)) failureClass='RATE_LIMIT';
  else if(status===400||status===422||/validation|invalid input|schema|zod/.test(m+' '+code)) failureClass='VALIDATION';
  else if(/typeerror|referenceerror|syntaxerror|compile|typescript|ts\d+|build failed|test failed|assert|cannot find module/.test(m+' '+code)) failureClass='CODE_DEFECT';
  else if(status===404||/not found|missing route/.test(m+' '+code)) failureClass='NOT_FOUND';
  else if(status===409||/conflict|already exists|duplicate/.test(m+' '+code)) failureClass='CONFLICT';
  else if((status&&status>=500)||/timeout|timed out|econnreset|network|socket hang up|temporary|temporarily unavailable|service unavailable|gateway/.test(m+' '+code)) failureClass='TRANSIENT_NETWORK';
  else if(/architecture|structural|migration conflict|incompatible contract|breaking change|dependency cycle/.test(m+' '+code)) failureClass='STRUCTURAL';

  const retryable=['TRANSIENT_NETWORK','RATE_LIMIT','DEPENDENCY_TEMPORARY'].includes(failureClass);
  const requiresReplan=['CODE_DEFECT','STRUCTURAL','NOT_FOUND','CONFLICT'].includes(failureClass);
  const hardStop=['AUTHORIZATION','VALIDATION'].includes(failureClass);

  return {
    release:'v77',
    failureClass,
    retryable,
    requiresReplan,
    hardStop,
    executionClaim:false
  } as const;
}

export function buildAdaptiveRetryDecisionV77(input:V77AdaptiveRetryInput){
  const parsed=v77AdaptiveRetrySchema.parse(input);
  const classification=classifyFailureV77(parsed);
  const attemptsRemaining=Math.max(0,parsed.maxAttempts-parsed.attempt);
  const repeated=parsed.priorIdenticalFailures>=2;
  const risky=parsed.sideEffectRisk==='HIGH'||parsed.sideEffectRisk==='MEDIUM';

  const blockers:string[]=[];
  if(classification.hardStop) blockers.push('NON_RETRYABLE_POLICY_FAILURE');
  if(parsed.attempt>=parsed.maxAttempts) blockers.push('RETRY_BUDGET_EXHAUSTED');
  if(repeated) blockers.push('CIRCUIT_BREAK_IDENTICAL_FAILURES');
  if(risky&&!parsed.hostAuthorized) blockers.push('HOST_AUTHORIZATION_REQUIRED');
  if(risky&&!parsed.schemaValidated) blockers.push('SCHEMA_VALIDATION_REQUIRED');

  let decision:'RETRY'|'REPLAN'|'STOP'='STOP';
  if(blockers.length===0&&classification.retryable) decision='RETRY';
  else if(blockers.length===0&&classification.requiresReplan) decision='REPLAN';
  else if(blockers.length===0&&classification.failureClass==='UNKNOWN') decision='REPLAN';

  const backoffSeconds=decision==='RETRY'
    ? Math.min(300,Math.max(2,Math.pow(2,Math.max(0,parsed.attempt))*2))
    : 0;

  const canonical={
    release:'v77',
    operation:parsed.operation,
    attempt:parsed.attempt,
    maxAttempts:parsed.maxAttempts,
    attemptsRemaining,
    failureClass:classification.failureClass,
    decision,
    backoffSeconds,
    blockers:[...blockers].sort(),
    sideEffectRisk:parsed.sideEffectRisk,
    hostAuthorized:parsed.hostAuthorized,
    schemaValidated:parsed.schemaValidated
  };

  return {
    ...canonical,
    decisionDigest:hash(canonical),
    classification,
    circuitOpen:blockers.includes('CIRCUIT_BREAK_IDENTICAL_FAILURES')||blockers.includes('RETRY_BUDGET_EXHAUSTED'),
    executionClaim:false
  } as const;
}

export function buildSafeReplanV77(input:V77AdaptiveRetryInput){
  const decision=buildAdaptiveRetryDecisionV77(input);
  const actions:{order:number;action:string;reason:string}[]=[];

  if(decision.failureClass==='AUTHORIZATION'){
    actions.push({order:1,action:'REQUEST_OR_REVALIDATE_AUTHORIZATION',reason:'Authorization failures must not be retried blindly.'});
  } else if(decision.failureClass==='VALIDATION'){
    actions.push({order:1,action:'REVALIDATE_INPUT_CONTRACT',reason:'Input/schema failures require correction before dispatch.'});
  } else if(decision.failureClass==='CODE_DEFECT'){
    actions.push(
      {order:1,action:'INSPECT_FAILURE_EVIDENCE',reason:'Identify the concrete failing code path.'},
      {order:2,action:'PATCH_SMALLEST_COHERENT_SCOPE',reason:'Avoid retrying deterministic code defects.'},
      {order:3,action:'RUN_FOCUSED_VERIFICATION',reason:'Require evidence before redispatch.'}
    );
  } else if(decision.failureClass==='STRUCTURAL'){
    actions.push(
      {order:1,action:'REBUILD_DEPENDENCY_OR_CONTRACT_MODEL',reason:'Structural failures need architecture-level correction.'},
      {order:2,action:'ASSESS_BLAST_RADIUS',reason:'Prevent local fixes from hiding systemic breakage.'},
      {order:3,action:'REPLAN_EXECUTION_GRAPH',reason:'Update task dependencies before retry.'}
    );
  } else if(decision.decision==='RETRY'){
    actions.push(
      {order:1,action:'WAIT_BACKOFF',reason:`Wait ${decision.backoffSeconds}s before retry.`},
      {order:2,action:'RETRY_SAME_OPERATION_ONCE',reason:'Failure class is transient and within bounded retry budget.'},
      {order:3,action:'VERIFY_NEW_EVIDENCE',reason:'Do not reuse stale failure evidence as success proof.'}
    );
  } else {
    actions.push(
      {order:1,action:'INSPECT_NEW_EVIDENCE',reason:'Unknown failure must be understood before further execution.'},
      {order:2,action:'REPLAN_OR_ESCALATE',reason:'Avoid unbounded retries.'}
    );
  }

  const canonical={
    release:'v77',
    operation:input.operation,
    failureClass:decision.failureClass,
    decision:decision.decision,
    blockers:decision.blockers,
    actions
  };

  return {
    ...canonical,
    replanDigest:hash(canonical),
    retryAllowed:decision.decision==='RETRY',
    requiresHumanOrHigherPolicy:decision.failureClass==='AUTHORIZATION'||decision.failureClass==='STRUCTURAL',
    executionClaim:false
  } as const;
}

export function auditAdaptiveRetryV77(){
  const transient=buildAdaptiveRetryDecisionV77({
    operation:'fetch dependency',
    attempt:1,
    maxAttempts:3,
    errorMessage:'502 gateway timeout',
    httpStatus:502,
    hostAuthorized:true,
    schemaValidated:true,
    priorIdenticalFailures:0,
    sideEffectRisk:'LOW'
  });
  const auth=buildAdaptiveRetryDecisionV77({
    operation:'deploy production',
    attempt:0,
    maxAttempts:3,
    errorMessage:'403 permission denied',
    httpStatus:403,
    hostAuthorized:false,
    schemaValidated:true,
    priorIdenticalFailures:0,
    sideEffectRisk:'HIGH'
  });
  const defect=buildAdaptiveRetryDecisionV77({
    operation:'build',
    attempt:1,
    maxAttempts:3,
    errorMessage:'TypeScript TS2307 cannot find module',
    hostAuthorized:true,
    schemaValidated:true,
    priorIdenticalFailures:0,
    sideEffectRisk:'LOW'
  });
  const exhausted=buildAdaptiveRetryDecisionV77({
    operation:'fetch dependency',
    attempt:3,
    maxAttempts:3,
    errorMessage:'service unavailable',
    httpStatus:503,
    hostAuthorized:true,
    schemaValidated:true,
    priorIdenticalFailures:2,
    sideEffectRisk:'LOW'
  });
  const deterministicA=buildSafeReplanV77({
    operation:'build',
    attempt:1,
    maxAttempts:3,
    errorMessage:'TypeScript TS2307 cannot find module',
    hostAuthorized:true,
    schemaValidated:true,
    priorIdenticalFailures:0,
    sideEffectRisk:'LOW'
  });
  const deterministicB=buildSafeReplanV77({
    operation:'build',
    attempt:1,
    maxAttempts:3,
    errorMessage:'TypeScript TS2307 cannot find module',
    hostAuthorized:true,
    schemaValidated:true,
    priorIdenticalFailures:0,
    sideEffectRisk:'LOW'
  });

  const checks={
    transientRetries:transient.decision==='RETRY'&&transient.backoffSeconds>0,
    authStops:auth.decision==='STOP'&&auth.failureClass==='AUTHORIZATION',
    defectReplans:defect.decision==='REPLAN'&&defect.failureClass==='CODE_DEFECT',
    exhaustionOpensCircuit:exhausted.decision==='STOP'&&exhausted.circuitOpen,
    deterministicReplan:deterministicA.replanDigest===deterministicB.replanDigest&&/^[a-f0-9]{64}$/.test(deterministicA.replanDigest),
    noExecutionClaim:transient.executionClaim===false&&auth.executionClaim===false
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
