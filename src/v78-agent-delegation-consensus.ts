import { createHash } from 'node:crypto';
import { z } from 'zod';

export const v78AgentIdSchema=z.enum([
  'orchestrator','architect','researcher','backend','frontend','uiux',
  'database','security','qa','devops','release-auditor'
]);

const agentCandidateSchema=z.object({
  agent:v78AgentIdSchema,
  capabilityScore:z.number().min(0).max(1),
  evidenceScore:z.number().min(0).max(1).default(0.5),
  load:z.number().min(0).max(1).default(0),
  conflict:z.boolean().default(false),
  authorized:z.boolean().default(true)
});

export const v78DelegationSchema=z.object({
  objective:z.string().min(3),
  requiredDomains:z.array(z.string().min(1)).default([]),
  candidates:z.array(agentCandidateSchema).min(1).max(11),
  currentOwner:v78AgentIdSchema.optional(),
  leaseActive:z.boolean().default(false),
  requireIndependentValidator:z.boolean().default(false),
  minimumScore:z.number().min(0).max(1).default(0.6)
});

const voteSchema=z.object({
  agent:v78AgentIdSchema,
  decision:z.enum(['APPROVE','REJECT','ABSTAIN']),
  confidence:z.number().min(0).max(1),
  evidenceRefs:z.array(z.string().min(1)).default([]),
  independent:z.boolean().default(true)
});

export const v78ConsensusSchema=z.object({
  objective:z.string().min(3),
  votes:z.array(voteSchema).min(1).max(11),
  quorum:z.number().int().min(1).max(11).default(3),
  approvalRatio:z.number().min(0.5).max(1).default(0.67),
  requireIndependentValidator:z.boolean().default(true),
  vetoAgents:z.array(v78AgentIdSchema).default(['security','release-auditor']),
  deadlockRounds:z.number().int().min(0).max(20).default(0),
  maxDeadlockRounds:z.number().int().min(1).max(20).default(3)
});

export type V78DelegationInput=z.infer<typeof v78DelegationSchema>;
export type V78ConsensusInput=z.infer<typeof v78ConsensusSchema>;

function hash(value:unknown){
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function uniq<T>(values:T[]){
  return [...new Set(values)];
}

export function buildDynamicDelegationV78(input:V78DelegationInput){
  const parsed=v78DelegationSchema.parse(input);
  const ranked=parsed.candidates.map(c=>{
    const ownershipPenalty=parsed.leaseActive&&parsed.currentOwner&&parsed.currentOwner!==c.agent ? 0.15 : 0;
    const conflictPenalty=c.conflict ? 0.4 : 0;
    const authPenalty=c.authorized ? 0 : 1;
    const score=Math.max(0,Math.min(1,
      c.capabilityScore*0.5 +
      c.evidenceScore*0.3 +
      (1-c.load)*0.2 -
      ownershipPenalty -
      conflictPenalty -
      authPenalty
    ));
    return {...c,score:Number(score.toFixed(4))};
  }).sort((a,b)=>b.score-a.score||a.agent.localeCompare(b.agent));

  const eligible=ranked.filter(x=>x.authorized&&!x.conflict&&x.score>=parsed.minimumScore);
  const primary=eligible[0]??null;
  const validator=parsed.requireIndependentValidator
    ? eligible.find(x=>x.agent!==primary?.agent&&['qa','security','release-auditor'].includes(x.agent))??null
    : null;

  const blockers:string[]=[];
  if(!primary) blockers.push('NO_ELIGIBLE_PRIMARY_AGENT');
  if(parsed.requireIndependentValidator&&!validator) blockers.push('INDEPENDENT_VALIDATOR_REQUIRED');
  if(parsed.leaseActive&&parsed.currentOwner&&primary&&primary.agent!==parsed.currentOwner){
    blockers.push('ACTIVE_LEASE_OWNERSHIP_CHANGE_BLOCKED');
  }

  const canonical={
    release:'v78',
    objective:parsed.objective,
    requiredDomains:[...parsed.requiredDomains].sort(),
    primaryAgent:primary?.agent??null,
    validatorAgent:validator?.agent??null,
    rankedAgents:ranked.map(x=>({agent:x.agent,score:x.score})),
    currentOwner:parsed.currentOwner??null,
    leaseActive:parsed.leaseActive,
    blockers:[...blockers].sort()
  };

  return {
    ...canonical,
    status:blockers.length?'BLOCKED':'READY',
    delegationDigest:hash(canonical),
    executionClaim:false
  } as const;
}

export function evaluateMultiAgentConsensusV78(input:V78ConsensusInput){
  const parsed=v78ConsensusSchema.parse(input);
  const uniqueVotes=new Map<string,typeof parsed.votes[number]>();
  for(const vote of parsed.votes){
    const prior=uniqueVotes.get(vote.agent);
    if(!prior || vote.confidence>prior.confidence) uniqueVotes.set(vote.agent,vote);
  }
  const votes=[...uniqueVotes.values()].sort((a,b)=>a.agent.localeCompare(b.agent));
  const participating=votes.filter(v=>v.decision!=='ABSTAIN');
  const approvals=participating.filter(v=>v.decision==='APPROVE');
  const rejects=participating.filter(v=>v.decision==='REJECT');
  const evidenceBacked=votes.filter(v=>v.evidenceRefs.length>0);
  const validatorPresent=votes.some(v=>v.independent&&['qa','security','release-auditor'].includes(v.agent));
  const vetoReject=votes.find(v=>parsed.vetoAgents.includes(v.agent)&&v.decision==='REJECT');
  const quorumMet=participating.length>=parsed.quorum;
  const ratio=participating.length?approvals.length/participating.length:0;
  const approvalRatioMet=ratio>=parsed.approvalRatio;
  const deadlocked=parsed.deadlockRounds>=parsed.maxDeadlockRounds ||
    (approvals.length>0&&rejects.length>0&&!approvalRatioMet&&participating.length>=parsed.quorum);

  const blockers:string[]=[];
  if(!quorumMet) blockers.push('QUORUM_NOT_MET');
  if(!approvalRatioMet) blockers.push('APPROVAL_RATIO_NOT_MET');
  if(parsed.requireIndependentValidator&&!validatorPresent) blockers.push('INDEPENDENT_VALIDATOR_MISSING');
  if(vetoReject) blockers.push(`VETO_REJECTED_BY_${vetoReject.agent.toUpperCase()}`);
  if(deadlocked) blockers.push('CONSENSUS_DEADLOCK');
  if(evidenceBacked.length<Math.min(parsed.quorum,votes.length)) blockers.push('INSUFFICIENT_EVIDENCE_BACKED_VOTES');

  const canonical={
    release:'v78',
    objective:parsed.objective,
    quorum:parsed.quorum,
    approvalRatio:parsed.approvalRatio,
    participating:participating.length,
    approvals:approvals.length,
    rejects:rejects.length,
    ratio:Number(ratio.toFixed(4)),
    validatorPresent,
    vetoReject:vetoReject?.agent??null,
    deadlocked,
    blockers:[...blockers].sort(),
    votes:votes.map(v=>({
      agent:v.agent,
      decision:v.decision,
      confidence:v.confidence,
      evidenceCount:v.evidenceRefs.length,
      independent:v.independent
    }))
  };

  return {
    ...canonical,
    status:blockers.length?'BLOCKED':'CONSENSUS',
    consensusDigest:hash(canonical),
    dispatchAllowed:blockers.length===0,
    executionClaim:false
  } as const;
}

export function buildConsensusRecoveryV78(input:V78ConsensusInput){
  const result=evaluateMultiAgentConsensusV78(input);
  const actions:string[]=[];
  if(result.blockers.includes('QUORUM_NOT_MET')) actions.push('ADD_INDEPENDENT_PARTICIPANTS');
  if(result.blockers.includes('INDEPENDENT_VALIDATOR_MISSING')) actions.push('ASSIGN_QA_SECURITY_OR_RELEASE_VALIDATOR');
  if(result.blockers.some(x=>x.startsWith('VETO_REJECTED_BY_'))) actions.push('RESOLVE_VETO_EVIDENCE_BEFORE_RETRY');
  if(result.blockers.includes('CONSENSUS_DEADLOCK')) actions.push('ESCALATE_TO_ORCHESTRATOR_AND_REFRESH_EVIDENCE');
  if(result.blockers.includes('APPROVAL_RATIO_NOT_MET')) actions.push('COLLECT_DISCONFIRMING_EVIDENCE_AND_REVOTE');
  if(result.blockers.includes('INSUFFICIENT_EVIDENCE_BACKED_VOTES')) actions.push('REQUIRE_EVIDENCE_FOR_QUORUM_VOTES');
  if(!actions.length) actions.push('PROCEED_WITH_GOVERNED_NEXT_STEP');

  const canonical={
    release:'v78',
    consensusDigest:result.consensusDigest,
    status:result.status,
    actions:uniq(actions)
  };
  return {
    ...canonical,
    recoveryDigest:hash(canonical),
    executionClaim:false
  } as const;
}

export function auditAgentDelegationConsensusV78(){
  const delegation=buildDynamicDelegationV78({
    objective:'Implement secure API change',
    requiredDomains:['backend','security','qa'],
    candidates:[
      {agent:'backend',capabilityScore:0.95,evidenceScore:0.9,load:0.2,authorized:true,conflict:false},
      {agent:'security',capabilityScore:0.82,evidenceScore:0.95,load:0.1,authorized:true,conflict:false},
      {agent:'qa',capabilityScore:0.78,evidenceScore:0.9,load:0.1,authorized:true,conflict:false}
    ],
    leaseActive:false,
    requireIndependentValidator:true,
    minimumScore:0.6
  });

  const consensus=evaluateMultiAgentConsensusV78({
    objective:'Approve secure API change',
    votes:[
      {agent:'backend',decision:'APPROVE',confidence:0.9,evidenceRefs:['test:backend'],independent:false},
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

  const veto=evaluateMultiAgentConsensusV78({
    objective:'Unsafe production mutation',
    votes:[
      {agent:'backend',decision:'APPROVE',confidence:0.9,evidenceRefs:['dev:test'],independent:false},
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

  const deadlock=evaluateMultiAgentConsensusV78({
    objective:'Conflicting architecture decision',
    votes:[
      {agent:'architect',decision:'APPROVE',confidence:0.8,evidenceRefs:['arch:a'],independent:true},
      {agent:'backend',decision:'REJECT',confidence:0.8,evidenceRefs:['backend:b'],independent:true},
      {agent:'qa',decision:'ABSTAIN',confidence:0.5,evidenceRefs:['qa:c'],independent:true}
    ],
    quorum:2,
    approvalRatio:0.67,
    requireIndependentValidator:true,
    vetoAgents:['security','release-auditor'],
    deadlockRounds:3,
    maxDeadlockRounds:3
  });

  const checks={
    delegationReady:delegation.status==='READY'&&Boolean(delegation.primaryAgent)&&Boolean(delegation.validatorAgent),
    consensusPasses:consensus.status==='CONSENSUS'&&consensus.dispatchAllowed,
    vetoBlocks:veto.status==='BLOCKED'&&!veto.dispatchAllowed&&veto.blockers.includes('VETO_REJECTED_BY_SECURITY'),
    deadlockBlocks:deadlock.status==='BLOCKED'&&deadlock.deadlocked,
    deterministicDigests:/^[a-f0-9]{64}$/.test(delegation.delegationDigest)&&/^[a-f0-9]{64}$/.test(consensus.consensusDigest),
    noExecutionClaim:delegation.executionClaim===false&&consensus.executionClaim===false
  };
  const passed=Object.values(checks).filter(Boolean).length;

  return {
    release:'v78',
    status:passed===Object.keys(checks).length?'PASS':'FAIL',
    checks,
    passed,
    total:Object.keys(checks).length,
    executionClaim:false
  } as const;
}
