import { evaluateAutonomousExecutionV78, auditAutonomousExecutionV78 } from '../src/v78-autonomous-execution-governance';
import { buildDynamicDelegationV78, evaluateMultiAgentConsensusV78, buildConsensusRecoveryV78, auditAgentDelegationConsensusV78 } from '../src/v78-agent-delegation-consensus';

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
  dynamicAgentDelegation:true,
  multiAgentConsensus:true,
  vetoAndDeadlockHandling:true,
  executionClaim:false
},null,2));
