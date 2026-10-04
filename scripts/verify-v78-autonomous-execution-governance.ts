import { getSkillMetadataV76 } from '../src/v76-skill-index';
import { evaluateAutonomousExecutionV78, auditAutonomousExecutionV78 } from '../src/v78-autonomous-execution-governance';
import { buildDynamicDelegationV78, evaluateMultiAgentConsensusV78, buildConsensusRecoveryV78, auditAgentDelegationConsensusV78 } from '../src/v78-agent-delegation-consensus';
import { buildExecutionLineageV78, verifyExecutionLineageV78, buildOwnershipTransferV78, auditExecutionLineageV78 } from '../src/v78-execution-lineage';

const functionRepairSkill=getSkillMetadataV76('krom-function-audit-repair');
if(!functionRepairSkill) throw new Error('v78 missing krom-function-audit-repair');
if(!functionRepairSkill.domains.includes('debugging')) throw new Error('v78 function repair skill routing profile missing debugging domain');

const design3dSkill=getSkillMetadataV76('krom-3d-design-studio');
if(!design3dSkill) throw new Error('v78 missing krom-3d-design-studio');
if(!design3dSkill.domains.includes('3d')) throw new Error('v78 3D design skill routing profile missing 3d domain');

const lineageAudit=auditExecutionLineageV78();
if(lineageAudit.status!=='PASS') throw new Error(`v78 execution lineage audit failed: ${JSON.stringify(lineageAudit)}`);

const lineageBase={
  missionId:'mission-v78-verify',
  objective:'Verify execution lineage',
  stepId:'lineage-step-1',
  owner:'backend' as const,
  leaseId:'lease-v78-1',
  leaseEpoch:1,
  leaseActive:true,
  hostAuthorized:true,
  mutationRequested:true,
  evidence:[
    {id:'test:v78',digest:'a'.repeat(64),verified:true,source:'TEST' as const}
  ],
  consensusReceipt:{
    consensusDigest:'b'.repeat(64),
    decision:'CONSENSUS' as const,
    participants:['backend','qa','security'] as const,
    evidenceRefs:['test:v78'],
    issuedBy:'security' as const,
    independentValidator:'qa' as const
  },
  priorOwners:[]
};
const lineage=buildExecutionLineageV78(lineageBase);
if(lineage.status!=='READY'||!lineage.continuationAllowed) throw new Error('v78 lineage readiness failed');
const lineageVerify=verifyExecutionLineageV78({...lineageBase,claimedLineageDigest:lineage.lineageDigest});
if(lineageVerify.status!=='PASS'||!lineageVerify.digestMatches) throw new Error('v78 lineage digest verification failed');
const transfer=buildOwnershipTransferV78({
  current:lineageBase,
  nextOwner:'qa',
  nextLeaseId:'lease-v78-2',
  nextLeaseEpoch:2,
  hostAuthorized:true
});
if(transfer.status!=='READY') throw new Error('v78 lease-safe ownership transfer failed');

const delegationAudit=auditAgentDelegationConsensusV78();
if(delegationAudit.status!=='PASS') throw new Error(`v78 delegation/consensus audit failed: ${JSON.stringify(delegationAudit)}`);

const delegation=buildDynamicDelegationV78({
  objective:'Implement secure API change',
  requiredDomains:['backend','security','qa'],
  candidates:[
    {agent:'backend',capabilityScore:0.95,evidenceScore:0.9,load:0.2,authorized:true,conflict:false},
    {agent:'security',capabilityScore:0.82,evidenceScore:0.95,load:0.1,authorized:true,conflict:false},
    {agent:'qa',capabilityScore:0.78,evidenceScore:0.9,load:0.1,authorized:true,conflict:false}
  ],
  requireIndependentValidator:true,
  leaseActive:false,
  minimumScore:0.6
});
if(delegation.status!=='READY'||!delegation.primaryAgent||!delegation.validatorAgent) throw new Error('v78 delegation selection failed');

const consensus=evaluateMultiAgentConsensusV78({
  objective:'Approve secure API change',
  votes:[
    {agent:'backend',decision:'APPROVE',confidence:0.9,evidenceRefs:['backend:test'],independent:false},
    {agent:'security',decision:'APPROVE',confidence:0.9,evidenceRefs:['security:audit'],independent:true},
    {agent:'qa',decision:'APPROVE',confidence:0.85,evidenceRefs:['qa:regression'],independent:true}
  ],
  quorum:3,
  approvalRatio:0.67,
  requireIndependentValidator:true,
  vetoAgents:['security','release-auditor'],
  deadlockRounds:0,
  maxDeadlockRounds:3
});
if(consensus.status!=='CONSENSUS'||!consensus.dispatchAllowed) throw new Error('v78 consensus approval failed');

const blockedConsensus=evaluateMultiAgentConsensusV78({
  objective:'Unsafe production mutation',
  votes:[
    {agent:'backend',decision:'APPROVE',confidence:0.9,evidenceRefs:['backend:test'],independent:false},
    {agent:'security',decision:'REJECT',confidence:0.95,evidenceRefs:['security:blocker'],independent:true},
    {agent:'qa',decision:'APPROVE',confidence:0.8,evidenceRefs:['qa:test'],independent:true}
  ],
  quorum:3,
  approvalRatio:0.67,
  requireIndependentValidator:true,
  vetoAgents:['security','release-auditor'],
  deadlockRounds:0,
  maxDeadlockRounds:3
});
if(blockedConsensus.status!=='BLOCKED'||blockedConsensus.dispatchAllowed) throw new Error('v78 veto consensus gate failed');

const recovery=buildConsensusRecoveryV78({
  objective:'Conflicting architecture decision',
  votes:[
    {agent:'architect',decision:'APPROVE',confidence:0.8,evidenceRefs:['arch:a'],independent:true},
    {agent:'backend',decision:'REJECT',confidence:0.8,evidenceRefs:['backend:b'],independent:true}
  ],
  quorum:2,
  approvalRatio:0.67,
  requireIndependentValidator:false,
  vetoAgents:['security','release-auditor'],
  deadlockRounds:3,
  maxDeadlockRounds:3
});
if(!recovery.actions.includes('ESCALATE_TO_ORCHESTRATOR_AND_REFRESH_EVIDENCE')) throw new Error('v78 consensus deadlock recovery failed');

const audit=auditAutonomousExecutionV78();
if(audit.status!=='PASS') throw new Error(`v78 governance audit failed: ${JSON.stringify(audit)}`);

const blocked=evaluateAutonomousExecutionV78({
  objective:'deploy production without approval',
  autonomyMode:'BOUNDED_AUTONOMOUS',
  hostAuthorized:true,
  approvalRequired:true,
  approved:false,
  budgetUnits:20,
  estimatedCost:5,
  confidence:0.9,
  minimumConfidence:0.65,
  leaseOwner:'release-auditor',
  leaseActive:true,
  competingOwners:[],
  highRisk:true,
  rollbackAvailable:true
});
if(blocked.status!=='BLOCKED'||blocked.dispatchAllowed) throw new Error('v78 approval gate failed');

console.log(JSON.stringify({
  release:'v78',
  status:'PASS',
  autonomousExecutionGovernance:true,
  budgetAwareExecution:true,
  confidenceGate:true,
  executionLease:true,
  ownershipConflictDetection:true,
  rollbackGate:true,
  importedSkillCatalog:52,
  functionAuditRepairSkill:true,
  design3dStudioSkill:true,
  dynamicAgentDelegation:true,
  multiAgentConsensus:true,
  vetoAndDeadlockHandling:true,
  executionLineage:true,
  consensusReceipts:true,
  leaseSafeOwnershipTransfer:true,
  lineageTamperDetection:true,
  executionClaim:false
},null,2));
