import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  v77RuntimeSchema,
  routeCompoundIntentV77,
  buildExecutionContractV77,
  scoreRouteConfidenceV77,
  buildMultiSkillExecutionGraphV77,
  explainRoutingDecisionV77,
  type V76CapabilityCandidate
} from './v77-native-skill-runtime';
import { buildSkillExecutionPacketV77 } from './v77-directive-enforcement';

export const v77MissionPlannerSchema = v77RuntimeSchema.extend({
  evidenceReady:z.boolean().default(false),
  minimumConfidence:z.number().min(0).max(1).default(0.45)
});

export function buildNativeMissionPlanV77(
  input:z.infer<typeof v77MissionPlannerSchema>,
  capabilityCandidates:V76CapabilityCandidate[]
){
  const runtimeInput={
    query:input.query,
    maxSkills:input.maxSkills,
    maxCapabilities:input.maxCapabilities,
    relativeSkillThreshold:input.relativeSkillThreshold,
    hostAuthorized:input.hostAuthorized,
    approvalRequired:input.approvalRequired,
    approved:input.approved,
    schemaValidated:input.schemaValidated
  };

  const route=routeCompoundIntentV77(runtimeInput,capabilityCandidates);
  const contract=buildExecutionContractV77(runtimeInput,capabilityCandidates);
  const confidence=scoreRouteConfidenceV77(runtimeInput,capabilityCandidates);
  const graph=buildMultiSkillExecutionGraphV77(runtimeInput,capabilityCandidates);
  const explanation=explainRoutingDecisionV77(runtimeInput,capabilityCandidates);
  const packet=buildSkillExecutionPacketV77({
    query:input.query,
    skillNames:route.selectedSkills.map(x=>x.name),
    hostAuthorized:input.hostAuthorized,
    approvalRequired:input.approvalRequired,
    approved:input.approved,
    schemaValidated:input.schemaValidated,
    evidenceReady:input.evidenceReady
  });

  const gates=[
    {id:'G1',name:'ROUTE_READY',satisfied:route.status==='READY'},
    {id:'G2',name:'CONTRACT_READY',satisfied:contract.status==='READY'},
    {id:'G3',name:'POLICY_READY',satisfied:packet.status==='READY'},
    {id:'G4',name:'SCHEMA_VALIDATED',satisfied:input.schemaValidated},
    {id:'G5',name:'EVIDENCE_READY',satisfied:input.evidenceReady || !route.action.mutation},
    {id:'G6',name:'CONFIDENCE_THRESHOLD',satisfied:confidence.score>=input.minimumConfidence},
    {id:'G7',name:'NO_DIRECTIVE_CONFLICTS',satisfied:route.conflicts.length===0}
  ];

  const failedGates=gates.filter(x=>!x.satisfied);
  const status=failedGates.length===0 && graph.dispatchAllowed && packet.dispatchAllowed
    ? 'READY'
    : 'BLOCKED';

  const canonical={
    release:'v77',
    query:input.query,
    status,
    agent:route.selectedAgent.agentId,
    skills:route.selectedSkills.map(x=>x.name),
    capabilities:route.selectedCapabilities.map(x=>x.name),
    routeStatus:route.status,
    contractStatus:contract.status,
    policyStatus:packet.status,
    confidence:confidence.score,
    graphDigest:graph.graphDigest,
    contractDigest:contract.contractDigest,
    packetDigest:packet.packetDigest,
    failedGates:failedGates.map(x=>x.id)
  };
  const missionDigest=createHash('sha256').update(JSON.stringify(canonical)).digest('hex');

  return {
    ...canonical,
    missionDigest,
    selectedAgent:route.selectedAgent,
    selectedSkills:route.selectedSkills,
    selectedCapabilities:route.selectedCapabilities,
    route,
    contract,
    policyPacket:packet,
    confidence,
    executionGraph:graph,
    explanation,
    gates,
    failedGates,
    dispatchAllowed:status==='READY',
    executionClaim:false
  } as const;
}

export function auditNativeMissionPlannerV77(capabilityCandidates:V76CapabilityCandidate[]){
  const ready=buildNativeMissionPlanV77({
    query:'audit database schema and rls',
    maxSkills:4,
    maxCapabilities:8,
    relativeSkillThreshold:0.55,
    hostAuthorized:false,
    approvalRequired:false,
    approved:false,
    schemaValidated:true,
    evidenceReady:true,
    minimumConfidence:0
  },capabilityCandidates);

  const blocked=buildNativeMissionPlanV77({
    query:'deploy production release',
    maxSkills:4,
    maxCapabilities:8,
    relativeSkillThreshold:0.55,
    hostAuthorized:false,
    approvalRequired:false,
    approved:false,
    schemaValidated:true,
    evidenceReady:true,
    minimumConfidence:0
  },capabilityCandidates);

  const schemaBlocked=buildNativeMissionPlanV77({
    query:'audit database schema and rls',
    maxSkills:4,
    maxCapabilities:8,
    relativeSkillThreshold:0.55,
    hostAuthorized:false,
    approvalRequired:false,
    approved:false,
    schemaValidated:false,
    evidenceReady:true,
    minimumConfidence:0
  },capabilityCandidates);

  const checks={
    readOnlyReady:ready.status==='READY' && ready.dispatchAllowed,
    mutationBlocked:blocked.status==='BLOCKED' && !blocked.dispatchAllowed,
    schemaBlocked:schemaBlocked.status==='BLOCKED' && schemaBlocked.failedGates.some(x=>x.id==='G4'),
    deterministicDigest:/^[a-f0-9]{64}$/.test(ready.missionDigest),
    provenanceBound:/^[a-f0-9]{64}$/.test(ready.packetDigest),
    graphBound:/^[a-f0-9]{64}$/.test(ready.graphDigest),
    noExecutionClaim:ready.executionClaim===false && blocked.executionClaim===false
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
