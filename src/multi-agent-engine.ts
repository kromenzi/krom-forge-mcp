import type { AgentHandoff, AgentId, AgentRunInput } from './multi-agent-schema';

export type AgentContract = {
  id: AgentId;
  title: string;
  mission: string;
  owns: string[];
  requires: string[];
  outputs: string[];
  mayBlockRelease: boolean;
  preferredTools: string[];
};

export const AGENT_CONTRACTS: AgentContract[] = [
  { id:'orchestrator', title:'Master Orchestrator', mission:'Own scope, sequencing, dependencies, evidence and completion integrity.', owns:['task routing','dependency graph','run state','handoffs','priority'], requires:['objective','constraints','available evidence/tools'], outputs:['agent plan','task graph','handoff decisions','final run status'], mayBlockRelease:true, preferredTools:['files','web','github','supabase','vercel','execution','browser'] },
  { id:'architect', title:'System Architect', mission:'Define coherent boundaries, trust zones, modules, integrations and failure domains.', owns:['system architecture','module boundaries','trust boundaries','integration contracts'], requires:['project inventory','requirements','constraints'], outputs:['architecture map','decision log','risk notes'], mayBlockRelease:true, preferredTools:['files','web'] },
  { id:'researcher', title:'Domain Researcher', mission:'Collect and synthesize current evidence without promoting assumptions into facts.', owns:['source classification','requirements extraction','domain model','research gaps'], requires:['domain/objective','host-supplied sources'], outputs:['evidence map','requirements','domain model','research gaps'], mayBlockRelease:false, preferredTools:['web','files'] },
  { id:'backend', title:'Backend Engineer', mission:'Own server behavior, APIs, validation, transactions, integrations and failure semantics.', owns:['APIs','server actions','business rules','idempotency','integration adapters'], requires:['architecture','data contracts','permissions'], outputs:['backend change plan','API contracts','verification requirements'], mayBlockRelease:false, preferredTools:['files','execution','supabase','github'] },
  { id:'frontend', title:'Frontend Engineer', mission:'Own routes, components, forms, state, API integration and resilient UI behavior.', owns:['frontend routes','components','forms','state','error/loading/offline states'], requires:['UI spec','API contracts','project conventions'], outputs:['frontend change plan','route/component map','verification requirements'], mayBlockRelease:false, preferredTools:['files','execution','browser'] },
  { id:'uiux', title:'UI/UX Director', mission:'Own hierarchy, design tokens, responsive reflow, RTL/LTR, accessibility and visual quality.', owns:['information architecture','design system','responsive behavior','RTL/LTR','accessibility'], requires:['users','screens','workflow priorities'], outputs:['UI/UX blueprint','design tokens','visual verification checklist'], mayBlockRelease:false, preferredTools:['figma','browser','files'] },
  { id:'database', title:'Database Architect', mission:'Protect data integrity, migrations, indexes, RLS and tenant isolation.', owns:['schema','constraints','indexes','migrations','RLS','data invariants'], requires:['domain model','permissions','current schema evidence'], outputs:['ERD changes','migration plan','RLS matrix','negative tests'], mayBlockRelease:true, preferredTools:['supabase','files','execution'] },
  { id:'security', title:'Security Reviewer', mission:'Independently review authentication, authorization, secrets, uploads and abuse paths.', owns:['authn/authz review','RLS review','secret handling','IDOR/CSRF/XSS/SSRF risk','upload security'], requires:['architecture','code/diff evidence','permission model'], outputs:['security findings','severity','release blockers'], mayBlockRelease:true, preferredTools:['files','supabase','execution','browser'] },
  { id:'qa', title:'QA Engineer', mission:'Independently verify behavior with proportional deterministic and browser evidence.', owns:['test matrix','regression','negative tests','UI/runtime verification'], requires:['acceptance criteria','implementation evidence'], outputs:['QA report','failures','evidence gaps'], mayBlockRelease:true, preferredTools:['execution','browser','files'] },
  { id:'devops', title:'DevOps Engineer', mission:'Own build/deploy configuration, environments, logs, migrations and rollback.', owns:['CI/CD','Vercel','environment config','deployment evidence','rollback'], requires:['build output','deployment target','migration state'], outputs:['deployment status','runtime evidence','rollback plan'], mayBlockRelease:true, preferredTools:['vercel','github','execution'] },
  { id:'release-auditor', title:'Release Auditor', mission:'Evaluate evidence independently and refuse unsupported green status.', owns:['release gate','blockers','evidence gaps','final readiness'], requires:['QA','security','devops','build/test/deploy evidence'], outputs:['PASS/FAIL/PASS_WITH_GAPS','blockers','gaps'], mayBlockRelease:true, preferredTools:['execution','browser','vercel','github','supabase'] }
];

const agentMap = Object.fromEntries(AGENT_CONTRACTS.map(a => [a.id, a])) as Record<AgentId, AgentContract>;
const q = (s:string) => s.toLowerCase();
const has = (s:string, terms:string[]) => terms.some(t => q(s).includes(t));

export function listAgents() {
  return { agents: AGENT_CONTRACTS, handoffContract:['STATUS','CHANGES','EVIDENCE','RISKS','OPEN_ITEMS','NEXT_AGENT'], principle:'Agents coordinate through explicit evidence-bearing handoffs. A role label alone never proves that work occurred.' };
}

export function routeAgent(objective:string) {
  const ids = new Set<AgentId>(['orchestrator']);
  if (has(objective,['architecture','architect','بنية','معمار'])) ids.add('architect');
  if (has(objective,['research','current','latest','regulation','standard','بحث','لائحة','اشتراط'])) ids.add('researcher');
  if (has(objective,['database','supabase','postgres','rls','migration','قاعدة','سياسة'])) ids.add('database');
  if (has(objective,['api','backend','server','webhook','خلفية'])) ids.add('backend');
  if (has(objective,['frontend','react','next','route','component','واجهة'])) ids.add('frontend');
  if (has(objective,['ui','ux','responsive','mobile','rtl','figma','تصميم','جوال'])) ids.add('uiux');
  if (has(objective,['security','auth','permission','vulnerability','أمان','صلاحيات'])) ids.add('security');
  if (has(objective,['test','qa','regression','verify','اختبار','تحقق'])) ids.add('qa');
  if (has(objective,['deploy','vercel','github','ci','runtime','نشر','فيرسال'])) ids.add('devops');
  if (has(objective,['release','production','ready','gate','إصدار','جاهز'])) ids.add('release-auditor');
  if (ids.size === 1) ['architect','backend','frontend','qa'].forEach(x => ids.add(x as AgentId));
  const ordered:AgentId[] = ['orchestrator','researcher','architect','database','backend','frontend','uiux','security','qa','devops','release-auditor'];
  return { objective, agents: ordered.filter(id => ids.has(id)).map(id => agentMap[id]), rule:'The orchestrator may narrow or expand the sequence only when scope/evidence justifies it.' };
}

export function createAgentRun(input:AgentRunInput) {
  const routed = routeAgent(input.objective).agents.map(a=>a.id);
  const selected = input.requestedAgents.length ? Array.from(new Set<AgentId>(['orchestrator', ...input.requestedAgents])) : routed;
  const ordered:AgentId[] = ['orchestrator','researcher','architect','database','backend','frontend','uiux','security','qa','devops','release-auditor'];
  const agents = ordered.filter(id => selected.includes(id)).map((id,index) => ({
    agent:id,
    status:index===0?'READY':'PENDING',
    dependsOn:index===0?[]:[ordered.filter(x=>selected.includes(x))[index-1]],
    contract:agentMap[id],
    evidenceRequired:agentMap[id].requires,
    outputRequired:agentMap[id].outputs
  }));
  return {
    schemaVersion:'1',
    runId:`krom-agent-${Date.now()}`,
    objective:input.objective,
    existingProject:input.existingProject,
    constraints:input.constraints,
    availableTools:input.availableTools,
    evidenceSummary:input.evidenceSummary,
    agents,
    currentAgent:agents[0]?.agent ?? null,
    handoffs:[],
    rule:'This is a coordination state, not proof that any agent executed tools or modified code.'
  };
}

export function validateHandoff(h:AgentHandoff) {
  const errors:string[]=[];
  if (h.fromAgent === h.toAgent) errors.push('fromAgent and toAgent must differ.');
  if ((h.status==='PASS' || h.status==='PASS_WITH_GAPS') && h.evidence.length===0) errors.push('Passing handoff requires evidence.');
  if (h.status==='PASS' && h.evidence.some(e=>!e.verified)) errors.push('PASS cannot contain unverified evidence. Use PASS_WITH_GAPS.');
  if (h.status==='FAIL' && h.risks.length===0 && h.blockers.length===0) errors.push('FAIL requires a risk or blocker.');
  if (h.status==='BLOCKED' && h.blockers.length===0) errors.push('BLOCKED requires blockers.');
  return { valid:errors.length===0, status:errors.length?'INVALID_HANDOFF':'VALID_HANDOFF', errors, handoff:h };
}

export function buildHandoffSummary(h:AgentHandoff) {
  const validation=validateHandoff(h);
  return {
    ...validation,
    summary:{
      STATUS:h.status,
      CHANGES:h.changes,
      EVIDENCE:h.evidence,
      RISKS:h.risks,
      OPEN_ITEMS:h.openItems,
      BLOCKERS:h.blockers,
      NEXT_AGENT:h.toAgent
    }
  };
}

export function coordinateAgents(input:{objective:string; handoffs:AgentHandoff[]}) {
  const checks=input.handoffs.map(validateHandoff);
  const invalid=checks.filter(c=>!c.valid);
  const blocked=input.handoffs.filter(h=>h.status==='BLOCKED' || h.status==='FAIL');
  const verified=input.handoffs.flatMap(h=>h.evidence).filter(e=>e.verified).length;
  const total=input.handoffs.flatMap(h=>h.evidence).length;
  return {
    objective:input.objective,
    coordinationStatus:invalid.length?'INVALID_HANDOFFS':blocked.length?'BLOCKED':input.handoffs.length?'IN_PROGRESS':'NOT_STARTED',
    handoffCount:input.handoffs.length,
    invalidHandoffs:invalid.map((x,i)=>({index:i,errors:x.errors})),
    blockedBy:blocked.map(h=>({agent:h.fromAgent,status:h.status,blockers:h.blockers,risks:h.risks})),
    evidence:{verified,total},
    nextAction:invalid.length?'Repair invalid handoff contracts before routing work.':blocked.length?'Resolve blockers before downstream execution.':'Continue to the next dependency-ready specialist; final release still requires independent release-auditor evidence.'
  };
}

export function evaluateAgentRun(input:{handoffs:AgentHandoff[]; requireReleaseAuditor?:boolean}) {
  const checks=input.handoffs.map(validateHandoff);
  const invalid=checks.filter(c=>!c.valid);
  const fails=input.handoffs.filter(h=>h.status==='FAIL' || h.status==='BLOCKED');
  const gaps=input.handoffs.filter(h=>h.status==='PASS_WITH_GAPS' || h.openItems.length || h.evidence.some(e=>!e.verified));
  const release=input.handoffs.find(h=>h.fromAgent==='release-auditor');
  const requireRelease=input.requireReleaseAuditor ?? true;
  let overall='PASS';
  if (invalid.length || fails.length) overall='FAIL';
  else if (gaps.length || (requireRelease && !release)) overall='PASS_WITH_GAPS';
  return {
    overall,
    invalidHandoffs:invalid.length,
    failingAgents:fails.map(h=>h.fromAgent),
    gapAgents:gaps.map(h=>h.fromAgent),
    releaseAuditorPresent:!!release,
    evidenceVerified:input.handoffs.flatMap(h=>h.evidence).filter(e=>e.verified).length,
    evidenceTotal:input.handoffs.flatMap(h=>h.evidence).length,
    rule:'Overall PASS requires valid handoffs, no failures/blockers, no unresolved evidence gaps, and a release-auditor handoff when required.'
  };
}
