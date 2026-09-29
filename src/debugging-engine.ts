import type { z } from 'zod';
import { debugSessionSchema, createDebugSessionSchema, debugEvidenceSchema, debugHypothesisSchema, debugAttemptSchema } from './debugging-schema';

type Session = z.infer<typeof debugSessionSchema>;
type Evidence = z.infer<typeof debugEvidenceSchema>;
type Hypothesis = z.infer<typeof debugHypothesisSchema>;
type Attempt = z.infer<typeof debugAttemptSchema>;

const now = () => new Date().toISOString();
const id = (prefix:string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
const clone = <T>(v:T):T => JSON.parse(JSON.stringify(v));

function uniqueById<T extends {id:string}>(items:T[]):T[]{
  const m = new Map<string,T>(); for(const x of items) m.set(x.id,x); return [...m.values()];
}

export function createDebugSession(input:z.infer<typeof createDebugSessionSchema>):Session {
  const s:Session = {
    sessionId:id('dbg'), objective:input.objective, symptom:input.symptom,
    environment:input.environment ?? 'Unknown', exactError:input.exactError ?? '',
    reproduction:{status:'NOT_ATTEMPTED',steps:[],expected:'',actual:'',evidenceIds:[]},
    classification:['UNKNOWN'], evidence:[], hypotheses:[], attempts:[],
    rootCause:{status:'UNKNOWN',statement:'',evidenceIds:[]},
    fix:{status:'NOT_PLANNED',summary:'',changedPaths:[],evidenceIds:[]},
    verification:{focusedCheck:'NOT_RUN',regression:'NOT_RUN',runtime:'NOT_RUN',browser:'NOT_RUN',evidenceIds:[]},
    blockers:[], notes: input.recentChanges.length ? [`Recent changes: ${input.recentChanges.join(' | ')}`] : []
  };
  return s;
}

export function classifyFailure(session:Session){
  const text = `${session.symptom} ${session.exactError} ${session.evidence.map(e=>e.summary).join(' ')}`.toLowerCase();
  const rules:[string,Session['classification'][number]][] = [
    ['permission','PERMISSION'],['403','PERMISSION'],['401','AUTH'],['auth','AUTH'],['rls','DATABASE'],['sql','DATABASE'],['database','DATABASE'],
    ['timeout','NETWORK'],['econn','NETWORK'],['dns','NETWORK'],['build','DEPLOYMENT'],['vercel','DEPLOYMENT'],['dependency','DEPENDENCY'],['module not found','DEPENDENCY'],
    ['typescript','CODE'],['typeerror','CODE'],['referenceerror','CODE'],['config','CONFIG'],['env','CONFIG'],['hydration','UI'],['responsive','UI'],['browser','UI'],['slow','PERFORMANCE'],['latency','PERFORMANCE']
  ];
  const found = rules.filter(([k])=>text.includes(k)).map(([,v])=>v);
  return {classification:[...new Set(found.length?found:['UNKNOWN'])], rationale: found.length ? 'Classification derived from supplied symptom/error/evidence text.' : 'Insufficient evidence for deterministic classification.'};
}

export function addEvidence(session:Session,evidence:Evidence){
  const s=clone(session); s.evidence=uniqueById([...s.evidence,evidence]); return s;
}
export function addHypothesis(session:Session,hypothesis:Hypothesis){
  const s=clone(session); s.hypotheses=uniqueById([...s.hypotheses,hypothesis]); return s;
}
export function recordAttempt(session:Session,attempt:Attempt){
  const s=clone(session); const fp=attempt.fingerprint ?? `${attempt.hypothesisId??''}|${attempt.action}`.trim().toLowerCase();
  s.attempts.push({...attempt,fingerprint:fp}); return s;
}
export function updateReproduction(session:Session,reproduction:Session['reproduction']){const s=clone(session);s.reproduction=reproduction;return s;}
export function setRootCause(session:Session,rootCause:Session['rootCause']){const s=clone(session);s.rootCause=rootCause;return s;}
export function recordFix(session:Session,fix:Session['fix']){const s=clone(session);s.fix=fix;return s;}
export function verifyFix(session:Session,verification:Session['verification']){const s=clone(session);s.verification=verification;return s;}

export function buildRootCauseGraph(session:Session){
  const evidence = new Set(session.evidence.map(e=>e.id));
  const nodes:any[] = [
    {id:'symptom',type:'SYMPTOM',label:session.symptom},
    ...session.hypotheses.map(h=>({id:h.id,type:'HYPOTHESIS',label:h.statement,status:h.status})),
    ...session.evidence.map(e=>({id:e.id,type:'EVIDENCE',label:e.summary,verified:e.verified})),
    ...(session.rootCause.statement?[{id:'root_cause',type:'ROOT_CAUSE',label:session.rootCause.statement,status:session.rootCause.status}]:[])
  ];
  const edges:any[]=[];
  for(const h of session.hypotheses){
    edges.push({from:'symptom',to:h.id,relation:'EXPLAINS'});
    for(const e of h.supportingEvidenceIds) if(evidence.has(e)) edges.push({from:e,to:h.id,relation:'SUPPORTS'});
    for(const e of h.contradictingEvidenceIds) if(evidence.has(e)) edges.push({from:e,to:h.id,relation:'CONTRADICTS'});
  }
  for(const e of session.rootCause.evidenceIds) if(evidence.has(e)) edges.push({from:e,to:'root_cause',relation:'SUPPORTS'});
  return {sessionId:session.sessionId,nodes,edges,gaps:session.rootCause.status==='CONFIRMED'?[]:['Root cause not confirmed by supplied evidence.']};
}

export function antiLoopCheck(session:Session){
  const counts=new Map<string,Attempt[]>();
  for(const a of session.attempts){ const k=(a.fingerprint??`${a.hypothesisId??''}|${a.action}`).toLowerCase(); counts.set(k,[...(counts.get(k)||[]),a]); }
  const loops=[...counts.entries()].filter(([,v])=>v.filter(x=>x.outcome==='FAIL'||x.outcome==='INCONCLUSIVE').length>=2).map(([fingerprint,attempts])=>({fingerprint,attemptIds:attempts.map(a=>a.id),failedOrInconclusive:attempts.filter(a=>a.outcome==='FAIL'||a.outcome==='INCONCLUSIVE').length}));
  return {loopDetected:loops.length>0,loops,policy:loops.length?'Do not repeat the same fix/diagnostic. Gather new evidence, change the falsifiable hypothesis, or escalate to architecture/environment inspection.':'No repeated failed strategy detected.'};
}

export function recommendNextDiagnostic(session:Session){
  const loop=antiLoopCheck(session);
  if(session.reproduction.status==='NOT_ATTEMPTED') return {next:'REPRODUCE',instruction:'Capture exact reproduction steps, expected vs actual behavior, and at least one evidence item.'};
  if(session.reproduction.status==='NOT_REPRODUCED') return {next:'ENVIRONMENT_DIFF',instruction:'Compare environment, data, permissions, version/config and request path between failing and non-failing contexts.'};
  if(!session.evidence.some(e=>e.verified)) return {next:'COLLECT_VERIFIED_EVIDENCE',instruction:'Collect a verified log/stack/status/build/test/runtime/browser/database artifact before changing code.'};
  if(loop.loopDetected) return {next:'CHANGE_STRATEGY',instruction:loop.policy};
  const open=session.hypotheses.find(h=>h.status==='OPEN'||h.status==='SUPPORTED'||h.status==='WEAKENED');
  if(open) return {next:'DISPROVE_HYPOTHESIS',hypothesisId:open.id,instruction:`Run the smallest diagnostic that could disprove: ${open.statement}`};
  if(session.rootCause.status==='UNKNOWN') return {next:'FORM_HYPOTHESIS',instruction:'Form one falsifiable hypothesis linked to verified evidence.'};
  if(session.fix.status==='NOT_PLANNED') return {next:'PLAN_SMALLEST_FIX',instruction:'Plan the smallest coherent fix constrained to the confirmed root cause.'};
  if(session.fix.status==='APPLIED' && session.verification.focusedCheck==='NOT_RUN') return {next:'FOCUSED_VERIFY',instruction:'Rerun the exact failing check first.'};
  return {next:'REGRESSION_VERIFY',instruction:'Run proportional regression and runtime/browser verification before closure.'};
}

export function evaluateDebugClosure(session:Session){
  const validEvidence=new Set(session.evidence.filter(e=>e.verified).map(e=>e.id));
  const rcEvidenceOk=session.rootCause.status==='CONFIRMED' && session.rootCause.evidenceIds.some(x=>validEvidence.has(x));
  const fixEvidenceOk=session.fix.status==='APPLIED' && session.fix.evidenceIds.some(x=>validEvidence.has(x));
  const verificationEvidenceOk=session.verification.evidenceIds.some(x=>validEvidence.has(x));
  const focused=session.verification.focusedCheck==='PASS';
  const regression=session.verification.regression==='PASS';
  const runtime=['PASS','NOT_APPLICABLE'].includes(session.verification.runtime);
  const browser=['PASS','NOT_APPLICABLE'].includes(session.verification.browser);
  const blockers=[
    !rcEvidenceOk?'Root cause is not CONFIRMED with verified evidence.':null,
    !fixEvidenceOk?'Applied fix lacks verified evidence.':null,
    !focused?'Focused failing check has not passed.':null,
    !regression?'Regression verification has not passed.':null,
    !verificationEvidenceOk?'Verification has no verified evidence reference.':null,
    session.blockers.length?`Open blockers: ${session.blockers.join(' | ')}`:null
  ].filter(Boolean);
  return {status:blockers.length?'PASS_WITH_GAPS':'PASS',blockers,rootCauseVerified:rcEvidenceOk,fixVerified:fixEvidenceOk,verificationVerified:verificationEvidenceOk,runtime,browser,antiLoop:antiLoopCheck(session)};
}
