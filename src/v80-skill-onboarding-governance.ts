import { z } from 'zod';
import { V75_AGENT_IDS, V75_SKILL_NAMES } from './v75-agent-capability-fabric';
import { V80_SKILL_LIFECYCLE } from './v80-adaptive-skill-intelligence';

const lifecycleSchema = z.enum(V80_SKILL_LIFECYCLE);
const agentSchema = z.enum(V75_AGENT_IDS);
const knownSkills = new Set<string>(V75_SKILL_NAMES as readonly string[]);

const clamp01=(value:number)=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
const round=(value:number,digits=4)=>Number(value.toFixed(digits));

export function normalizeSkillIdentityV80(value:string){
  return value.toLowerCase().normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g,'')
    .replace(/\bv\d+\b/g,' ')
    .replace(/\b(krom|forge|skill|native)\b/g,' ')
    .replace(/[_/.-]+/g,' ')
    .replace(/[^\p{L}\p{N}\s]+/gu,' ')
    .replace(/\s+/g,' ')
    .trim();
}

export const v80SkillOnboardingCandidateSchema=z.object({
  skillName:z.string().min(1),
  packageId:z.string().min(1).default('unpackaged'),
  domain:z.string().min(1).default('general'),
  primaryAgent:agentSchema,
  validatorAgent:agentSchema,
  handoffAgents:z.array(agentSchema).max(6).default([]),
  exactNameCollision:z.boolean().default(false),
  normalizedNameCollision:z.boolean().default(false),
  semanticMaxSimilarity:z.number().min(0).max(1).default(0),
  proceduralMaxSimilarity:z.number().min(0).max(1).default(0),
  semanticDuplicateEvidence:z.boolean().default(false),
  purposeOverlapRisk:z.enum(['low','medium','high']).default('low'),
  specializationDistinct:z.boolean().default(false),
  contractValid:z.boolean().default(false),
  schemaValid:z.boolean().default(false),
  securityPass:z.boolean().default(false),
  provenanceValid:z.boolean().default(false),
  checksumValid:z.boolean().default(false),
  agentMappingValid:z.boolean().default(false),
  capabilityMappingValid:z.boolean().default(false),
  evidenceContractValid:z.boolean().default(false),
  behavioralTests:z.number().int().min(0).default(0),
  benchmarkScore:z.number().min(0).max(1).default(0),
  benchmarkCases:z.number().int().min(0).default(0)
});

export type V80SkillOnboardingCandidate=z.infer<typeof v80SkillOnboardingCandidateSchema>;

export const v80OnboardingGateSchema=z.object({
  candidate:v80SkillOnboardingCandidateSchema,
  highSimilarityReviewThreshold:z.number().min(0.75).max(0.99).default(0.90),
  duplicateBlockThreshold:z.number().min(0.85).max(1).default(0.95),
  canaryBenchmarkThreshold:z.number().min(0).max(1).default(0.90),
  canaryMinimumBenchmarkCases:z.number().int().min(1).default(20),
  minimumBehavioralTests:z.number().int().min(1).default(8)
});

export function evaluateSkillOnboardingV80(input:z.input<typeof v80OnboardingGateSchema>){
  const parsed=v80OnboardingGateSchema.parse(input);
  const c=parsed.candidate;
  const blockers:string[]=[];
  const reviewReasons:string[]=[];
  const warnings:string[]=[];

  const normalized=normalizeSkillIdentityV80(c.skillName);
  const baselineExact=knownSkills.has(c.skillName);
  const baselineNormalized=V75_SKILL_NAMES.some(name=>normalizeSkillIdentityV80(name)===normalized);

  if(c.exactNameCollision||baselineExact) blockers.push('EXACT_NAME_COLLISION');
  if(c.normalizedNameCollision||baselineNormalized) blockers.push('NORMALIZED_NAME_COLLISION');
  if(!c.contractValid) blockers.push('CONTRACT_INVALID');
  if(!c.schemaValid) blockers.push('SCHEMA_INVALID');
  if(!c.securityPass) blockers.push('SECURITY_GATE_FAILED');
  if(!c.provenanceValid) blockers.push('PROVENANCE_INVALID');
  if(!c.checksumValid) blockers.push('CHECKSUM_INVALID');
  if(!c.agentMappingValid) blockers.push('AGENT_MAPPING_INVALID');
  if(!c.capabilityMappingValid) blockers.push('CAPABILITY_MAPPING_INVALID');
  if(!c.evidenceContractValid) blockers.push('EVIDENCE_CONTRACT_INVALID');
  if(c.behavioralTests<parsed.minimumBehavioralTests) blockers.push('BEHAVIORAL_TEST_COVERAGE_INSUFFICIENT');

  const duplicateLike =
    c.semanticDuplicateEvidence ||
    (!c.specializationDistinct &&
      c.semanticMaxSimilarity>=parsed.duplicateBlockThreshold &&
      c.proceduralMaxSimilarity>=parsed.duplicateBlockThreshold);
  if(duplicateLike) blockers.push('HIGH_CONFIDENCE_DUPLICATE');

  const similarityPeak=Math.max(c.semanticMaxSimilarity,c.proceduralMaxSimilarity);
  if(!duplicateLike&&similarityPeak>=parsed.highSimilarityReviewThreshold){
    reviewReasons.push('HIGH_SIMILARITY_REQUIRES_HUMAN_REVIEW');
  }
  if(c.purposeOverlapRisk==='high'&&!c.specializationDistinct){
    reviewReasons.push('HIGH_PURPOSE_OVERLAP');
  }
  if(c.primaryAgent===c.validatorAgent){
    warnings.push('PRIMARY_AND_VALIDATOR_SAME_AGENT');
  }
  if(c.handoffAgents.length===0){
    warnings.push('NO_HANDOFF_AGENT');
  }

  const canaryEvidence =
    c.benchmarkScore>=parsed.canaryBenchmarkThreshold &&
    c.benchmarkCases>=parsed.canaryMinimumBenchmarkCases &&
    similarityPeak<parsed.highSimilarityReviewThreshold &&
    c.purposeOverlapRisk!=='high';

  const recommendation = blockers.length
    ? 'BLOCKED'
    : reviewReasons.length
      ? 'REVIEW_REQUIRED'
      : canaryEvidence
        ? 'CANARY'
        : 'SHADOW';

  return {
    release:'v80',
    skillName:c.skillName,
    normalizedName:normalized,
    recommendation,
    onboardingAllowed:recommendation==='SHADOW'||recommendation==='CANARY',
    blockers,
    reviewReasons,
    warnings,
    quality:{
      semanticMaxSimilarity:round(c.semanticMaxSimilarity),
      proceduralMaxSimilarity:round(c.proceduralMaxSimilarity),
      benchmarkScore:round(c.benchmarkScore),
      benchmarkCases:c.benchmarkCases,
      behavioralTests:c.behavioralTests
    },
    requiredNextAction:recommendation==='BLOCKED'
      ? 'Repair blocking quality/collision findings before onboarding.'
      : recommendation==='REVIEW_REQUIRED'
        ? 'Perform independent semantic/procedural review before onboarding.'
        : recommendation==='SHADOW'
          ? 'Run in SHADOW, collect evidence-bound outcomes, then re-evaluate for CANARY.'
          : 'Run a governed CANARY with measured rollback and verification gates.',
    mutationApplied:false,
    executionClaim:false
  } as const;
}

export const v80BatchOnboardingSchema=z.object({
  packName:z.string().min(1),
  version:z.string().min(1),
  baseCatalogCount:z.number().int().min(1).default(1465),
  publicToolsExpected:z.number().int().min(1).default(15),
  internalCapabilitiesExpected:z.number().int().min(1).default(5333),
  agentsExpected:z.number().int().min(1).default(11),
  candidates:z.array(v80SkillOnboardingCandidateSchema).min(1).max(2000)
});

export function evaluateSkillPackOnboardingV80(input:z.input<typeof v80BatchOnboardingSchema>){
  const parsed=v80BatchOnboardingSchema.parse(input);
  const duplicateNames=[...new Set(parsed.candidates.map(x=>x.skillName).filter((name,index,array)=>array.indexOf(name)!==index))];
  const normalizedMap=new Map<string,string[]>();
  for(const candidate of parsed.candidates){
    const key=normalizeSkillIdentityV80(candidate.skillName);
    normalizedMap.set(key,[...(normalizedMap.get(key)??[]),candidate.skillName]);
  }
  const normalizedCollisions=[...normalizedMap.entries()]
    .filter(([,names])=>new Set(names).size>1)
    .map(([normalized,names])=>({normalized,names:[...new Set(names)].sort()}));

  const evaluations=parsed.candidates.map(candidate=>evaluateSkillOnboardingV80({candidate}));
  const counts={
    CANARY:evaluations.filter(x=>x.recommendation==='CANARY').length,
    SHADOW:evaluations.filter(x=>x.recommendation==='SHADOW').length,
    REVIEW_REQUIRED:evaluations.filter(x=>x.recommendation==='REVIEW_REQUIRED').length,
    BLOCKED:evaluations.filter(x=>x.recommendation==='BLOCKED').length
  };
  const baselineConsistent =
    parsed.baseCatalogCount===V75_SKILL_NAMES.length &&
    parsed.publicToolsExpected===15 &&
    parsed.internalCapabilitiesExpected===5333 &&
    parsed.agentsExpected===V75_AGENT_IDS.length;
  const packageBlockers:string[]=[];
  if(duplicateNames.length) packageBlockers.push('INTERNAL_EXACT_NAME_DUPLICATES');
  if(normalizedCollisions.length) packageBlockers.push('INTERNAL_NORMALIZED_NAME_COLLISIONS');
  if(!baselineConsistent) packageBlockers.push('BASELINE_CONTRACT_MISMATCH');
  if(counts.BLOCKED>0) packageBlockers.push('BLOCKED_SKILLS_PRESENT');

  const status=packageBlockers.length
    ? 'BLOCKED'
    : counts.REVIEW_REQUIRED>0
      ? 'CONDITIONAL'
      : 'READY_FOR_GOVERNED_ONBOARDING';

  return {
    release:'v80',
    packName:parsed.packName,
    version:parsed.version,
    status,
    baseline:{
      currentSkillCatalog:V75_SKILL_NAMES.length,
      declaredBaseCatalog:parsed.baseCatalogCount,
      publicTools:parsed.publicToolsExpected,
      internalCapabilities:parsed.internalCapabilitiesExpected,
      agents:parsed.agentsExpected,
      consistent:baselineConsistent
    },
    candidates:parsed.candidates.length,
    targetCatalogIfAllEventuallyAccepted:parsed.baseCatalogCount+parsed.candidates.length,
    counts,
    duplicateNames,
    normalizedCollisions,
    packageBlockers,
    evaluations,
    mutationApplied:false,
    executionClaim:false
  } as const;
}

export const v80DuplicatePairSchema=z.object({
  skillA:z.string().min(1),
  skillB:z.string().min(1),
  exactNameCollision:z.boolean().default(false),
  normalizedNameCollision:z.boolean().default(false),
  semanticSimilarity:z.number().min(0).max(1).default(0),
  proceduralSimilarity:z.number().min(0).max(1).default(0),
  purposeSimilarity:z.number().min(0).max(1).default(0),
  outcomeAgreement:z.number().min(0).max(1).default(0),
  evidenceOverlap:z.number().min(0).max(1).default(0),
  coSelectionRate:z.number().min(0).max(1).default(0),
  sampleSize:z.number().int().min(0).default(0),
  specializationDistinct:z.boolean().default(false)
});

export function classifySkillDuplicatePairV80(input:z.input<typeof v80DuplicatePairSchema>){
  const p=v80DuplicatePairSchema.parse(input);
  const exact=p.exactNameCollision||p.normalizedNameCollision||normalizeSkillIdentityV80(p.skillA)===normalizeSkillIdentityV80(p.skillB);
  const staticSimilarity=(p.semanticSimilarity+p.proceduralSimilarity+p.purposeSimilarity)/3;
  const operationalSimilarity=(p.outcomeAgreement+p.evidenceOverlap+p.coSelectionRate)/3;
  const evidenceConfidence=clamp01(p.sampleSize/20);
  const duplicateConfidence=clamp01(
    (0.62*staticSimilarity)+(0.28*operationalSimilarity*evidenceConfidence)+(0.10*evidenceConfidence)
  );

  let classification:'BLOCK_EXACT_DUPLICATE'|'KEEP_SPECIALIZED'|'MERGE_CANDIDATE'|'REVIEW'|'DISTINCT'='DISTINCT';
  let rationale='Similarity is below duplicate-review thresholds.';

  if(exact){
    classification='BLOCK_EXACT_DUPLICATE';
    rationale='Exact or normalized identity collision.';
  } else if(p.specializationDistinct&&staticSimilarity>=0.82){
    classification='KEEP_SPECIALIZED';
    rationale='Strong topical overlap exists, but specialization is explicitly distinct.';
  } else if(
    p.sampleSize>=20 &&
    duplicateConfidence>=0.90 &&
    p.semanticSimilarity>=0.90 &&
    p.proceduralSimilarity>=0.90 &&
    p.purposeSimilarity>=0.88
  ){
    classification='MERGE_CANDIDATE';
    rationale='Static and operational evidence indicate redundant behavior with adequate sample confidence.';
  } else if(
    staticSimilarity>=0.82 ||
    duplicateConfidence>=0.78
  ){
    classification='REVIEW';
    rationale='Similarity warrants independent review, but evidence is insufficient for a merge recommendation.';
  }

  return {
    release:'v80',
    ...p,
    staticSimilarity:round(staticSimilarity),
    operationalSimilarity:round(operationalSimilarity),
    evidenceConfidence:round(evidenceConfidence),
    duplicateConfidence:round(duplicateConfidence),
    classification,
    rationale,
    mutationApplied:false,
    executionClaim:false
  } as const;
}

export const v80RetirementAssessmentSchema=z.object({
  skillName:z.string().min(1),
  currentLifecycle:lifecycleSchema,
  sampleSize:z.number().int().min(0).default(0),
  usageLast30d:z.number().int().min(0).default(0),
  effectivenessScore:z.number().min(0).max(100).default(0),
  regressionRate:z.number().min(0).max(1).default(0),
  failureRate:z.number().min(0).max(1).default(0),
  uniqueValueRemaining:z.boolean().default(true),
  openIncidents:z.number().int().min(0).default(0),
  securityBlocker:z.boolean().default(false),
  replacementName:z.string().min(1).optional(),
  replacementLifecycle:lifecycleSchema.optional(),
  replacementEffectivenessScore:z.number().min(0).max(100).optional(),
  duplicateConfidence:z.number().min(0).max(1).default(0),
  coverageMatch:z.number().min(0).max(1).default(0)
});

export function evaluateSkillRetirementV80(input:z.input<typeof v80RetirementAssessmentSchema>){
  const p=v80RetirementAssessmentSchema.parse(input);
  const reasons:string[]=[];
  const blockers:string[]=[];
  const sufficientSamples=p.sampleSize>=30;
  const replacementReady=
    Boolean(p.replacementName) &&
    p.replacementLifecycle==='STABLE' &&
    (p.replacementEffectivenessScore??0)>=Math.max(80,p.effectivenessScore) &&
    p.coverageMatch>=0.95;

  if(!sufficientSamples) blockers.push('INSUFFICIENT_OPERATIONAL_SAMPLES');
  if(p.openIncidents>0) blockers.push('OPEN_INCIDENTS');
  if(p.securityBlocker) blockers.push('SECURITY_BLOCKER');
  if(!replacementReady) blockers.push('VERIFIED_REPLACEMENT_NOT_READY');
  if(p.uniqueValueRemaining) blockers.push('UNIQUE_VALUE_REMAINS');

  let recommendation:'KEEP'|'CANARY_DOWNGRADE'|'DEPRECATE'|'RETIRE'|'REVIEW'='KEEP';

  if(p.securityBlocker){
    recommendation='REVIEW';
    reasons.push('Security condition requires explicit review; retirement must not hide a security issue.');
  } else if(
    p.currentLifecycle==='DEPRECATED' &&
    p.usageLast30d===0 &&
    p.duplicateConfidence>=0.90 &&
    blockers.length===0
  ){
    recommendation='RETIRE';
    reasons.push('Deprecated skill is unused, redundant, fully covered by a stable replacement, and has sufficient evidence.');
  } else if(
    ['STABLE','CANARY'].includes(p.currentLifecycle) &&
    sufficientSamples &&
    replacementReady &&
    !p.uniqueValueRemaining &&
    p.duplicateConfidence>=0.90 &&
    p.usageLast30d<=5 &&
    p.openIncidents===0
  ){
    recommendation='DEPRECATE';
    reasons.push('A stable higher-quality replacement covers the skill and usage is low.');
  } else if(
    p.currentLifecycle==='STABLE' &&
    sufficientSamples &&
    (p.effectivenessScore<70||p.regressionRate>0.15||p.failureRate>0.15)
  ){
    recommendation='CANARY_DOWNGRADE';
    reasons.push('Measured quality degraded; move to governed CANARY before considering replacement or retirement.');
  } else if(
    p.duplicateConfidence>=0.80 &&
    (!sufficientSamples||!replacementReady)
  ){
    recommendation='REVIEW';
    reasons.push('Redundancy is plausible but retirement evidence is incomplete.');
  } else {
    reasons.push('Current evidence does not justify lifecycle reduction.');
  }

  return {
    release:'v80',
    skillName:p.skillName,
    currentLifecycle:p.currentLifecycle,
    recommendation,
    sufficientSamples,
    replacementReady,
    duplicateConfidence:round(p.duplicateConfidence),
    coverageMatch:round(p.coverageMatch),
    blockers,
    reasons,
    hostAuthorizationRequired:recommendation!=='KEEP',
    mutationApplied:false,
    executionClaim:false
  } as const;
}

export const v80RetirementPortfolioSchema=z.object({
  assessments:z.array(v80RetirementAssessmentSchema).min(1).max(5000)
});

export function buildRetirementPortfolioV80(input:z.input<typeof v80RetirementPortfolioSchema>){
  const parsed=v80RetirementPortfolioSchema.parse(input);
  const results=parsed.assessments.map(item=>evaluateSkillRetirementV80(item));
  const counts={
    KEEP:results.filter(x=>x.recommendation==='KEEP').length,
    CANARY_DOWNGRADE:results.filter(x=>x.recommendation==='CANARY_DOWNGRADE').length,
    DEPRECATE:results.filter(x=>x.recommendation==='DEPRECATE').length,
    RETIRE:results.filter(x=>x.recommendation==='RETIRE').length,
    REVIEW:results.filter(x=>x.recommendation==='REVIEW').length
  };
  return {
    release:'v80',
    assessments:results.length,
    counts,
    actionable:results.filter(x=>x.recommendation!=='KEEP'),
    results,
    mutationApplied:false,
    executionClaim:false
  };
}

export function auditSkillOnboardingGovernanceV80(){
  const good=evaluateSkillOnboardingV80({
    candidate:{
      skillName:'v80-audit-new-specialized-skill',
      packageId:'audit-pack',
      domain:'testing',
      primaryAgent:'qa',
      validatorAgent:'release-auditor',
      handoffAgents:['orchestrator'],
      contractValid:true,
      schemaValid:true,
      securityPass:true,
      provenanceValid:true,
      checksumValid:true,
      agentMappingValid:true,
      capabilityMappingValid:true,
      evidenceContractValid:true,
      behavioralTests:8,
      benchmarkScore:0.95,
      benchmarkCases:30,
      semanticMaxSimilarity:0.62,
      proceduralMaxSimilarity:0.58
    }
  });

  const collision=evaluateSkillOnboardingV80({
    candidate:{
      skillName:V75_SKILL_NAMES[0],
      packageId:'audit-pack',
      primaryAgent:'qa',
      validatorAgent:'release-auditor',
      contractValid:true,
      schemaValid:true,
      securityPass:true,
      provenanceValid:true,
      checksumValid:true,
      agentMappingValid:true,
      capabilityMappingValid:true,
      evidenceContractValid:true,
      behavioralTests:8
    }
  });

  const specialized=classifySkillDuplicatePairV80({
    skillA:'cache-invalidation-diagnostic',
    skillB:'cache-invalidation-recovery',
    semanticSimilarity:0.93,
    proceduralSimilarity:0.86,
    purposeSimilarity:0.90,
    outcomeAgreement:0.82,
    evidenceOverlap:0.75,
    coSelectionRate:0.60,
    sampleSize:30,
    specializationDistinct:true
  });

  const retire=evaluateSkillRetirementV80({
    skillName:'legacy-redundant-skill',
    currentLifecycle:'DEPRECATED',
    sampleSize:60,
    usageLast30d:0,
    effectivenessScore:82,
    regressionRate:0.02,
    failureRate:0.03,
    uniqueValueRemaining:false,
    openIncidents:0,
    securityBlocker:false,
    replacementName:'replacement-skill',
    replacementLifecycle:'STABLE',
    replacementEffectivenessScore:93,
    duplicateConfidence:0.96,
    coverageMatch:0.99
  });

  const unsafeRetire=evaluateSkillRetirementV80({
    skillName:'still-unique-skill',
    currentLifecycle:'DEPRECATED',
    sampleSize:60,
    usageLast30d:0,
    effectivenessScore:82,
    uniqueValueRemaining:true,
    replacementName:'replacement-skill',
    replacementLifecycle:'STABLE',
    replacementEffectivenessScore:93,
    duplicateConfidence:0.96,
    coverageMatch:0.99
  });

  const checks={
    highQualityCandidateCanary:good.recommendation==='CANARY'&&good.onboardingAllowed,
    baselineCollisionBlocked:collision.recommendation==='BLOCKED'&&collision.blockers.includes('EXACT_NAME_COLLISION'),
    specializationPreserved:specialized.classification==='KEEP_SPECIALIZED',
    retirementRequiresStrongEvidence:retire.recommendation==='RETIRE',
    uniqueValuePreventsRetirement:unsafeRetire.recommendation!=='RETIRE',
    catalogBaselineVisible:V75_SKILL_NAMES.length>0,
    agentBaselineStable:V75_AGENT_IDS.length===11
  };
  const failures=Object.entries(checks).filter(([,passed])=>!passed).map(([name])=>name);

  return {
    release:'v80',
    status:failures.length?'FAIL':'PASS',
    checks,
    failures,
    catalogSkills:V75_SKILL_NAMES.length,
    agents:V75_AGENT_IDS.length,
    publicToolSurfaceChange:0,
    internalCapabilityRegistryChange:0,
    additionalGatewayCount:0,
    automaticMutation:false,
    executionClaim:false
  };
}
