import type { z } from 'zod';
import { autonomousLoopSchema, createAutonomousLoopSchema, advanceLoopSchema, loopHostResultSchema } from './autonomous-loop-schema';

type Loop = z.infer<typeof autonomousLoopSchema>;
type Step = Loop['steps'][number];

const now = () => new Date().toISOString();
const rid = (projectId:string) => `krom34_${Buffer.from(`${projectId}|${Date.now()}`).toString('base64url').slice(0,18)}`;

function mk(id:string, phase:Step['phase'], title:string, requiredTools:string[], requiredEvidence:string[], agent?:string):Step {
  return { id, phase, title, status:'READY', requiredTools, requiredEvidence, agent, attempts:0, blockers:[], notes:[] };
}

export function createAutonomousLoop(input: z.infer<typeof createAutonomousLoopSchema>): Loop {
  const steps:Step[] = [];
  steps.push(mk('S1','INTAKE','Normalize objective, scope and constraints',[],['Objective and scope contract'],'master-orchestrator'));
  if (input.existingProject) steps.push(mk(`S${steps.length+1}`,'INSPECT','Inspect actual project state',['files'],['Project inventory','Current architecture evidence'],'system-architect'));
  if (input.researchRequired) steps.push(mk(`S${steps.length+1}`,'RESEARCH','Resolve current/domain-sensitive requirements',['web'],['Primary-source research evidence'],'domain-researcher'));
  steps.push(mk(`S${steps.length+1}`,'PLAN','Build dependency-aware implementation plan',[],['Task graph','Acceptance criteria'],'system-architect'));
  steps.push(mk(`S${steps.length+1}`,'AGENTS','Route specialist agents and validate handoffs',[],['Agent contracts','Validated handoffs'],'master-orchestrator'));
  steps.push(mk(`S${steps.length+1}`,'PATCH','Prepare and apply smallest coherent change through authorized host',['files'],['Patch contract','Diff evidence'],'backend-engineer'));
  steps.push(mk(`S${steps.length+1}`,'DEBUG','Diagnose and recover from implementation failures',['execution'],['Failure/root-cause evidence if errors occur'],'qa-engineer'));
  if (input.uiWork) steps.push(mk(`S${steps.length+1}`,'UIUX','Verify rendered UI/UX, responsive and RTL behavior',['browser'],['Rendered browser/UI evidence'],'ui-ux-director'));
  steps.push(mk(`S${steps.length+1}`,'VERIFY','Run build, type, tests and regression checks',['execution'],['Build/type/test evidence'],'qa-engineer'));
  steps.push(mk(`S${steps.length+1}`,'EVIDENCE','Bind claims to verified evidence',[],['Claim-evidence audit'],'release-auditor'));
  if (input.deploymentInScope) steps.push(mk(`S${steps.length+1}`,'RELEASE','Verify deployment and release readiness',['vercel'],['Deployment READY evidence','Release evidence gate'],'release-auditor'));

  const created = now();
  return { schemaVersion:'1', runId:rid(input.projectId), projectId:input.projectId, objective:input.objective, status:'READY', currentPhase:steps[0]?.phase ?? 'DONE', currentStepId:steps[0]?.id ?? null, maxAttemptsPerStep:input.maxAttemptsPerStep, createdAt:created, updatedAt:created, steps, evidence:[], blockers:[], decisions:[] };
}

function recompute(loop:Loop):Loop {
  const next = loop.steps.find(s => s.status !== 'DONE');
  const blocked = loop.steps.some(s => s.status === 'BLOCKED') || loop.blockers.length > 0;
  const failed = loop.steps.some(s => s.status === 'FAILED');
  if (!next) return {...loop,status:'DONE',currentPhase:'DONE',currentStepId:null,updatedAt:now()};
  return {...loop,status: blocked ? 'BLOCKED' : failed ? 'FAILED' : 'READY',currentPhase:next.phase,currentStepId:next.id,updatedAt:now()};
}

export function advanceAutonomousLoop(input:z.infer<typeof advanceLoopSchema>):Loop {
  let loop:Loop = JSON.parse(JSON.stringify(input.loop));
  loop.evidence.push(...input.evidence);
  loop.blockers = Array.from(new Set([...loop.blockers,...input.blockers]));
  if (input.completedStepId) {
    const s = loop.steps.find(x=>x.id===input.completedStepId); if (s) { s.status='DONE'; s.notes.push(...input.notes); }
  }
  if (input.failedStepId) {
    const s = loop.steps.find(x=>x.id===input.failedStepId); if (s) { s.attempts++; s.notes.push(...input.notes); s.status = s.attempts >= loop.maxAttemptsPerStep ? 'BLOCKED' : 'READY'; if(s.status==='BLOCKED') s.blockers.push('Retry budget exhausted; change strategy or provide new evidence.'); }
  }
  return recompute(loop);
}

export function recordLoopHostResult(input:z.infer<typeof loopHostResultSchema>):Loop {
  let loop:Loop = JSON.parse(JSON.stringify(input.loop));
  const s = loop.steps.find(x=>x.id===input.stepId);
  if (!s) return loop;
  loop.evidence.push(...input.evidence);
  s.notes.push(...input.notes);
  s.attempts += 1;
  const verifiedCount = input.evidence.filter(e=>e.verified).length;
  if (input.success && (s.requiredEvidence.length===0 || verifiedCount>0)) s.status='DONE';
  else if (!input.success && s.attempts >= loop.maxAttemptsPerStep) { s.status='BLOCKED'; s.blockers.push(...input.errors,'Retry budget exhausted.'); loop.blockers.push(...input.errors); }
  else { s.status='READY'; s.blockers.push(...input.errors); }
  return recompute(loop);
}

export function getNextAutonomousAction(loop:Loop) {
  const step = loop.steps.find(s=>s.id===loop.currentStepId) ?? loop.steps.find(s=>s.status!=='DONE');
  if (!step) return {status:'DONE', action:'No further action; evaluate final evidence and report.'};
  return {
    status: loop.status,
    step,
    hostAction: step.requiredTools.length ? `Host must use authorized tool(s): ${step.requiredTools.join(', ')}` : 'KROM may synthesize from already supplied evidence/state.',
    evidenceNeeded: step.requiredEvidence,
    rule: 'Do not advance a consequential step on narrative assertion alone; attach verified host evidence.'
  };
}

export function auditAutonomousLoop(loop:Loop) {
  const unsupportedDone = loop.steps.filter(s=>s.status==='DONE' && s.requiredEvidence.length && !loop.evidence.some(e=>e.verified));
  const blocked = loop.steps.filter(s=>s.status==='BLOCKED');
  const exhausted = loop.steps.filter(s=>s.attempts>=loop.maxAttemptsPerStep && s.status!=='DONE');
  return {
    runId:loop.runId,
    status:loop.status,
    completed:loop.steps.filter(s=>s.status==='DONE').length,
    total:loop.steps.length,
    verifiedEvidence:loop.evidence.filter(e=>e.verified).length,
    unsupportedDone:unsupportedDone.map(s=>s.id),
    blocked:blocked.map(s=>({id:s.id,blockers:s.blockers})),
    exhausted:exhausted.map(s=>s.id),
    releaseEligible: loop.status==='DONE' && unsupportedDone.length===0 && blocked.length===0,
    verdict: loop.status==='DONE' && unsupportedDone.length===0 && blocked.length===0 ? 'PASS' : blocked.length ? 'BLOCKED' : 'IN_PROGRESS'
  };
}

export function summarizeAutonomousLoop(loop:Loop) {
  return {
    runId:loop.runId, projectId:loop.projectId, objective:loop.objective, status:loop.status, currentPhase:loop.currentPhase,
    currentStepId:loop.currentStepId, progress:`${loop.steps.filter(s=>s.status==='DONE').length}/${loop.steps.length}`,
    blockers:loop.blockers, next:getNextAutonomousAction(loop)
  };
}
