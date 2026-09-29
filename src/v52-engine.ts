import { z } from 'zod';
import {
  engineeringConstitutionSchema, constraintSolverSchema, trustGraphSchema, changeSimulationSchema,
  recoveryStrategySchema, verificationEconomicsSchema, multiProjectCoordinationSchema, operatorCockpitSchema
} from './v52-schema';

type Constitution = z.infer<typeof engineeringConstitutionSchema>;
type Solver = z.infer<typeof constraintSolverSchema>;
type Trust = z.infer<typeof trustGraphSchema>;
type Simulation = z.infer<typeof changeSimulationSchema>;
type Recovery = z.infer<typeof recoveryStrategySchema>;
type Verification = z.infer<typeof verificationEconomicsSchema>;
type Program = z.infer<typeof multiProjectCoordinationSchema>;
type Cockpit = z.infer<typeof operatorCockpitSchema>;

const uniq=<T>(items:T[])=>[...new Set(items)];
const verified=(evidence:Array<{id:string;verified:boolean}>)=>new Set(evidence.filter(x=>x.verified).map(x=>x.id));
const refsVerified=(refs:string[],ids:Set<string>)=>refs.length>0&&refs.every(r=>ids.has(r));
const severityRank:Record<string,number>={CRITICAL:4,HIGH:3,MEDIUM:2,LOW:1};

// 1) Engineering Constitution
export function compileEngineeringConstitution(input:Constitution){
  return {constitutionId:input.constitutionId,principles:[...input.principles].sort((a,b)=>b.priority-a.priority),mandatoryIds:input.principles.filter(p=>p.mandatory).map(p=>p.id)};
}
export function evaluateConstitutionCompliance(input:Constitution){
  const ids=new Set(input.principles.map(p=>p.id)); const ev=verified(input.evidence);
  const violations=input.proposedActions.flatMap(a=>a.violates.filter(v=>ids.has(v)).map(v=>({actionId:a.id,principleId:v})));
  const unsupported=input.principles.filter(p=>p.mandatory&&!refsVerified(p.evidenceRefs,ev)).map(p=>p.id);
  return {status:violations.length||unsupported.length?'BLOCKED':'PASS',violations,unsupportedMandatoryPrinciples:unsupported};
}
export function detectConstitutionConflicts(input:Constitution){
  const seen=new Map<string,string[]>(); for(const a of input.proposedActions) for(const p of a.principleIds){const arr=seen.get(p)??[];arr.push(a.id);seen.set(p,arr)}
  return {conflicts:[...seen.entries()].filter(([,a])=>a.length>1).map(([principleId,actions])=>({principleId,actions})),explicitViolations:input.proposedActions.filter(a=>a.violates.length).map(a=>a.id)};
}
export function compareEngineeringConstitutions(input:Constitution){
  const current=input.principles.map(p=>p.id);return{added:current.filter(id=>!input.previousPrincipleIds.includes(id)),removed:input.previousPrincipleIds.filter(id=>!current.includes(id)),compliance:evaluateConstitutionCompliance(input)};
}

// 2) Constraint Solver
function domains(input:Solver){
  const out:Record<string,string[]>={}; for(const [k,v] of Object.entries(input.variables)) out[k]=[...v];
  for(const c of input.constraints){ if(!out[c.variable]) out[c.variable]=[]; if(c.allowed.length) out[c.variable]=out[c.variable].filter(v=>c.allowed.includes(v)); if(c.forbidden.length) out[c.variable]=out[c.variable].filter(v=>!c.forbidden.includes(v)); }
  return out;
}
export function solveEngineeringConstraints(input:Solver){
  const d=domains(input); const selection:Record<string,string>={}; for(const [k,v] of Object.entries(d)) if(v.length) selection[k]=input.currentSelection[k]&&v.includes(input.currentSelection[k])?input.currentSelection[k]:v[0];
  const unsatisfied=input.constraints.filter(c=>c.mandatory&&(!selection[c.variable]||!d[c.variable]?.includes(selection[c.variable]))).map(c=>c.id);
  return{status:unsatisfied.length?'UNSAT':'SAT',selection,unsatisfied};
}
export function extractUnsatCore(input:Solver){
  const d=domains(input);return{unsatCore:input.constraints.filter(c=>c.mandatory&&d[c.variable]?.length===0).map(c=>c.id)};
}
export function buildConstraintRelaxationPlan(input:Solver){
  const core=new Set(extractUnsatCore(input).unsatCore);return{relaxations:input.constraints.filter(c=>core.has(c.id)).sort((a,b)=>a.weight-b.weight).map(c=>({constraintId:c.id,action:'REVIEW_OR_RELAX',weight:c.weight}))};
}
export function compareConstraintSolutions(input:Solver){
  const current=solveEngineeringConstraints(input).selection;return{changed:Object.entries(current).filter(([k,v])=>input.previousSelection[k]!==undefined&&input.previousSelection[k]!==v).map(([variable,after])=>({variable,before:input.previousSelection[variable],after})),current};
}

// 3) Trust Graph
function trustScores(input:Trust){
  const ev=verified(input.evidence); const scores=new Map(input.nodes.map(n=>[n.id,refsVerified(n.evidenceRefs,ev)?n.directTrust:0]));
  for(let i=0;i<input.nodes.length;i++) for(const edge of input.edges){const from=scores.get(edge.from)??0,to=scores.get(edge.to)??0;const propagated=Math.min(from,edge.confidence);if(propagated>to)scores.set(edge.to,propagated)}
  return scores;
}
export function buildEngineeringTrustGraph(input:Trust){return{nodes:input.nodes,edges:input.edges,scores:Object.fromEntries(trustScores(input))};}
export function evaluateTransitiveTrust(input:Trust){const scores=trustScores(input);return{scores:Object.fromEntries(scores),untrusted:[...scores].filter(([,s])=>s===0).map(([id])=>id),lowTrust:[...scores].filter(([,s])=>s>0&&s<60).map(([id])=>id)};}
export function detectTrustWeakLinks(input:Trust){const scores=trustScores(input);return{weakNodes:[...scores].filter(([,s])=>s<60).map(([id,score])=>({id,score})),weakEdges:input.edges.filter(e=>e.confidence<60)};}
export function compareTrustGraphs(input:Trust){const scores=trustScores(input);return{changes:[...scores].filter(([id,score])=>input.previousScores[id]!==undefined&&input.previousScores[id]!==score).map(([id,score])=>({id,before:input.previousScores[id],after:score}))};}

// 4) Change Simulation
function impacted(input:Simulation){
  const deps=new Map<string,string[]>();for(const c of input.components)for(const d of c.dependsOn){const arr=deps.get(d)??[];arr.push(c.id);deps.set(d,arr)}
  const seen=new Set(input.changes.map(c=>c.componentId));const q=[...seen];while(q.length){const n=q.shift()!;for(const d of deps.get(n)??[])if(!seen.has(d)){seen.add(d);q.push(d)}}return seen;
}
export function simulateChangeBlastRadius(input:Simulation){const set=impacted(input);return{impacted:[...set],criticalImpacted:input.components.filter(c=>set.has(c.id)&&c.criticality==='CRITICAL').map(c=>c.id)};}
export function detectChangeCascades(input:Simulation){const set=impacted(input);return{cascades:input.components.filter(c=>set.has(c.id)&&!input.changes.some(x=>x.componentId===c.id)).map(c=>c.id),irreversibleChanges:input.changes.filter(c=>!c.reversible).map(c=>c.id)};}
export function buildChangeSafeguardPlan(input:Simulation){const set=impacted(input);return{actions:input.components.filter(c=>set.has(c.id)).map(c=>({componentId:c.id,action:c.safeguards.length?'VERIFY_SAFEGUARDS':'ADD_SAFEGUARDS',safeguards:c.safeguards}))};}
export function compareChangeSimulations(input:Simulation){const now=[...impacted(input)];return{newlyImpacted:now.filter(id=>!input.previousImpactedIds.includes(id)),resolved:input.previousImpactedIds.filter(id=>!now.includes(id)),current:now};}

// 5) Recovery Strategy
function recoveryScores(input:Recovery){
  const ev=verified(input.evidence);return input.strategies.map(s=>{const depsOk=s.dependencies.every(d=>input.availableDependencies.includes(d));const evidenceOk=refsVerified(s.evidenceRefs,ev);const objectivePenalty=s.estimatedMinutes>input.recoveryObjectiveMinutes?50:0;const score=100-s.dataLossRisk-s.serviceRisk-objectivePenalty+(s.reversible?10:0)+(depsOk&&evidenceOk?20:-100);return{strategyId:s.id,score,depsOk,evidenceOk,withinObjective:s.estimatedMinutes<=input.recoveryObjectiveMinutes}}).sort((a,b)=>b.score-a.score);
}
export function scoreRecoveryStrategies(input:Recovery){return{scores:recoveryScores(input),selectedStrategyId:recoveryScores(input)[0]?.strategyId??null};}
export function buildRecoveryDecisionTree(input:Recovery){return{branches:input.strategies.map(s=>({strategyId:s.id,if:`dependencies=${s.dependencies.join(',')||'none'}; objective<=${input.recoveryObjectiveMinutes}m`,fallback:s.reversible?'RETRY_OR_ROLLBACK':'STOP_AND_ESCALATE'}))};}
export function evaluateRecoveryStrategyReadiness(input:Recovery){const scored=recoveryScores(input);const ready=scored.filter(s=>s.depsOk&&s.evidenceOk&&s.withinObjective);return{status:ready.length?'READY':'BLOCKED',readyStrategies:ready.map(s=>s.strategyId),blockedStrategies:scored.filter(s=>!ready.includes(s)).map(s=>s.strategyId)};}
export function compareRecoveryStrategies(input:Recovery){const selected=scoreRecoveryStrategies(input).selectedStrategyId;return{previous:input.previousStrategyId??null,current:selected,changed:Boolean(input.previousStrategyId&&input.previousStrategyId!==selected),readiness:evaluateRecoveryStrategyReadiness(input)};}

// 6) Verification Economics
export function optimizeVerificationSpend(input:Verification){
  const mandatory=input.checks.filter(c=>c.mandatory), optional=input.checks.filter(c=>!c.mandatory).sort((a,b)=>(b.riskReduction/Math.max(b.cost,0.0001))-(a.riskReduction/Math.max(a.cost,0.0001)));
  const selected=[...mandatory];let spent=mandatory.reduce((s,c)=>s+c.cost,0);for(const c of optional)if(spent+c.cost<=input.budget){selected.push(c);spent+=c.cost}
  return{selectedIds:selected.map(c=>c.id),spent,totalRiskReduction:selected.reduce((s,c)=>s+c.riskReduction,0),overBudget:spent>input.budget};
}
export function detectVerificationUnderinvestment(input:Verification){const opt=optimizeVerificationSpend(input);return{missingCritical:input.checks.filter(c=>c.criticalPath&&!opt.selectedIds.includes(c.id)).map(c=>c.id),mandatoryOverBudget:input.checks.filter(c=>c.mandatory).reduce((s,c)=>s+c.cost,0)>input.budget};}
export function evaluateVerificationValue(input:Verification){return{checks:input.checks.map(c=>({id:c.id,valuePerCost:c.cost?c.riskReduction/c.cost:Number.POSITIVE_INFINITY,mandatory:c.mandatory,criticalPath:c.criticalPath})).sort((a,b)=>b.valuePerCost-a.valuePerCost),portfolio:optimizeVerificationSpend(input)};}
export function compareVerificationEconomics(input:Verification){const current=optimizeVerificationSpend(input).selectedIds;return{added:current.filter(id=>!input.previousSelectedIds.includes(id)),removed:input.previousSelectedIds.filter(id=>!current.includes(id)),current};}

// 7) Multi-project Coordination
function projectOrder(input:Program){
  const done=new Set<string>(),order:string[]=[];for(let i=0;i<input.projects.length+1;i++)for(const p of [...input.projects].sort((a,b)=>b.priority-a.priority))if(!done.has(p.id)&&p.dependsOn.every(d=>done.has(d))){done.add(p.id);order.push(p.id)}return{order,blocked:input.projects.filter(p=>!done.has(p.id)).map(p=>p.id)};
}
export function buildProgramDependencyNetwork(input:Program){return{nodes:input.projects.map(p=>p.id),edges:input.projects.flatMap(p=>p.dependsOn.map(d=>({from:d,to:p.id}))),...projectOrder(input)};}
export function detectProgramCollisions(input:Program){const windows=new Map<string,string[]>();for(const p of input.projects)if(p.window){const arr=windows.get(p.window)??[];arr.push(p.id);windows.set(p.window,arr)}return{windowCollisions:[...windows].filter(([,ids])=>ids.length>1).map(([window,projects])=>({window,projects})),dependencyDeadlocks:projectOrder(input).blocked};}
export function allocateSharedProgramCapacity(input:Program){
  const allocations:Record<string,string[]>={};for(const [cap,capacity] of Object.entries(input.sharedCapacity)){allocations[cap]=input.projects.filter(p=>p.requiredCapabilities.includes(cap)).sort((a,b)=>b.priority-a.priority).slice(0,capacity).map(p=>p.id)}return{allocations,unallocated:input.projects.filter(p=>p.requiredCapabilities.some(c=>!(allocations[c]??[]).includes(p.id))).map(p=>p.id)};
}
export function compareProgramCoordination(input:Program){const current=projectOrder(input).order;return{current,previous:input.previousOrder,moved:current.map((id,i)=>({id,delta:input.previousOrder.includes(id)?input.previousOrder.indexOf(id)-i:null})),collisions:detectProgramCollisions(input)};}

// 8) Operator Decision Cockpit
function actionReadiness(input:Cockpit){
  const ev=verified(input.evidence);return input.actions.map(a=>{const evidenceOk=refsVerified(a.evidenceRefs,ev);const ready=!a.blockers.length&&evidenceOk&&(!a.requiresApproval||a.approved);return{...a,evidenceOk,ready}});
}
export function buildOperatorDecisionCockpit(input:Cockpit){const actions=actionReadiness(input);return{cockpitId:input.cockpitId,ready:actions.filter(a=>a.ready).map(a=>a.id),blocked:actions.filter(a=>!a.ready).map(a=>a.id),actions};}
export function evaluateOperatorActionReadiness(input:Cockpit){const actions=actionReadiness(input);return{status:actions.some(a=>a.ready)?'READY':'BLOCKED',actions:actions.map(a=>({id:a.id,ready:a.ready,blockers:[...a.blockers,...(!a.evidenceOk?['evidence']:[]),...(a.requiresApproval&&!a.approved?['approval']:[])]}))};}
export function selectNextSafeOperatorAction(input:Cockpit){const ready=actionReadiness(input).filter(a=>a.ready).sort((a,b)=>severityRank[b.severity]-severityRank[a.severity]||a.impact-b.impact||Number(b.reversible)-Number(a.reversible));return{selectedActionId:ready[0]?.id??null,candidates:ready.map(a=>a.id),rule:'Selection is advisory and does not execute host actions.'};}
export function compareOperatorCockpits(input:Cockpit){const current=selectNextSafeOperatorAction(input).selectedActionId;return{previous:input.previousSelectedActionId??null,current,changed:Boolean(input.previousSelectedActionId&&input.previousSelectedActionId!==current),readiness:evaluateOperatorActionReadiness(input)};}
