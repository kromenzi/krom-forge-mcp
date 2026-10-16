import { createHash } from 'node:crypto';
import { z } from 'zod';
import { v78AgentIdSchema } from './v78-agent-delegation-consensus';

const evidenceFreshnessSchema=z.object({
  id:z.string().min(1),
  digest:z.string().regex(/^[a-f0-9]{64}$/),
  verified:z.boolean().default(false),
  issuedAtEpoch:z.number().int().min(0),
  maxAgeSeconds:z.number().int().min(1).max(31_536_000),
  revoked:z.boolean().default(false),
  sourceTrust:z.number().min(0).max(1).default(0.5)
});

export const v78DecisionProvenanceSchema=z.object({
  decisionId:z.string().min(1),
  objective:z.string().min(3),
  decidedBy:v78AgentIdSchema,
  decision:z.enum(['APPROVE','REJECT','DEFER','REPLAN']),
  rationale:z.array(z.string().min(1)).min(1).max(32),
  evidence:z.array(evidenceFreshnessSchema).min(1).max(64),
  nowEpoch:z.number().int().min(0),
  minimumFreshEvidence:z.number().int().min(1).max(64).default(1),
  minimumAverageTrust:z.number().min(0).max(1).default(0.6),
  independentValidator:v78AgentIdSchema.optional(),
  priorDecisionDigest:z.string().regex(/^[a-f0-9]{64}$/).optional()
});

export const v78AgentTrustSchema=z.object({
  agent:v78AgentIdSchema,
  verifiedDecisions:z.number().int().min(0).max(10_000).default(0),
  overturnedDecisions:z.number().int().min(0).max(10_000).default(0),
  verifiedEvidenceContributions:z.number().int().min(0).max(10_000).default(0),
  staleEvidenceContributions:z.number().int().min(0).max(10_000).default(0),
  authorizationViolations:z.number().int().min(0).max(10_000).default(0),
  unresolvedConflicts:z.number().int().min(0).max(10_000).default(0),
  baselineTrust:z.number().min(0).max(1).default(0.5)
});

export type V78DecisionProvenanceInput=z.infer<typeof v78DecisionProvenanceSchema>;
export type V78AgentTrustInput=z.infer<typeof v78AgentTrustSchema>;

function hash(value:unknown){
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function clamp(value:number,min=0,max=1){
  return Math.max(min,Math.min(max,value));
}

export function evaluateEvidenceFreshnessV78(input:{
  evidence:z.infer<typeof evidenceFreshnessSchema>[];
  nowEpoch:number;
}){
  const parsed=z.object({
    evidence:z.array(evidenceFreshnessSchema).min(1).max(64),
    nowEpoch:z.number().int().min(0)
  }).parse(input);

  const records=[...parsed.evidence]
    .sort((a,b)=>a.id.localeCompare(b.id))
    .map(e=>{
      const ageSeconds=Math.max(0,parsed.nowEpoch-e.issuedAtEpoch);
      const fresh=!e.revoked && e.verified && ageSeconds<=e.maxAgeSeconds;
      return {
        id:e.id,
        digest:e.digest,
        verified:e.verified,
        revoked:e.revoked,
        ageSeconds,
        maxAgeSeconds:e.maxAgeSeconds,
        sourceTrust:e.sourceTrust,
        status:e.revoked?'REVOKED':!e.verified?'UNVERIFIED':ageSeconds>e.maxAgeSeconds?'STALE':'FRESH',
        fresh
      } as const;
    });

  const fresh=records.filter(r=>r.fresh);
  const staleOrRevoked=records.filter(r=>!r.fresh);
  const averageFreshTrust=fresh.length
    ? Number((fresh.reduce((sum,r)=>sum+r.sourceTrust,0)/fresh.length).toFixed(4))
    : 0;

  const canonical={
    release:'v78',
    nowEpoch:parsed.nowEpoch,
    records:records.map(r=>({
      id:r.id,digest:r.digest,status:r.status,ageSeconds:r.ageSeconds,
      maxAgeSeconds:r.maxAgeSeconds,sourceTrust:r.sourceTrust
    }))
  };

  return {
    ...canonical,
    freshCount:fresh.length,
    staleOrRevokedCount:staleOrRevoked.length,
    averageFreshTrust,
    freshnessDigest:hash(canonical),
    continuationEligible:fresh.length>0,
    executionClaim:false
  } as const;
}

export function scoreAgentTrustV78(input:V78AgentTrustInput){
  const p=v78AgentTrustSchema.parse(input);
  const positiveVolume=p.verifiedDecisions+p.verifiedEvidenceContributions;
  const negativeVolume=
    p.overturnedDecisions+
    p.staleEvidenceContributions+
    p.authorizationViolations*3+
    p.unresolvedConflicts*2;

  const evidenceBonus=Math.min(0.25,positiveVolume*0.01);
  const penalty=Math.min(0.8,negativeVolume*0.03);
  const trust=Number(clamp(p.baselineTrust+evidenceBonus-penalty).toFixed(4));

  const canonical={
    release:'v78',
    agent:p.agent,
    baselineTrust:p.baselineTrust,
    verifiedDecisions:p.verifiedDecisions,
    overturnedDecisions:p.overturnedDecisions,
    verifiedEvidenceContributions:p.verifiedEvidenceContributions,
    staleEvidenceContributions:p.staleEvidenceContributions,
    authorizationViolations:p.authorizationViolations,
    unresolvedConflicts:p.unresolvedConflicts,
    trust
  };

  return {
    ...canonical,
    trustBand:trust>=0.8?'HIGH':trust>=0.6?'MEDIUM':trust>=0.4?'LOW':'RESTRICTED',
    trustDigest:hash(canonical),
    executionClaim:false
  } as const;
}

export function buildDecisionProvenanceV78(input:V78DecisionProvenanceInput){
  const p=v78DecisionProvenanceSchema.parse(input);
  const freshness=evaluateEvidenceFreshnessV78({evidence:p.evidence,nowEpoch:p.nowEpoch});
  const blockers:string[]=[];

  if(freshness.freshCount<p.minimumFreshEvidence) blockers.push('INSUFFICIENT_FRESH_EVIDENCE');
  if(freshness.averageFreshTrust<p.minimumAverageTrust) blockers.push('EVIDENCE_TRUST_BELOW_THRESHOLD');
  if(p.independentValidator&&p.independentValidator===p.decidedBy) blockers.push('VALIDATOR_NOT_INDEPENDENT');

  const evidenceIds=[...p.evidence].sort((a,b)=>a.id.localeCompare(b.id)).map(e=>e.id);
  const canonical={
    release:'v78',
    decisionId:p.decisionId,
    objective:p.objective,
    decidedBy:p.decidedBy,
    decision:p.decision,
    rationale:[...p.rationale],
    evidenceIds,
    freshnessDigest:freshness.freshnessDigest,
    independentValidator:p.independentValidator??null,
    priorDecisionDigest:p.priorDecisionDigest??null,
    blockers:[...blockers].sort()
  };

  return {
    ...canonical,
    decisionDigest:hash(canonical),
    freshness,
    status:blockers.length?'BLOCKED':'VERIFIED',
    continuationAllowed:blockers.length===0 && p.decision==='APPROVE',
    executionClaim:false,
    persistenceClaim:false
  } as const;
}

export function verifyDecisionProvenanceV78(input:V78DecisionProvenanceInput & {
  claimedDecisionDigest:string;
}){
  const {claimedDecisionDigest,...provenanceInput}=input;
  const provenance=buildDecisionProvenanceV78(provenanceInput);
  const digestMatches=provenance.decisionDigest===claimedDecisionDigest;
  const blockers=[...provenance.blockers];
  if(!digestMatches) blockers.push('DECISION_DIGEST_MISMATCH');

  return {
    release:'v78',
    status:blockers.length?'BLOCKED':'PASS',
    digestMatches,
    blockers:[...new Set(blockers)].sort(),
    continuationAllowed:blockers.length===0&&provenance.continuationAllowed,
    computedDecisionDigest:provenance.decisionDigest,
    executionClaim:false,
    persistenceClaim:false
  } as const;
}

export function auditDecisionProvenanceV78(){
  const now=2_000_000;
  const freshEvidence=[
    {
      id:'test:1',
      digest:'a'.repeat(64),
      verified:true,
      issuedAtEpoch:1_999_900,
      maxAgeSeconds:300,
      revoked:false,
      sourceTrust:0.9
    }
  ];

  const good=buildDecisionProvenanceV78({
    decisionId:'d1',
    objective:'Approve verified release step',
    decidedBy:'release-auditor',
    decision:'APPROVE',
    rationale:['All required release evidence is current and verified.'],
    evidence:freshEvidence,
    nowEpoch:now,
    minimumFreshEvidence:1,
    minimumAverageTrust:0.8,
    independentValidator:'qa'
  });

  const stale=buildDecisionProvenanceV78({
    decisionId:'d2',
    objective:'Reject stale release evidence',
    decidedBy:'release-auditor',
    decision:'APPROVE',
    rationale:['This should be blocked because evidence is stale.'],
    evidence:[{...freshEvidence[0],issuedAtEpoch:1_990_000}],
    nowEpoch:now,
    minimumFreshEvidence:1,
    minimumAverageTrust:0.8,
    independentValidator:'qa'
  });

  const tampered=verifyDecisionProvenanceV78({
    decisionId:'d1',
    objective:'Tampered objective',
    decidedBy:'release-auditor',
    decision:'APPROVE',
    rationale:['All required release evidence is current and verified.'],
    evidence:freshEvidence,
    nowEpoch:now,
    minimumFreshEvidence:1,
    minimumAverageTrust:0.8,
    independentValidator:'qa',
    claimedDecisionDigest:good.decisionDigest
  });

  const trusted=scoreAgentTrustV78({
    agent:'qa',
    verifiedDecisions:20,
    overturnedDecisions:1,
    verifiedEvidenceContributions:20,
    staleEvidenceContributions:1,
    authorizationViolations:0,
    unresolvedConflicts:0,
    baselineTrust:0.6
  });

  const restricted=scoreAgentTrustV78({
    agent:'backend',
    verifiedDecisions:2,
    overturnedDecisions:5,
    verifiedEvidenceContributions:1,
    staleEvidenceContributions:5,
    authorizationViolations:2,
    unresolvedConflicts:3,
    baselineTrust:0.5
  });

  const checks={
    verifiedDecision:good.status==='VERIFIED'&&good.continuationAllowed,
    staleEvidenceBlocked:stale.status==='BLOCKED'&&!stale.continuationAllowed,
    tamperDetected:tampered.status==='BLOCKED'&&!tampered.digestMatches,
    trustBounded:trusted.trust>=0&&trusted.trust<=1&&restricted.trust>=0&&restricted.trust<=1,
    riskyAgentRestricted:restricted.trustBand==='RESTRICTED'||restricted.trustBand==='LOW',
    deterministicDigests:/^[a-f0-9]{64}$/.test(good.decisionDigest)&&/^[a-f0-9]{64}$/.test(trusted.trustDigest),
    noExecutionClaim:good.executionClaim===false&&trusted.executionClaim===false
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
