import { createHash } from 'node:crypto';
import { z } from 'zod';

export const v78GovernanceSchema=z.object({
  objective:z.string().min(3),
  autonomyMode:z.enum(['ADVISORY','SUPERVISED','BOUNDED_AUTONOMOUS']).default('SUPERVISED'),
  hostAuthorized:z.boolean().default(false),
  approvalRequired:z.boolean().default(false),
  approved:z.boolean().default(false),
  budgetUnits:z.number().int().min(0).max(1000).default(20),
  estimatedCost:z.number().int().min(0).max(1000).default(1),
  confidence:z.number().min(0).max(1).default(0.5),
  minimumConfidence:z.number().min(0).max(1).default(0.65),
  leaseOwner:z.string().min(1).optional(),
  leaseActive:z.boolean().default(false),
  competingOwners:z.array(z.string().min(1)).default([]),
  highRisk:z.boolean().default(false),
  rollbackAvailable:z.boolean().default(false)
});

export type V78GovernanceInput=z.infer<typeof v78GovernanceSchema>;

function hash(value:unknown){
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function evaluateAutonomousExecutionV78(input:V78GovernanceInput){
  const parsed=v78GovernanceSchema.parse(input);
  const blockers:string[]=[];
  const warnings:string[]=[];

  if(parsed.estimatedCost>parsed.budgetUnits) blockers.push('BUDGET_EXCEEDED');
  if(parsed.confidence<parsed.minimumConfidence) blockers.push('CONFIDENCE_BELOW_THRESHOLD');
  if(parsed.leaseActive&&!parsed.leaseOwner) blockers.push('LEASE_OWNER_REQUIRED');
  if(parsed.competingOwners.length>0) blockers.push('EXECUTION_OWNERSHIP_CONFLICT');
  if(parsed.highRisk&&!parsed.rollbackAvailable) blockers.push('ROLLBACK_REQUIRED_FOR_HIGH_RISK');
  if(parsed.autonomyMode==='BOUNDED_AUTONOMOUS'&&!parsed.hostAuthorized) blockers.push('HOST_AUTHORIZATION_REQUIRED');
  if((parsed.approvalRequired||parsed.highRisk)&&!parsed.approved) blockers.push('APPROVAL_REQUIRED');
  if(parsed.autonomyMode==='ADVISORY') warnings.push('ADVISORY_MODE_NO_DISPATCH');

  const dispatchAllowed=
    parsed.autonomyMode!=='ADVISORY' &&
    blockers.length===0 &&
    parsed.hostAuthorized;

  const canonical={
    release:'v78',
    objective:parsed.objective,
    autonomyMode:parsed.autonomyMode,
    hostAuthorized:parsed.hostAuthorized,
    approvalRequired:parsed.approvalRequired,
    approved:parsed.approved,
    budgetUnits:parsed.budgetUnits,
    estimatedCost:parsed.estimatedCost,
    confidence:parsed.confidence,
    minimumConfidence:parsed.minimumConfidence,
    leaseOwner:parsed.leaseOwner??null,
    leaseActive:parsed.leaseActive,
    competingOwners:[...new Set(parsed.competingOwners)].sort(),
    highRisk:parsed.highRisk,
    rollbackAvailable:parsed.rollbackAvailable,
    blockers:[...blockers].sort(),
    warnings:[...warnings].sort(),
    dispatchAllowed
  };

  return {
    ...canonical,
    status:blockers.length?'BLOCKED':dispatchAllowed?'READY':'ADVISORY',
    governanceDigest:hash(canonical),
    executionClaim:false
  } as const;
}

export function auditAutonomousExecutionV78(){
  const ready=evaluateAutonomousExecutionV78({
    objective:'verify bounded engineering task',
    autonomyMode:'BOUNDED_AUTONOMOUS',
    hostAuthorized:true,
    approvalRequired:false,
    approved:false,
    budgetUnits:20,
    estimatedCost:5,
    confidence:0.9,
    minimumConfidence:0.65,
    leaseOwner:'orchestrator',
    leaseActive:true,
    competingOwners:[],
    highRisk:false,
    rollbackAvailable:true
  });
  const blocked=evaluateAutonomousExecutionV78({
    objective:'deploy high risk production mutation',
    autonomyMode:'BOUNDED_AUTONOMOUS',
    hostAuthorized:false,
    approvalRequired:true,
    approved:false,
    budgetUnits:5,
    estimatedCost:10,
    confidence:0.4,
    minimumConfidence:0.8,
    leaseActive:false,
    competingOwners:['devops','release-auditor'],
    highRisk:true,
    rollbackAvailable:false
  });
  const advisory=evaluateAutonomousExecutionV78({
    objective:'analyze architecture',
    autonomyMode:'ADVISORY',
    hostAuthorized:false,
    approvalRequired:false,
    approved:false,
    budgetUnits:20,
    estimatedCost:1,
    confidence:0.9,
    minimumConfidence:0.5,
    leaseActive:false,
    competingOwners:[],
    highRisk:false,
    rollbackAvailable:false
  });

  const checks={
    boundedAutonomyReady:ready.status==='READY'&&ready.dispatchAllowed,
    highRiskBlocked:blocked.status==='BLOCKED'&&!blocked.dispatchAllowed,
    budgetEnforced:blocked.blockers.includes('BUDGET_EXCEEDED'),
    confidenceEnforced:blocked.blockers.includes('CONFIDENCE_BELOW_THRESHOLD'),
    ownershipConflictDetected:blocked.blockers.includes('EXECUTION_OWNERSHIP_CONFLICT'),
    advisoryNoDispatch:advisory.status==='ADVISORY'&&!advisory.dispatchAllowed,
    deterministicDigest:/^[a-f0-9]{64}$/.test(ready.governanceDigest),
    noExecutionClaim:ready.executionClaim===false&&blocked.executionClaim===false
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
