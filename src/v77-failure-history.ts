import { createHash } from 'node:crypto';
import { z } from 'zod';

export const v77FailureEventSchema=z.object({
  operation:z.string().min(1),
  failureClass:z.string().min(1),
  errorCode:z.string().optional(),
  errorMessage:z.string().min(1),
  httpStatus:z.number().int().min(100).max(599).optional(),
  attempt:z.number().int().min(0).max(100),
  timestamp:z.string().optional()
});

export const v77FailureHistorySchema=z.object({
  events:z.array(v77FailureEventSchema).max(100).default([]),
  maxHistory:z.number().int().min(1).max(100).default(20),
  loopThreshold:z.number().int().min(2).max(10).default(3)
});

export type V77FailureEvent=z.infer<typeof v77FailureEventSchema>;
export type V77FailureHistoryInput=z.infer<typeof v77FailureHistorySchema>;

function normalize(value:string){
  return value.toLowerCase()
    .replace(/https?:\/\/\S+/g,'<url>')
    .replace(/\b[0-9a-f]{32,}\b/gi,'<token>')
    .replace(/\b(?:sk|ghp|gho|github_pat|eyj)[-_a-z0-9.]{12,}\b/gi,'<secret>')
    .replace(/\b\d{4}-\d{2}-\d{2}t\S+\b/gi,'<time>')
    .replace(/\b\d+ms\b/g,'<duration>')
    .replace(/\b\d+s\b/g,'<duration>')
    .replace(/\s+/g,' ')
    .trim();
}

function stableHash(value:unknown){
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function fingerprintFailureV77(event:V77FailureEvent){
  const parsed=v77FailureEventSchema.parse(event);
  const normalizedMessage=normalize(parsed.errorMessage);
  const canonical={
    release:'v77',
    operation:normalize(parsed.operation),
    failureClass:normalize(parsed.failureClass),
    errorCode:normalize(parsed.errorCode??''),
    httpStatus:parsed.httpStatus??null,
    normalizedMessage
  };
  return {
    ...canonical,
    fingerprint:stableHash(canonical),
    redacted:true,
    executionClaim:false
  } as const;
}

export function buildFailureHistoryV77(input:V77FailureHistoryInput){
  const parsed=v77FailureHistorySchema.parse(input);
  const bounded=parsed.events.slice(-parsed.maxHistory);
  const records=bounded.map((event,index)=>({
    index,
    attempt:event.attempt,
    timestamp:event.timestamp??null,
    ...fingerprintFailureV77(event)
  }));

  const counts=new Map<string,number>();
  for(const record of records) counts.set(record.fingerprint,(counts.get(record.fingerprint)??0)+1);

  const repeated=[...counts.entries()]
    .filter(([,count])=>count>=parsed.loopThreshold)
    .map(([fingerprint,count])=>({fingerprint,count}))
    .sort((a,b)=>b.count-a.count||a.fingerprint.localeCompare(b.fingerprint));

  const latest=records.at(-1)??null;
  const latestRepeatCount=latest ? (counts.get(latest.fingerprint)??0) : 0;
  const loopDetected=latestRepeatCount>=parsed.loopThreshold;

  const canonical={
    release:'v77',
    maxHistory:parsed.maxHistory,
    loopThreshold:parsed.loopThreshold,
    records:records.map(r=>({
      fingerprint:r.fingerprint,
      operation:r.operation,
      failureClass:r.failureClass,
      errorCode:r.errorCode,
      httpStatus:r.httpStatus,
      normalizedMessage:r.normalizedMessage,
      attempt:r.attempt
    })),
    repeated
  };

  return {
    ...canonical,
    historyDigest:stableHash(canonical),
    size:records.length,
    latestFingerprint:latest?.fingerprint??null,
    latestRepeatCount,
    loopDetected,
    circuitRecommendation:loopDetected?'OPEN':'CLOSED',
    persistence:'HOST_CARRIED',
    persistenceClaim:false,
    executionClaim:false
  } as const;
}

export function appendFailureEventV77(
  input:V77FailureHistoryInput,
  event:V77FailureEvent
){
  const parsed=v77FailureHistorySchema.parse(input);
  const nextEvents=[...parsed.events,event].slice(-parsed.maxHistory);
  return buildFailureHistoryV77({
    events:nextEvents,
    maxHistory:parsed.maxHistory,
    loopThreshold:parsed.loopThreshold
  });
}

export function evaluateFailureLoopV77(input:V77FailureHistoryInput){
  const history=buildFailureHistoryV77(input);
  const action=history.loopDetected
    ? 'OPEN_CIRCUIT_AND_REPLAN'
    : history.latestRepeatCount===Math.max(1,history.loopThreshold-1)
      ? 'WARN_AND_LIMIT_NEXT_RETRY'
      : 'ALLOW_POLICY_DECISION';

  return {
    release:'v77',
    status:history.loopDetected?'BLOCKED':'PASS',
    action,
    latestFingerprint:history.latestFingerprint,
    latestRepeatCount:history.latestRepeatCount,
    loopThreshold:history.loopThreshold,
    historyDigest:history.historyDigest,
    circuitOpen:history.loopDetected,
    executionClaim:false,
    persistenceClaim:false
  } as const;
}

export function auditFailureHistoryV77(){
  const base:V77FailureEvent={
    operation:'fetch dependency',
    failureClass:'TRANSIENT_NETWORK',
    errorMessage:'503 Service unavailable at https://example.test/api after 1000ms',
    httpStatus:503,
    attempt:1
  };
  const sameDifferentVolatile:V77FailureEvent={
    ...base,
    errorMessage:'503 Service unavailable at https://other.test/api after 2000ms',
    attempt:2
  };
  const different:V77FailureEvent={
    operation:'build',
    failureClass:'CODE_DEFECT',
    errorMessage:'TypeScript TS2307 cannot find module ./x',
    attempt:1
  };

  const fp1=fingerprintFailureV77(base);
  const fp2=fingerprintFailureV77(sameDifferentVolatile);
  const fp3=fingerprintFailureV77(different);

  let history=buildFailureHistoryV77({events:[],maxHistory:3,loopThreshold:3});
  history=appendFailureEventV77({events:[],maxHistory:3,loopThreshold:3},base);
  history=appendFailureEventV77({
    events:[base],
    maxHistory:3,
    loopThreshold:3
  },sameDifferentVolatile);
  const loopHistory=appendFailureEventV77({
    events:[base,sameDifferentVolatile],
    maxHistory:3,
    loopThreshold:3
  },{...base,attempt:3});

  const bounded=buildFailureHistoryV77({
    events:[base,sameDifferentVolatile,{...base,attempt:3},different],
    maxHistory:3,
    loopThreshold:3
  });

  const checks={
    volatileNormalizationStable:fp1.fingerprint===fp2.fingerprint,
    differentFailureDifferentFingerprint:fp1.fingerprint!==fp3.fingerprint,
    loopDetected:loopHistory.loopDetected&&loopHistory.circuitRecommendation==='OPEN',
    boundedHistory:bounded.size===3,
    deterministicDigest:/^[a-f0-9]{64}$/.test(loopHistory.historyDigest),
    redactionFlagged:fp1.redacted===true,
    hostCarriedOnly:loopHistory.persistence==='HOST_CARRIED'&&loopHistory.persistenceClaim===false,
    noExecutionClaim:loopHistory.executionClaim===false
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
