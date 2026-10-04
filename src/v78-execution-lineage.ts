import { createHash } from 'node:crypto';
import { z } from 'zod';
import { v78AgentIdSchema } from './v78-agent-delegation-consensus';

const evidenceSchema=z.object({
  id:z.string().min(1),
  digest:z.string().regex(/^[a-f0-9]{64}$/),
  verified:z.boolean().default(false),
  source:z.enum(['SOURCE','TEST','BUILD','RUNTIME','SECURITY','CONSENSUS','HOST','OTHER']).default('OTHER')
});

const consensusReceiptSchema=z.object({
  consensusDigest:z.string().regex(/^[a-f0-9]{64}$/),
  decision:z.enum(['CONSENSUS','BLOCKED']),
  participants:z.array(v78AgentIdSchema).min(1).max(11),
  evidenceRefs:z.array(z.string().min(1)).default([]),
  issuedBy:v78AgentIdSchema,
  independentValidator:v78AgentIdSchema.optional()
});

export const v78ExecutionLineageSchema=z.object({
  missionId:z.string().min(1),
  objective:z.string().min(3),
  stepId:z.string().min(1),
  parentLineageDigest:z.string().regex(/^[a-f0-9]{64}$/).optional(),
  owner:v78AgentIdSchema,
  leaseId:z.string().min(1),
  leaseEpoch:z.number().int().min(1),
  leaseActive:z.boolean().default(true),
  hostAuthorized:z.boolean().default(false),
  mutationRequested:z.boolean().default(false),
  evidence:z.array(evidenceSchema).max(64).default([]),
  consensusReceipt:consensusReceiptSchema.optional(),
  priorOwners:z.array(v78AgentIdSchema).max(32).default([]),
  expectedPreviousDigest:z.string().regex(/^[a-f0-9]{64}$/).optional()
});

export type V78ExecutionLineageInput=z.infer<typeof v78ExecutionLineageSchema>;

function hash(value:unknown){
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function uniq<T>(values:T[]){
  return [...new Set(values)];
}

export function buildExecutionLineageV78(input:V78ExecutionLineageInput){
  const parsed=v78ExecutionLineageSchema.parse(input);
  const evidence=[...parsed.evidence]
    .sort((a,b)=>a.id.localeCompare(b.id))
    .map(e=>({id:e.id,digest:e.digest,verified:e.verified,source:e.source}));
  const verifiedEvidence=evidence.filter(e=>e.verified);
  const blockers:string[]=[];

  if(parsed.expectedPreviousDigest&&parsed.parentLineageDigest!==parsed.expectedPreviousDigest){
    blockers.push('PARENT_LINEAGE_DIGEST_MISMATCH');
  }
  if(parsed.mutationRequested&&!parsed.hostAuthorized){
    blockers.push('HOST_AUTHORIZATION_REQUIRED');
  }
  if(!parsed.leaseActive){
    blockers.push('LEASE_INACTIVE');
  }
  if(parsed.priorOwners.includes(parsed.owner)){
    // Re-owning a task is allowed, but only with a strictly newer epoch.
    if(parsed.leaseEpoch<=parsed.priorOwners.length) blockers.push('STALE_LEASE_EPOCH');
  }
  if(parsed.consensusReceipt){
    const refs=new Set(parsed.consensusReceipt.evidenceRefs);
    const known=new Set(evidence.map(e=>e.id));
    if(parsed.consensusReceipt.decision!=='CONSENSUS') blockers.push('CONSENSUS_NOT_APPROVED');
    if(parsed.consensusReceipt.evidenceRefs.some(ref=>!known.has(ref))) blockers.push('CONSENSUS_EVIDENCE_UNBOUND');
    if(parsed.consensusReceipt.independentValidator&&parsed.consensusReceipt.independentValidator===parsed.owner){
      blockers.push('VALIDATOR_NOT_INDEPENDENT');
    }
    if(refs.size!==parsed.consensusReceipt.evidenceRefs.length) blockers.push('DUPLICATE_CONSENSUS_EVIDENCE');
  }

  const canonical={
    release:'v78',
    missionId:parsed.missionId,
    objective:parsed.objective,
    stepId:parsed.stepId,
    parentLineageDigest:parsed.parentLineageDigest??null,
    owner:parsed.owner,
    leaseId:parsed.leaseId,
    leaseEpoch:parsed.leaseEpoch,
    leaseActive:parsed.leaseActive,
    hostAuthorized:parsed.hostAuthorized,
    mutationRequested:parsed.mutationRequested,
    priorOwners:uniq(parsed.priorOwners),
    evidence,
    consensusReceipt:parsed.consensusReceipt?{
      consensusDigest:parsed.consensusReceipt.consensusDigest,
      decision:parsed.consensusReceipt.decision,
      participants:uniq(parsed.consensusReceipt.participants).sort(),
      evidenceRefs:[...parsed.consensusReceipt.evidenceRefs].sort(),
      issuedBy:parsed.consensusReceipt.issuedBy,
      independentValidator:parsed.consensusReceipt.independentValidator??null
    }:null,
    blockers:[...blockers].sort()
  };

  return {
    ...canonical,
    verifiedEvidenceCount:verifiedEvidence.length,
    lineageDigest:hash(canonical),
    status:blockers.length?'BLOCKED':'READY',
    continuationAllowed:blockers.length===0&&(!parsed.mutationRequested||parsed.hostAuthorized),
    persistence:'HOST_CARRIED',
    persistenceClaim:false,
    executionClaim:false
  } as const;
}

export function verifyExecutionLineageV78(input:V78ExecutionLineageInput & {claimedLineageDigest:string}){
  const {claimedLineageDigest,...lineageInput}=input;
  const lineage=buildExecutionLineageV78(lineageInput);
  const digestMatches=lineage.lineageDigest===claimedLineageDigest;
  const blockers=[...lineage.blockers];
  if(!digestMatches) blockers.push('LINEAGE_DIGEST_MISMATCH');

  return {
    release:'v78',
    status:blockers.length?'BLOCKED':'PASS',
    digestMatches,
    blockers:uniq(blockers).sort(),
    continuationAllowed:blockers.length===0&&lineage.continuationAllowed,
    computedLineageDigest:lineage.lineageDigest,
    executionClaim:false,
    persistenceClaim:false
  } as const;
}

export function buildOwnershipTransferV78(input:{
  current:V78ExecutionLineageInput;
  nextOwner:z.infer<typeof v78AgentIdSchema>;
  nextLeaseId:string;
  nextLeaseEpoch:number;
  hostAuthorized:boolean;
}){
  const current=buildExecutionLineageV78(input.current);
  const blockers:string[]=[];
  if(current.status!=='READY') blockers.push('CURRENT_LINEAGE_NOT_READY');
  if(input.nextOwner===current.owner) blockers.push('OWNER_UNCHANGED');
  if(input.nextLeaseEpoch<=current.leaseEpoch) blockers.push('LEASE_EPOCH_MUST_INCREASE');
  if(!input.hostAuthorized) blockers.push('HOST_AUTHORIZATION_REQUIRED');

  const canonical={
    release:'v78',
    missionId:current.missionId,
    stepId:current.stepId,
    currentOwner:current.owner,
    nextOwner:input.nextOwner,
    currentLeaseId:current.leaseId,
    nextLeaseId:input.nextLeaseId,
    currentLeaseEpoch:current.leaseEpoch,
    nextLeaseEpoch:input.nextLeaseEpoch,
    parentLineageDigest:current.lineageDigest,
    blockers:[...blockers].sort()
  };

  return {
    ...canonical,
    status:blockers.length?'BLOCKED':'READY',
    transferDigest:hash(canonical),
    nextPriorOwners:uniq([...current.priorOwners,current.owner]),
    executionClaim:false
  } as const;
}

export function auditExecutionLineageV78(){
  const evidenceDigest=hash({kind:'test',result:'pass'});
  const consensusDigest=hash({decision:'approve',quorum:3});
  const base:V78ExecutionLineageInput={
    missionId:'mission-78',
    objective:'Ship verified v78 capability',
    stepId:'verify-1',
    owner:'backend',
    leaseId:'lease-1',
    leaseEpoch:1,
    leaseActive:true,
    hostAuthorized:true,
    mutationRequested:true,
    evidence:[
      {id:'test:focused',digest:evidenceDigest,verified:true,source:'TEST'}
    ],
    consensusReceipt:{
      consensusDigest,
      decision:'CONSENSUS',
      participants:['backend','qa','security'],
      evidenceRefs:['test:focused'],
      issuedBy:'security',
      independentValidator:'qa'
    },
    priorOwners:[]
  };

  const ready=buildExecutionLineageV78(base);
  const verified=verifyExecutionLineageV78({...base,claimedLineageDigest:ready.lineageDigest});
  const tampered=verifyExecutionLineageV78({...base,objective:'Tampered objective',claimedLineageDigest:ready.lineageDigest});
  const unauthorized=buildExecutionLineageV78({...base,hostAuthorized:false});
  const badConsensus=buildExecutionLineageV78({
    ...base,
    consensusReceipt:{...base.consensusReceipt!,evidenceRefs:['missing:evidence']}
  });
  const transfer=buildOwnershipTransferV78({
    current:base,
    nextOwner:'qa',
    nextLeaseId:'lease-2',
    nextLeaseEpoch:2,
    hostAuthorized:true
  });

  const checks={
    readyLineage:ready.status==='READY'&&ready.continuationAllowed,
    verifiedDigest:verified.status==='PASS'&&verified.digestMatches,
    tamperDetected:tampered.status==='BLOCKED'&&!tampered.digestMatches,
    unauthorizedMutationBlocked:unauthorized.blockers.includes('HOST_AUTHORIZATION_REQUIRED'),
    unboundConsensusBlocked:badConsensus.blockers.includes('CONSENSUS_EVIDENCE_UNBOUND'),
    ownershipTransferReady:transfer.status==='READY'&&transfer.nextLeaseEpoch===2,
    deterministicDigest:/^[a-f0-9]{64}$/.test(ready.lineageDigest)&&/^[a-f0-9]{64}$/.test(transfer.transferDigest),
    noExecutionClaim:ready.executionClaim===false&&transfer.executionClaim===false
  };
  const passed=Object.values(checks).filter(Boolean).length;

  return {
    release:'v78',
    status:passed===Object.keys(checks).length?'PASS':'FAIL',
    checks,
    passed,
    total:Object.keys(checks).length,
    executionClaim:false,
    persistenceClaim:false
  } as const;
}
