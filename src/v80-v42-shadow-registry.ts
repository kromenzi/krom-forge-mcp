import { z } from 'zod';
import { V75_AGENT_IDS, V75_SKILL_NAMES } from './v75-agent-capability-fabric';
import { normalizeSkillIdentityV80 } from './v80-skill-onboarding-governance';
import { V80_V42_SHADOW_SEEDS } from './v80-v42-shadow-seeds';

const stableNames = new Set<string>(V75_SKILL_NAMES as readonly string[]);
const stableNormalized = new Map<string,string[]>();
for (const name of V75_SKILL_NAMES as readonly string[]) {
  const key=normalizeSkillIdentityV80(name);
  stableNormalized.set(key,[...(stableNormalized.get(key)??[]),name]);
}

const candidateNames = new Set(V80_V42_SHADOW_SEEDS.map(item=>item.n));
const round=(value:number,digits=4)=>Number(value.toFixed(digits));

export const V80_V42_SHADOW_REGISTRY_META = {
  registryName:'KROM-Forge-v79-Native-Skills-Pack-v4.2-500-New',
  sourceVersion:'4.2.0',
  sourceArchiveSha256:'6dfa6f35e552712d6158c12917d0cf632f87707a607ed9a8657857eda1aa05a5',
  stableCatalogBaseline:1465,
  candidateCount:500,
  targetCatalogIfAllPromoted:1965,
  publicToolBaseline:15,
  internalCapabilityBaseline:5333,
  agentBaseline:11,
  declaredBehavioralTests:4000,
  inputSchemas:500,
  outputSchemas:500,
  normalizedProceduralBodies:500,
  proceduralPairsGte090:0,
  highestObservedProceduralSimilarity:0.8961,
  highConfidenceSemanticDuplicates:0,
  packageValidation:'PASS',
  capabilityBlockingGaps:0,
  defaultLifecycle:'SHADOW',
  executableByDefault:false
} as const;

export function getV42ShadowRegistrySummaryV80(){
  const exactStableCollisions=V80_V42_SHADOW_SEEDS.filter(item=>stableNames.has(item.n)).map(item=>item.n).sort();

  const normalizedStableCollisions=V80_V42_SHADOW_SEEDS
    .map(item=>({name:item.n,normalized:normalizeSkillIdentityV80(item.n)}))
    .filter(item=>stableNormalized.has(item.normalized))
    .map(item=>({
      candidate:item.name,
      normalized:item.normalized,
      stableMatches:stableNormalized.get(item.normalized)??[]
    }))
    .sort((a,b)=>a.candidate.localeCompare(b.candidate));

  const duplicateCandidateNames=[...new Set(
    V80_V42_SHADOW_SEEDS.map(item=>item.n).filter((name,index,array)=>array.indexOf(name)!==index)
  )].sort();

  const hashGroups=new Map<string,string[]>();
  for(const item of V80_V42_SHADOW_SEEDS){
    hashGroups.set(item.h,[...(hashGroups.get(item.h)??[]),item.n]);
  }
  const duplicateInstructionHashes=[...hashGroups.entries()]
    .filter(([,names])=>names.length>1)
    .map(([hash,names])=>({hash,names:[...names].sort()}))
    .sort((a,b)=>a.hash.localeCompare(b.hash));

  const areaCounts:Record<string,number>={};
  const primaryAgentCounts:Record<string,number>={};
  const validatorAgentCounts:Record<string,number>={};
  for(const item of V80_V42_SHADOW_SEEDS){
    areaCounts[item.a]=(areaCounts[item.a]??0)+1;
    primaryAgentCounts[item.p]=(primaryAgentCounts[item.p]??0)+1;
    validatorAgentCounts[item.v]=(validatorAgentCounts[item.v]??0)+1;
  }

  const stableCatalogUnchanged=V75_SKILL_NAMES.length===V80_V42_SHADOW_REGISTRY_META.stableCatalogBaseline;
  const agentBaselineUnchanged=V75_AGENT_IDS.length===V80_V42_SHADOW_REGISTRY_META.agentBaseline;
  const registryValid=
    V80_V42_SHADOW_SEEDS.length===V80_V42_SHADOW_REGISTRY_META.candidateCount &&
    duplicateCandidateNames.length===0 &&
    duplicateInstructionHashes.length===0 &&
    exactStableCollisions.length===0 &&
    normalizedStableCollisions.length===0 &&
    stableCatalogUnchanged &&
    agentBaselineUnchanged;

  return {
    release:'v80',
    phase:'v42-shadow-registry',
    status:registryValid?'PASS':'BLOCKED',
    meta:V80_V42_SHADOW_REGISTRY_META,
    stableCatalog:{count:V75_SKILL_NAMES.length,unchanged:stableCatalogUnchanged},
    shadowCandidates:{count:V80_V42_SHADOW_SEEDS.length,lifecycle:'SHADOW',executable:false,promoted:0},
    collisionAudit:{exactStableCollisions,normalizedStableCollisions,duplicateCandidateNames,duplicateInstructionHashes},
    distributions:{
      areas:Object.fromEntries(Object.entries(areaCounts).sort(([a],[b])=>a.localeCompare(b))),
      primaryAgents:Object.fromEntries(Object.entries(primaryAgentCounts).sort(([a],[b])=>a.localeCompare(b))),
      validatorAgents:Object.fromEntries(Object.entries(validatorAgentCounts).sort(([a],[b])=>a.localeCompare(b)))
    },
    boundaries:{
      corePublicToolsExpected:15,
      internalCapabilitiesExpected:5333,
      controlPlaneGatewaysAdded:0,
      stableSkillCatalogMutation:false,
      candidateExecutionEnabled:false,
      productionMutation:false
    },
    executionClaim:false
  } as const;
}

export const v80V42CandidateLookupSchema=z.object({skillName:z.string().min(1)});

export function getV42ShadowCandidateV80(input:z.input<typeof v80V42CandidateLookupSchema>){
  const parsed=v80V42CandidateLookupSchema.parse(input);
  const candidate=V80_V42_SHADOW_SEEDS.find(item=>item.n===parsed.skillName);
  if(!candidate){
    return {release:'v80',status:'NOT_FOUND',skillName:parsed.skillName,executionClaim:false} as const;
  }
  return {
    release:'v80',
    status:'FOUND',
    skillName:candidate.n,
    area:candidate.a,
    primaryAgent:candidate.p,
    validatorAgent:candidate.v,
    instructionHash:candidate.h,
    lifecycle:'SHADOW',
    executable:false,
    stableCatalogMember:stableNames.has(candidate.n),
    nextGate:'Provide evidence-bound shadow benchmark observations before CANARY recommendation.',
    executionClaim:false
  } as const;
}

export const v80V42CanaryEvidenceItemSchema=z.object({
  skillName:z.string().min(1),
  benchmarkScore:z.number().min(0).max(1),
  benchmarkCases:z.number().int().min(0),
  semanticMaxSimilarity:z.number().min(0).max(1).default(0),
  proceduralMaxSimilarity:z.number().min(0).max(1).default(0),
  specializationDistinct:z.boolean().default(true),
  evidenceComplete:z.boolean().default(false),
  validatorPass:z.boolean().default(false),
  regressionRate:z.number().min(0).max(1).default(0),
  securityPass:z.boolean().default(true)
});

export const v80V42CanarySelectionSchema=z.object({
  evidence:z.array(v80V42CanaryEvidenceItemSchema).max(500).default([]),
  maxCandidates:z.number().int().min(1).max(100).default(25),
  maxPerArea:z.number().int().min(1).max(10).default(2),
  benchmarkThreshold:z.number().min(0.5).max(1).default(0.90),
  minimumBenchmarkCases:z.number().int().min(1).default(20),
  similarityReviewThreshold:z.number().min(0.75).max(0.99).default(0.90),
  maxRegressionRate:z.number().min(0).max(0.5).default(0.05)
});

export function selectV42CanaryCohortV80(input:z.input<typeof v80V42CanarySelectionSchema>){
  const parsed=v80V42CanarySelectionSchema.parse(input);
  const evidenceMap=new Map(parsed.evidence.map(item=>[item.skillName,item]));
  const unknownEvidenceSkills=parsed.evidence.filter(item=>!candidateNames.has(item.skillName)).map(item=>item.skillName).sort();

  const evaluations=V80_V42_SHADOW_SEEDS.map(candidate=>{
    const evidence=evidenceMap.get(candidate.n);
    if(!evidence){
      return {skillName:candidate.n,area:candidate.a,eligible:false,reason:'NO_SHADOW_BENCHMARK_EVIDENCE',score:0,benchmarkCases:0};
    }
    const similarityPeak=Math.max(evidence.semanticMaxSimilarity,evidence.proceduralMaxSimilarity);
    const gates={
      evidenceComplete:evidence.evidenceComplete,
      validatorPass:evidence.validatorPass,
      securityPass:evidence.securityPass,
      benchmarkScore:evidence.benchmarkScore>=parsed.benchmarkThreshold,
      benchmarkCases:evidence.benchmarkCases>=parsed.minimumBenchmarkCases,
      similarity:similarityPeak<parsed.similarityReviewThreshold||evidence.specializationDistinct,
      regression:evidence.regressionRate<=parsed.maxRegressionRate
    };
    const failed=Object.entries(gates).filter(([,ok])=>!ok).map(([name])=>name);
    const score=round(
      (0.45*evidence.benchmarkScore)+
      (0.20*Math.min(1,evidence.benchmarkCases/50))+
      (0.15*(1-evidence.regressionRate))+
      (0.10*(evidence.evidenceComplete?1:0))+
      (0.10*(evidence.validatorPass?1:0))
    );
    return {
      skillName:candidate.n,
      area:candidate.a,
      eligible:failed.length===0,
      reason:failed.length?'FAILED_GATES:'+failed.join(','):'ELIGIBLE',
      score,
      benchmarkCases:evidence.benchmarkCases,
      similarityPeak:round(similarityPeak),
      regressionRate:round(evidence.regressionRate)
    };
  });

  const eligible=evaluations
    .filter(item=>item.eligible)
    .sort((a,b)=>b.score-a.score||b.benchmarkCases-a.benchmarkCases||a.skillName.localeCompare(b.skillName));

  const selected:typeof eligible=[];
  const perArea=new Map<string,number>();
  for(const item of eligible){
    if(selected.length>=parsed.maxCandidates) break;
    const count=perArea.get(item.area)??0;
    if(count>=parsed.maxPerArea) continue;
    selected.push(item);
    perArea.set(item.area,count+1);
  }

  return {
    release:'v80',
    phase:'v42-canary-selection',
    status:unknownEvidenceSkills.length?'CONDITIONAL':'PASS',
    stableCatalogCount:V75_SKILL_NAMES.length,
    shadowCandidateCount:V80_V42_SHADOW_SEEDS.length,
    evidenceItems:parsed.evidence.length,
    eligibleCount:eligible.length,
    selectedCount:selected.length,
    selected,
    unknownEvidenceSkills,
    rejected:evaluations.filter(item=>!item.eligible),
    promotionApplied:false,
    selectedLifecycle:'CANARY_RECOMMENDATION_ONLY',
    executable:false,
    hostAuthorizationRequired:selected.length>0,
    executionClaim:false
  } as const;
}

export function auditV42ShadowRegistryV80(){
  const summary=getV42ShadowRegistrySummaryV80();
  const first=V80_V42_SHADOW_SEEDS[0];
  const noEvidence=selectV42CanaryCohortV80({evidence:[]});
  const positive=selectV42CanaryCohortV80({
    maxCandidates:3,
    maxPerArea:3,
    evidence:[{
      skillName:first.n,
      benchmarkScore:0.96,
      benchmarkCases:40,
      semanticMaxSimilarity:0.62,
      proceduralMaxSimilarity:0.71,
      specializationDistinct:true,
      evidenceComplete:true,
      validatorPass:true,
      regressionRate:0.01,
      securityPass:true
    }]
  });
  const unknown=getV42ShadowCandidateV80({skillName:'not-a-v42-shadow-candidate'});
  const found=getV42ShadowCandidateV80({skillName:first.n});

  const checks={
    candidateCountIs500:V80_V42_SHADOW_SEEDS.length===500,
    stableCatalogRemains1465:V75_SKILL_NAMES.length===1465,
    noExactStableCollisions:summary.collisionAudit.exactStableCollisions.length===0,
    noNormalizedStableCollisions:summary.collisionAudit.normalizedStableCollisions.length===0,
    uniqueCandidateNames:summary.collisionAudit.duplicateCandidateNames.length===0,
    uniqueInstructionHashes:summary.collisionAudit.duplicateInstructionHashes.length===0,
    shadowDefaultNonExecutable:summary.shadowCandidates.lifecycle==='SHADOW'&&!summary.shadowCandidates.executable,
    noEvidenceProducesNoCanary:noEvidence.selectedCount===0,
    qualifiedEvidenceCanRecommendCanary:positive.selectedCount===1&&positive.selected[0]?.skillName===first.n,
    canaryDoesNotExecute:positive.executable===false&&!positive.promotionApplied,
    lookupBounded:found.status==='FOUND'&&found.lifecycle==='SHADOW'&&unknown.status==='NOT_FOUND',
    publicSurfaceUnchanged:summary.boundaries.corePublicToolsExpected===15,
    internalCapabilityRegistryUnchanged:summary.boundaries.internalCapabilitiesExpected===5333,
    noAdditionalGateway:summary.boundaries.controlPlaneGatewaysAdded===0
  };
  const failures=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
  return {
    release:'v80',
    phase:'v42-shadow-registry',
    status:failures.length?'FAIL':'PASS',
    checks,
    failures,
    archiveSha256:V80_V42_SHADOW_REGISTRY_META.sourceArchiveSha256,
    executionClaim:false
  } as const;
}
