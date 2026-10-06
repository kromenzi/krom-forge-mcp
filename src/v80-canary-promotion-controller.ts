import { z } from 'zod';
import { V75_AGENT_IDS, V75_SKILL_NAMES } from './v75-agent-capability-fabric';
import { V80_V42_SHADOW_SEEDS } from './v80-v42-shadow-seeds';
import { V80_PROMOTED_V42_SKILL_NAMES, V80_PROMOTED_V42_SKILL_COUNT } from './v80-promoted-v42-skill-seeds';

const agentSchema=z.enum(V75_AGENT_IDS);
const candidateByName=new Map<string,(typeof V80_V42_SHADOW_SEEDS)[number]>(
  V80_V42_SHADOW_SEEDS.map(item=>[item.n,item])
);
const promotedNameSet=new Set<string>(V80_PROMOTED_V42_SKILL_NAMES);
const promotableSeeds=V80_V42_SHADOW_SEEDS.filter(item=>!promotedNameSet.has(item.n));
const round=(value:number,digits=4)=>Number(value.toFixed(digits));

export const v80PromotionReviewSchema=z.object({
  primary:z.object({agent:agentSchema,status:z.enum(['PASS','FAIL','BLOCKED','UNVERIFIED'])}),
  validator:z.object({agent:agentSchema,status:z.enum(['PASS','FAIL','BLOCKED','UNVERIFIED'])}),
  judge:z.object({agent:agentSchema,status:z.enum(['PASS','FAIL','BLOCKED','UNVERIFIED'])}).optional()
});

export const v80RollbackContractSchema=z.object({
  ready:z.boolean().default(false),
  tested:z.boolean().default(false),
  targetLifecycle:z.enum(['SHADOW','CANARY']).default('SHADOW'),
  evidenceRefs:z.array(z.string().min(1)).max(50).default([])
});

export const v80PromotionReadinessSchema=z.object({
  skillName:z.string().min(1),
  currentLifecycle:z.enum(['SHADOW','CANARY']),
  riskLevel:z.enum(['low','medium','high']).default('low'),
  benchmarkScore:z.number().min(0).max(1),
  benchmarkCases:z.number().int().min(0),
  passRate:z.number().min(0).max(1),
  validatorPassRate:z.number().min(0).max(1),
  evidenceCompletenessRate:z.number().min(0).max(1),
  securityPassRate:z.number().min(0).max(1),
  unsupportedClaimRate:z.number().min(0).max(1).default(0),
  regressionRate:z.number().min(0).max(1).default(0),
  latencyPassRate:z.number().min(0).max(1).default(1),
  evidenceGeneratedAtEpoch:z.number().int().min(0),
  nowEpoch:z.number().int().min(0),
  freshnessWindowSeconds:z.number().int().positive().default(604800),
  review:v80PromotionReviewSchema,
  rollback:v80RollbackContractSchema,
  canaryExposurePercent:z.number().min(0).max(100).default(0),
  canaryObservationHours:z.number().min(0).default(0),
  openCriticalIncidents:z.number().int().min(0).default(0)
});

export type V80PromotionReadinessInput=z.input<typeof v80PromotionReadinessSchema>;

function evaluateReview(input:z.infer<typeof v80PromotionReadinessSchema>){
  const reviewers=[input.review.primary,input.review.validator,...(input.review.judge?[input.review.judge]:[])];
  const distinctAgents=new Set(reviewers.map(item=>item.agent)).size===reviewers.length;
  const basePass=input.review.primary.status==='PASS'&&input.review.validator.status==='PASS';
  const highRiskPass=input.riskLevel!=='high'||(
    Boolean(input.review.judge)&&
    input.review.judge?.status==='PASS'&&
    basePass&&
    distinctAgents
  );
  return {
    basePass,
    highRiskPass,
    judgeRequired:input.riskLevel==='high',
    judgePresent:Boolean(input.review.judge),
    distinctAgents,
    reviewerStatuses:reviewers.map(item=>({agent:item.agent,status:item.status}))
  };
}

export function evaluateV42PromotionReadinessV80(input:V80PromotionReadinessInput){
  const parsed=v80PromotionReadinessSchema.parse(input);
  const seed=candidateByName.get(parsed.skillName);
  if(!seed){
    return {
      release:'v80',
      phase:'canary-promotion-controller',
      status:'NOT_FOUND',
      skillName:parsed.skillName,
      recommendation:'BLOCKED',
      proposedLifecycle:parsed.currentLifecycle,
      blockers:['UNKNOWN_V42_CANDIDATE'],
      promotionApplied:false,
      deploymentApplied:false,
      executable:false,
      stableCatalogMutation:false,
      executionClaim:false
    } as const;
  }
  if(promotedNameSet.has(parsed.skillName)){
    return {
      release:'v80',
      phase:'canary-promotion-controller',
      status:'ALREADY_STABLE',
      skillName:parsed.skillName,
      area:seed.a,
      recommendation:'NONE',
      proposedLifecycle:'STABLE',
      blockers:['ALREADY_PROMOTED_STABLE'],
      promotionApplied:false,
      deploymentApplied:false,
      executable:true,
      stableCatalogCount:V75_SKILL_NAMES.length,
      stableCatalogMutation:false,
      executionClaim:false
    } as const;
  }

  const evidenceAgeSeconds=Math.max(0,parsed.nowEpoch-parsed.evidenceGeneratedAtEpoch);
  const futureEvidence=parsed.evidenceGeneratedAtEpoch>parsed.nowEpoch;
  const evidenceFresh=!futureEvidence&&evidenceAgeSeconds<=parsed.freshnessWindowSeconds;
  const rollbackReady=
    parsed.rollback.ready&&
    parsed.rollback.tested&&
    parsed.rollback.evidenceRefs.length>0&&
    (parsed.currentLifecycle==='SHADOW'
      ? parsed.rollback.targetLifecycle==='SHADOW'
      : ['CANARY','SHADOW'].includes(parsed.rollback.targetLifecycle));

  const review=evaluateReview(parsed);

  const shadowThresholds={
    minimumCases:20,
    benchmarkScore:0.90,
    passRate:0.90,
    validatorPassRate:0.95,
    evidenceCompletenessRate:0.95,
    securityPassRate:1,
    maxUnsupportedClaimRate:0.02,
    maxRegressionRate:0.05,
    latencyPassRate:0.90
  } as const;

  const stableThresholds={
    minimumCases:60,
    benchmarkScore:0.95,
    passRate:0.95,
    validatorPassRate:0.97,
    evidenceCompletenessRate:0.98,
    securityPassRate:1,
    maxUnsupportedClaimRate:0.01,
    maxRegressionRate:0.03,
    latencyPassRate:0.95,
    minimumCanaryExposurePercent:5,
    minimumCanaryObservationHours:24
  } as const;

  const blockers:string[]=[];
  if(!evidenceFresh) blockers.push(futureEvidence?'EVIDENCE_FROM_FUTURE':'STALE_EVIDENCE');
  if(!rollbackReady) blockers.push('ROLLBACK_CONTRACT_NOT_READY');
  if(parsed.openCriticalIncidents>0) blockers.push('OPEN_CRITICAL_INCIDENT');
  if(!review.basePass) blockers.push('PRIMARY_OR_VALIDATOR_NOT_PASS');
  if(parsed.riskLevel==='high'&&!review.judgePresent) blockers.push('HIGH_RISK_JUDGE_REQUIRED');
  if(parsed.riskLevel==='high'&&review.judgePresent&&!review.highRiskPass) blockers.push('HIGH_RISK_REVIEW_NOT_APPROVED');

  if(parsed.currentLifecycle==='SHADOW'){
    if(parsed.benchmarkCases<shadowThresholds.minimumCases) blockers.push('INSUFFICIENT_BENCHMARK_CASES');
    if(parsed.benchmarkScore<shadowThresholds.benchmarkScore) blockers.push('BENCHMARK_SCORE_BELOW_CANARY_THRESHOLD');
    if(parsed.passRate<shadowThresholds.passRate) blockers.push('PASS_RATE_BELOW_CANARY_THRESHOLD');
    if(parsed.validatorPassRate<shadowThresholds.validatorPassRate) blockers.push('VALIDATOR_RATE_BELOW_CANARY_THRESHOLD');
    if(parsed.evidenceCompletenessRate<shadowThresholds.evidenceCompletenessRate) blockers.push('EVIDENCE_COMPLETENESS_BELOW_CANARY_THRESHOLD');
    if(parsed.securityPassRate<shadowThresholds.securityPassRate) blockers.push('SECURITY_GATE_NOT_FULL_PASS');
    if(parsed.unsupportedClaimRate>shadowThresholds.maxUnsupportedClaimRate) blockers.push('UNSUPPORTED_CLAIM_RATE_TOO_HIGH');
    if(parsed.regressionRate>shadowThresholds.maxRegressionRate) blockers.push('REGRESSION_RATE_TOO_HIGH');
    if(parsed.latencyPassRate<shadowThresholds.latencyPassRate) blockers.push('LATENCY_BUDGET_PASS_RATE_TOO_LOW');
  } else {
    if(parsed.benchmarkCases<stableThresholds.minimumCases) blockers.push('INSUFFICIENT_CANARY_CASES');
    if(parsed.benchmarkScore<stableThresholds.benchmarkScore) blockers.push('BENCHMARK_SCORE_BELOW_STABLE_THRESHOLD');
    if(parsed.passRate<stableThresholds.passRate) blockers.push('PASS_RATE_BELOW_STABLE_THRESHOLD');
    if(parsed.validatorPassRate<stableThresholds.validatorPassRate) blockers.push('VALIDATOR_RATE_BELOW_STABLE_THRESHOLD');
    if(parsed.evidenceCompletenessRate<stableThresholds.evidenceCompletenessRate) blockers.push('EVIDENCE_COMPLETENESS_BELOW_STABLE_THRESHOLD');
    if(parsed.securityPassRate<stableThresholds.securityPassRate) blockers.push('SECURITY_GATE_NOT_FULL_PASS');
    if(parsed.unsupportedClaimRate>stableThresholds.maxUnsupportedClaimRate) blockers.push('UNSUPPORTED_CLAIM_RATE_TOO_HIGH');
    if(parsed.regressionRate>stableThresholds.maxRegressionRate) blockers.push('REGRESSION_RATE_TOO_HIGH');
    if(parsed.latencyPassRate<stableThresholds.latencyPassRate) blockers.push('LATENCY_BUDGET_PASS_RATE_TOO_LOW');
    if(parsed.canaryExposurePercent<stableThresholds.minimumCanaryExposurePercent) blockers.push('CANARY_EXPOSURE_TOO_LOW');
    if(parsed.canaryObservationHours<stableThresholds.minimumCanaryObservationHours) blockers.push('CANARY_OBSERVATION_WINDOW_TOO_SHORT');
  }

  const uniqueBlockers=[...new Set(blockers)];
  const promotionReady=uniqueBlockers.length===0;
  const recommendation=
    promotionReady
      ? parsed.currentLifecycle==='SHADOW'?'PROMOTE_CANARY':'PROMOTE_STABLE'
      : 'HOLD';
  const proposedLifecycle=
    promotionReady
      ? parsed.currentLifecycle==='SHADOW'?'CANARY':'STABLE'
      : parsed.currentLifecycle;

  return {
    release:'v80',
    phase:'canary-promotion-controller',
    status:promotionReady?'READY':'BLOCKED',
    skillName:parsed.skillName,
    area:seed.a,
    primaryAgent:seed.p,
    validatorAgent:seed.v,
    currentLifecycle:parsed.currentLifecycle,
    recommendation,
    proposedLifecycle,
    promotionReady,
    blockers:uniqueBlockers,
    gates:{
      evidenceFresh,
      evidenceAgeSeconds,
      freshnessWindowSeconds:parsed.freshnessWindowSeconds,
      rollbackReady,
      review,
      openCriticalIncidents:parsed.openCriticalIncidents
    },
    metrics:{
      benchmarkScore:round(parsed.benchmarkScore),
      benchmarkCases:parsed.benchmarkCases,
      passRate:round(parsed.passRate),
      validatorPassRate:round(parsed.validatorPassRate),
      evidenceCompletenessRate:round(parsed.evidenceCompletenessRate),
      securityPassRate:round(parsed.securityPassRate),
      unsupportedClaimRate:round(parsed.unsupportedClaimRate),
      regressionRate:round(parsed.regressionRate),
      latencyPassRate:round(parsed.latencyPassRate),
      canaryExposurePercent:round(parsed.canaryExposurePercent),
      canaryObservationHours:round(parsed.canaryObservationHours)
    },
    thresholds:parsed.currentLifecycle==='SHADOW'?shadowThresholds:stableThresholds,
    hostAuthorizationRequired:promotionReady,
    promotionApplied:false,
    deploymentApplied:false,
    executable:false,
    stableCatalogCount:V75_SKILL_NAMES.length,
    stableCatalogMutation:false,
    executionClaim:false
  } as const;
}

export const v80PromotionPlanSchema=z.object({
  assessments:z.array(v80PromotionReadinessSchema).min(1).max(500),
  maxPromotions:z.number().int().min(1).max(100).default(25),
  maxPerArea:z.number().int().min(1).max(10).default(2)
});

export function buildV42PromotionPlanV80(input:z.input<typeof v80PromotionPlanSchema>){
  const parsed=v80PromotionPlanSchema.parse(input);
  const duplicateSkills=[...new Set(
    parsed.assessments
      .map(item=>item.skillName)
      .filter((name,index,array)=>array.indexOf(name)!==index)
  )].sort();

  const evaluated=parsed.assessments.map(item=>evaluateV42PromotionReadinessV80(item));
  const ready=evaluated
    .flatMap(item=>item.status==='READY'&&'metrics' in item?[item]:[])
    .sort((a,b)=>{
      const lifecyclePriority=(value:string)=>value==='PROMOTE_STABLE'?2:1;
      return lifecyclePriority(b.recommendation)-lifecyclePriority(a.recommendation)||
        b.metrics.benchmarkScore-a.metrics.benchmarkScore||
        b.metrics.benchmarkCases-a.metrics.benchmarkCases||
        a.skillName.localeCompare(b.skillName);
    });

  const selected:typeof ready=[];
  const perArea=new Map<string,number>();
  for(const item of ready){
    if(selected.length>=parsed.maxPromotions) break;
    const count=perArea.get(item.area)??0;
    if(count>=parsed.maxPerArea) continue;
    selected.push(item);
    perArea.set(item.area,count+1);
  }

  const counts={
    submitted:parsed.assessments.length,
    ready:ready.length,
    selected:selected.length,
    hold:evaluated.filter(item=>item.status==='BLOCKED').length,
    promoteCanary:selected.filter(item=>item.recommendation==='PROMOTE_CANARY').length,
    promoteStable:selected.filter(item=>item.recommendation==='PROMOTE_STABLE').length
  };

  return {
    release:'v80',
    phase:'canary-promotion-controller',
    status:duplicateSkills.length?'CONDITIONAL':'PASS',
    duplicateSkills,
    counts,
    selected,
    held:evaluated.filter(item=>item.status==='BLOCKED'),
    notSelectedReady:ready.filter(item=>!selected.some(selectedItem=>selectedItem.skillName===item.skillName)),
    hostAuthorizationRequired:selected.length>0,
    authorizationScope:selected.map(item=>({
      skillName:item.skillName,
      from:item.currentLifecycle,
      to:item.proposedLifecycle
    })),
    promotionApplied:false,
    deploymentApplied:false,
    executable:false,
    stableCatalogCount:V75_SKILL_NAMES.length,
    stableCatalogMutation:false,
    executionClaim:false
  } as const;
}

export function auditV42PromotionControllerV80(){
  const auditSeedA=promotableSeeds[0]??V80_V42_SHADOW_SEEDS[0];
  const auditSeedB=promotableSeeds[1]??V80_V42_SHADOW_SEEDS[1];
  const base={
    skillName:auditSeedA.n,
    currentLifecycle:'SHADOW' as const,
    riskLevel:'medium' as const,
    benchmarkScore:0.97,
    benchmarkCases:40,
    passRate:0.97,
    validatorPassRate:0.98,
    evidenceCompletenessRate:1,
    securityPassRate:1,
    unsupportedClaimRate:0,
    regressionRate:0.01,
    latencyPassRate:0.98,
    evidenceGeneratedAtEpoch:1000,
    nowEpoch:1100,
    freshnessWindowSeconds:1000,
    review:{
      primary:{agent:'architect' as const,status:'PASS' as const},
      validator:{agent:'qa' as const,status:'PASS' as const}
    },
    rollback:{
      ready:true,
      tested:true,
      targetLifecycle:'SHADOW' as const,
      evidenceRefs:['rollback:test']
    },
    openCriticalIncidents:0
  };

  const canary=evaluateV42PromotionReadinessV80(base);
  const stale=evaluateV42PromotionReadinessV80({...base,nowEpoch:5000});
  const noRollback=evaluateV42PromotionReadinessV80({...base,rollback:{...base.rollback,ready:false}});
  const highRiskNoJudge=evaluateV42PromotionReadinessV80({...base,riskLevel:'high'});
  const highRiskApproved=evaluateV42PromotionReadinessV80({
    ...base,
    riskLevel:'high',
    review:{
      primary:{agent:'security',status:'PASS'},
      validator:{agent:'qa',status:'PASS'},
      judge:{agent:'release-auditor',status:'PASS'}
    }
  });
  const stable=evaluateV42PromotionReadinessV80({
    ...base,
    currentLifecycle:'CANARY',
    benchmarkScore:0.98,
    benchmarkCases:80,
    passRate:0.98,
    validatorPassRate:0.99,
    evidenceCompletenessRate:1,
    unsupportedClaimRate:0,
    regressionRate:0.01,
    latencyPassRate:0.99,
    canaryExposurePercent:10,
    canaryObservationHours:48,
    rollback:{
      ready:true,
      tested:true,
      targetLifecycle:'CANARY',
      evidenceRefs:['rollback:stable-test']
    }
  });

  const plan=buildV42PromotionPlanV80({
    assessments:[base,{
      ...base,
      skillName:auditSeedB.n,
      benchmarkScore:0.60
    }],
    maxPromotions:5,
    maxPerArea:5
  });

  const checks={
    qualifiedShadowRecommendsCanary:canary.status==='READY'&&canary.recommendation==='PROMOTE_CANARY',
    staleEvidenceBlocks:stale.status==='BLOCKED'&&stale.blockers.includes('STALE_EVIDENCE'),
    rollbackRequired:noRollback.status==='BLOCKED'&&noRollback.blockers.includes('ROLLBACK_CONTRACT_NOT_READY'),
    highRiskJudgeRequired:highRiskNoJudge.status==='BLOCKED'&&highRiskNoJudge.blockers.includes('HIGH_RISK_JUDGE_REQUIRED'),
    highRiskThreePartyPass:highRiskApproved.status==='READY'&&highRiskApproved.recommendation==='PROMOTE_CANARY',
    qualifiedCanaryRecommendsStable:stable.status==='READY'&&stable.recommendation==='PROMOTE_STABLE',
    planSelectsOnlyReady:plan.counts.selected===1&&plan.selected[0]?.skillName===base.skillName,
    noAutomaticPromotion:!plan.promotionApplied&&!plan.deploymentApplied&&!plan.executable,
    stableCatalogPreserved:plan.stableCatalogCount===1465+V80_PROMOTED_V42_SKILL_COUNT&&!plan.stableCatalogMutation
  };
  const failures=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
  return {
    release:'v80',
    phase:'canary-promotion-controller',
    status:failures.length?'FAIL':'PASS',
    checks,
    failures,
    executionClaim:false
  } as const;
}
