import type { z } from 'zod';
import {
  engineeringMissionSchema, createMissionSchema, missionContextPackSchema, executionManifestSchema,
  hostResultSchema, blockerArbitrationSchema, crossEngineGateSchema, deliveryManifestSchema,
  postDeployWatchSchema, compareMissionsSchema
} from './control-plane-schema';

type Mission = z.infer<typeof engineeringMissionSchema>;
type CreateMission = z.infer<typeof createMissionSchema>;
type ContextPack = z.infer<typeof missionContextPackSchema>;
type ExecutionManifest = z.infer<typeof executionManifestSchema>;
type HostResult = z.infer<typeof hostResultSchema>;
type BlockerArbitration = z.infer<typeof blockerArbitrationSchema>;
type CrossEngineGate = z.infer<typeof crossEngineGateSchema>;
type DeliveryManifest = z.infer<typeof deliveryManifestSchema>;
type PostDeployWatch = z.infer<typeof postDeployWatchSchema>;
type CompareMissions = z.infer<typeof compareMissionsSchema>;

const uniq = <T>(items:T[]) => [...new Set(items)];

export function createEngineeringMission(input: CreateMission) {
  const missingCapabilities = input.requiredCapabilities.filter(c => !input.availableCapabilities.includes(c));
  const blockers = missingCapabilities.map(c => `Required host capability unavailable: ${c}`);
  const mission: Mission = {
    ...input,
    currentStage: 'INTAKE',
    status: blockers.length ? 'BLOCKED' : 'READY',
    gates: [], actions: [], blockers, risks: [], decisions: [], evidenceRefs: [], artifacts: [], deploymentRefs: [], runtimeRefs: []
  };
  return { mission, missingCapabilities, rule: 'Host capability absence is an explicit blocker; KROM never simulates unavailable execution.' };
}

export function buildMissionContextPack(input: ContextPack) {
  const unresolved = uniq(input.unresolvedQuestions);
  const completeness = {
    projectFacts: input.projectFacts.length > 0,
    architectureFacts: input.architectureFacts.length > 0,
    acceptanceCriteria: input.mission.acceptanceCriteria.length > 0,
    evidenceRequirements: input.mission.evidenceRequirements.length > 0,
    unresolvedQuestions: unresolved.length
  };
  const ready = completeness.projectFacts && completeness.acceptanceCriteria && unresolved.length === 0;
  return { ...input, completeness, contextStatus: ready ? 'READY' : 'READY_WITH_GAPS', rule: 'Unknown context remains explicit; absence of evidence is not converted into a fact.' };
}

export function compileMissionExecutionManifest(input: ExecutionManifest) {
  const ids = input.actions.map(a=>a.id);
  const duplicateIds = ids.filter((id,i)=>ids.indexOf(id)!==i);
  const danglingDependencies = input.actions.flatMap(a=>a.dependsOn.filter(d=>!ids.includes(d)).map(d=>`${a.id}->${d}`));
  const unsafeMutations = input.actions.filter(a=>a.mutatesExternalState && !a.requiresApproval).map(a=>a.id);
  const missingEvidenceContracts = input.actions.filter(a=>a.requiredEvidence.length===0).map(a=>a.id);
  const blockers = [
    ...duplicateIds.map(id=>`Duplicate action id: ${id}`),
    ...danglingDependencies.map(x=>`Dangling dependency: ${x}`),
    ...unsafeMutations.map(id=>`External mutation lacks approval contract: ${id}`)
  ];
  if (input.rollbackRequired && input.rollbackEvidenceRequired.length===0) blockers.push('Rollback is required but rollback evidence requirements are empty.');
  return { ...input, blockers: uniq(blockers), warnings: missingEvidenceContracts.map(id=>`Action ${id} has no evidence contract.`), status: blockers.length?'BLOCKED':'READY' };
}

export function evaluateMissionGate(input: CrossEngineGate) {
  const required = input.gates.filter(g=>g.required && g.status!=='NOT_APPLICABLE');
  const failures = required.filter(g=>g.status==='FAIL');
  const unknown = required.filter(g=>g.status==='UNKNOWN');
  const evidenceGaps = required.filter(g=>(g.status==='PASS'||g.status==='PASS_WITH_GAPS') && g.evidenceRefs.length===0);
  const blockers = uniq([...failures.flatMap(g=>[g.name,...g.blockers]), ...unknown.map(g=>`${g.name}: UNKNOWN`), ...evidenceGaps.map(g=>`${g.name}: pass-like status without evidence`)]);
  const status = failures.length || (input.requireAllMandatoryPass && (unknown.length||evidenceGaps.length)) ? 'FAIL' : required.some(g=>g.status==='PASS_WITH_GAPS') ? 'PASS_WITH_GAPS' : 'PASS';
  return { status, blockers, requiredGateCount: required.length, passedGateCount: required.filter(g=>g.status==='PASS'&&g.evidenceRefs.length>0).length, rule:'Mandatory pass claims require linked evidence.' };
}

export function selectMissionNextAction(mission: Mission) {
  const done = new Set(mission.actions.filter(a=>a.status==='PASS'||a.status==='SKIPPED').map(a=>a.id));
  const candidates = mission.actions.filter(a=>['PENDING','READY'].includes(a.status) && a.dependsOn.every(d=>done.has(d)));
  const next = candidates[0] ?? null;
  return { missionId: mission.missionId, currentStage: mission.currentStage, nextAction: next, blocked: mission.blockers.length>0, blockers: mission.blockers };
}

export function recordMissionHostResult(input: HostResult) {
  const found = input.mission.actions.find(a=>a.id===input.actionId);
  if (!found) return { mission: input.mission, accepted:false, blocker:`Unknown actionId: ${input.actionId}` };
  const evidenceRequired = found.requiredEvidence.length>0;
  const effectiveStatus = input.status==='PASS' && evidenceRequired && input.evidenceRefs.length===0 ? 'BLOCKED' : input.status;
  const actions = input.mission.actions.map(a=>a.id===input.actionId?{...a,status: effectiveStatus==='PASS'?'PASS':effectiveStatus==='FAIL'?'FAIL':'BLOCKED' as const}:a);
  const blocker = effectiveStatus==='BLOCKED' ? (input.blocker ?? `${input.actionId} lacks required evidence or host execution was blocked.`) : undefined;
  const mission = {...input.mission, actions, evidenceRefs:uniq([...input.mission.evidenceRefs,...input.evidenceRefs]), blockers:blocker?uniq([...input.mission.blockers,blocker]):input.mission.blockers};
  return { mission, accepted:true, effectiveStatus, rule:'Host PASS without required evidence is not accepted as successful execution.' };
}

export function resumeEngineeringMission(mission: Mission) {
  const failed = mission.actions.filter(a=>a.status==='FAIL');
  const blocked = mission.actions.filter(a=>a.status==='BLOCKED');
  const pending = mission.actions.filter(a=>a.status==='PENDING'||a.status==='READY');
  const complete = mission.actions.length>0 && mission.actions.every(a=>a.status==='PASS'||a.status==='SKIPPED');
  return { ...selectMissionNextAction(mission), summary:{complete,failed:failed.map(a=>a.id),blocked:blocked.map(a=>a.id),pending:pending.map(a=>a.id)}, recommendedState: complete?'COMPLETE':failed.length?'FAILED':blocked.length||mission.blockers.length?'BLOCKED':'IN_PROGRESS' };
}

export function arbitrateMissionBlockers(input: BlockerArbitration) {
  const ranked = [...input.blockers].sort((a,b)=>({CRITICAL:4,HIGH:3,MEDIUM:2,LOW:1}[b.severity]-{CRITICAL:4,HIGH:3,MEDIUM:2,LOW:1}[a.severity]));
  const hardStops = ranked.filter(b=>b.severity==='CRITICAL'||(!b.reversible&&b.severity==='HIGH'));
  return { ranked, hardStops, canProceed: hardStops.length===0, nextBlocker: ranked[0]??null, rule:'Critical blockers and high-severity irreversible blockers stop mission progression.' };
}

export function buildCrossEngineGate(input: CrossEngineGate) {
  const evaluation = evaluateMissionGate(input);
  const byCategory = Object.fromEntries([...new Set(input.gates.map(g=>g.category))].map(c=>[c,input.gates.filter(g=>g.category===c)]));
  return { evaluation, byCategory, missionId:input.mission.missionId };
}

export function createDeliveryManifest(input: DeliveryManifest) {
  const failingTests = input.tests.filter(t=>t.status==='FAIL').map(t=>t.name);
  const unprovenPasses = input.tests.filter(t=>t.status==='PASS'&&t.evidenceRefs.length===0).map(t=>t.name);
  const blockers = [...failingTests.map(t=>`Failing test: ${t}`), ...unprovenPasses.map(t=>`Passing test lacks evidence: ${t}`)];
  if (input.mission.currentStage==='RELEASE' && !input.deploymentRef) blockers.push('Release-stage delivery manifest has no deployment reference.');
  return { ...input, blockers, status:blockers.length?'BLOCKED':input.knownGaps.length?'READY_WITH_GAPS':'READY' };
}

export function verifyDeliveryClosure(input: DeliveryManifest) {
  const manifest = createDeliveryManifest(input);
  const missionHasBlockers = input.mission.blockers.length>0;
  const releaseEvidence = input.releaseEvidenceRefs.length>0;
  const runtimeEvidence = input.deploymentRef ? input.runtimeEvidenceRefs.length>0 : true;
  const closed = manifest.status==='READY' && !missionHasBlockers && releaseEvidence && runtimeEvidence;
  return { closed, status:closed?'DELIVERY_VERIFIED':'DELIVERY_UNVERIFIED', blockers:uniq([...(manifest.blockers??[]),...input.mission.blockers, ...(!releaseEvidence?['Missing release evidence']:[]), ...(!runtimeEvidence?['Deployment exists but runtime evidence is missing']:[])]), rule:'Code completion is not delivery closure; release and runtime evidence are required when applicable.' };
}

export function buildPostDeployWatchPlan(input: PostDeployWatch) {
  const checks = input.checks.length ? input.checks : [
    {name:'service-health',requiredEvidence:['HTTP/health or equivalent'],blocking:true},
    {name:'runtime-errors',requiredEvidence:['runtime error scan'],blocking:true},
    {name:'regression-smoke',requiredEvidence:['smoke/regression evidence'],blocking:true}
  ];
  return { ...input, checks, requiredBlockingChecks:checks.filter(c=>c.blocking).map(c=>c.name), status:'READY', rule:'Production deploy is followed by evidence-backed observation, not assumed healthy.' };
}

export function generateOperatorBrief(mission: Mission) {
  const next = selectMissionNextAction(mission);
  return { missionId:mission.missionId, objective:mission.objective, state:mission.status, stage:mission.currentStage, blockers:mission.blockers, risks:mission.risks, nextAction:next.nextAction, evidenceCount:mission.evidenceRefs.length, artifactCount:mission.artifacts.length, deploymentRefs:mission.deploymentRefs };
}

export function auditControlPlane(mission: Mission) {
  const actionIds = mission.actions.map(a=>a.id);
  const duplicates = actionIds.filter((id,i)=>actionIds.indexOf(id)!==i);
  const dangling = mission.actions.flatMap(a=>a.dependsOn.filter(d=>!actionIds.includes(d)).map(d=>`${a.id}->${d}`));
  const unsupportedPasses = mission.gates.filter(g=>g.status==='PASS'&&g.required&&g.evidenceRefs.length===0).map(g=>g.name);
  return { healthy:duplicates.length===0&&dangling.length===0&&unsupportedPasses.length===0, duplicates:uniq(duplicates), danglingDependencies:uniq(dangling), unsupportedGatePasses:unsupportedPasses, blockers:mission.blockers };
}

export function compareMissions(input: CompareMissions) {
  return {
    sameProject: input.before.projectId===input.after.projectId,
    stage: {before:input.before.currentStage,after:input.after.currentStage},
    status: {before:input.before.status,after:input.after.status},
    blockerDelta: input.after.blockers.length-input.before.blockers.length,
    evidenceDelta: input.after.evidenceRefs.length-input.before.evidenceRefs.length,
    artifactDelta: input.after.artifacts.length-input.before.artifacts.length,
    deploymentDelta: input.after.deploymentRefs.length-input.before.deploymentRefs.length
  };
}
