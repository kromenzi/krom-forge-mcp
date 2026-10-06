import { z } from 'zod';
import { V75_SKILL_NAMES } from './v75-agent-capability-fabric';
import { V80_V42_SHADOW_SEEDS } from './v80-v42-shadow-seeds';
import {
  V80_PROMOTED_V42_SKILL_NAMES,
  V80_PROMOTED_V42_SKILL_COUNT
} from './v80-promoted-v42-skill-seeds';
import {
  selectV42CanaryCohortV80,
  v80V42CanarySelectionSchema
} from './v80-v42-shadow-registry';

const stableSkillCount=V75_SKILL_NAMES.length;
const promotedNameSet=new Set<string>(V80_PROMOTED_V42_SKILL_NAMES);
const activeShadowSeeds=V80_V42_SHADOW_SEEDS.filter(item=>!promotedNameSet.has(item.n));
const shadowByName=new Map<string,(typeof V80_V42_SHADOW_SEEDS)[number]>(
  activeShadowSeeds.map(item=>[item.n,item])
);
const candidateNames=new Set<string>(V80_V42_SHADOW_SEEDS.map(item=>item.n));
const round=(value:number,digits=4)=>Number(value.toFixed(digits));
const ratio=(num:number,den:number)=>den?num/den:0;

export const v80ShadowBenchmarkCaseSchema=z.object({
  caseId:z.string().min(1),
  skillName:z.string().min(1),
  outcome:z.enum(['PASS','FAIL','BLOCKED']),
  evidenceRefs:z.array(z.string().min(1)).max(50).default([]),
  validatorPass:z.boolean().default(false),
  securityPass:z.boolean().default(false),
  unsupportedClaim:z.boolean().default(false),
  regressionDetected:z.boolean().default(false),
  latencyMs:z.number().min(0).default(0),
  latencyBudgetMs:z.number().positive().default(10000),
  semanticSimilarity:z.number().min(0).max(1).default(0),
  proceduralSimilarity:z.number().min(0).max(1).default(0),
  specializationDistinct:z.boolean().default(true),
  sourceRef:z.string().min(1).optional()
});

export type V80ShadowBenchmarkCase=z.infer<typeof v80ShadowBenchmarkCaseSchema>;

export const v80ShadowBenchmarkRunSchema=z.object({
  benchmarkId:z.string().min(1),
  results:z.array(v80ShadowBenchmarkCaseSchema).min(1).max(20000),
  minimumCasesPerSkill:z.number().int().min(1).default(20),
  canaryBenchmarkThreshold:z.number().min(0.5).max(1).default(0.90),
  maxCanaryCandidates:z.number().int().min(1).max(100).default(25),
  maxCanaryPerArea:z.number().int().min(1).max(10).default(2),
  similarityReviewThreshold:z.number().min(0.75).max(0.99).default(0.90),
  maxRegressionRate:z.number().min(0).max(0.5).default(0.05)
});

function aggregateSkillBenchmark(skillName:string,cases:V80ShadowBenchmarkCase[]){
  const seed=shadowByName.get(skillName);
  if(!seed) return null;

  const total=cases.length;
  const passCount=cases.filter(item=>item.outcome==='PASS').length;
  const failCount=cases.filter(item=>item.outcome==='FAIL').length;
  const blockedCount=cases.filter(item=>item.outcome==='BLOCKED').length;
  const validatorPassCount=cases.filter(item=>item.validatorPass).length;
  const evidenceCompleteCount=cases.filter(item=>item.evidenceRefs.length>0).length;
  const securityPassCount=cases.filter(item=>item.securityPass).length;
  const unsupportedClaimCount=cases.filter(item=>item.unsupportedClaim).length;
  const regressionCount=cases.filter(item=>item.regressionDetected).length;
  const latencyPassCount=cases.filter(item=>item.latencyMs<=item.latencyBudgetMs).length;
  const sourceBoundCount=cases.filter(item=>Boolean(item.sourceRef)).length;

  const passRate=ratio(passCount,total);
  const validatorPassRate=ratio(validatorPassCount,total);
  const evidenceCompletenessRate=ratio(evidenceCompleteCount,total);
  const securityPassRate=ratio(securityPassCount,total);
  const supportedClaimRate=1-ratio(unsupportedClaimCount,total);
  const regressionRate=ratio(regressionCount,total);
  const latencyPassRate=ratio(latencyPassCount,total);
  const sourceBoundRate=ratio(sourceBoundCount,total);

  const rawScore=
    (0.34*passRate)+
    (0.18*validatorPassRate)+
    (0.14*evidenceCompletenessRate)+
    (0.12*securityPassRate)+
    (0.10*supportedClaimRate)+
    (0.07*latencyPassRate)+
    (0.05*sourceBoundRate);

  const regressionPenalty=Math.min(0.25,regressionRate*0.75);
  const benchmarkScore=Math.max(0,Math.min(1,rawScore-regressionPenalty));
  const semanticMaxSimilarity=Math.max(0,...cases.map(item=>item.semanticSimilarity));
  const proceduralMaxSimilarity=Math.max(0,...cases.map(item=>item.proceduralSimilarity));
  const specializationDistinct=cases.every(item=>item.specializationDistinct);

  return {
    skillName,
    area:seed.a,
    primaryAgent:seed.p,
    validatorAgent:seed.v,
    cases:total,
    passCount,
    failCount,
    blockedCount,
    passRate:round(passRate),
    validatorPassRate:round(validatorPassRate),
    evidenceCompletenessRate:round(evidenceCompletenessRate),
    securityPassRate:round(securityPassRate),
    supportedClaimRate:round(supportedClaimRate),
    regressionRate:round(regressionRate),
    latencyPassRate:round(latencyPassRate),
    sourceBoundRate:round(sourceBoundRate),
    benchmarkScore:round(benchmarkScore),
    semanticMaxSimilarity:round(semanticMaxSimilarity),
    proceduralMaxSimilarity:round(proceduralMaxSimilarity),
    specializationDistinct,
    evidenceComplete:evidenceCompletenessRate>=0.95,
    validatorPass:validatorPassRate>=0.95,
    securityPass:securityPassRate===1,
    executionClaim:false
  };
}

export function evaluateV42ShadowBenchmarkV80(input:z.input<typeof v80ShadowBenchmarkRunSchema>){
  const parsed=v80ShadowBenchmarkRunSchema.parse(input);
  const unknownSkillNames=[...new Set(
    parsed.results
      .map(item=>item.skillName)
      .filter(name=>!candidateNames.has(name))
  )].sort();
  const alreadyPromotedSkillNames=[...new Set(
    parsed.results
      .map(item=>item.skillName)
      .filter(name=>promotedNameSet.has(name))
  )].sort();

  const duplicateCaseIds=[...new Set(
    parsed.results
      .map(item=>item.caseId)
      .filter((id,index,array)=>array.indexOf(id)!==index)
  )].sort();

  const accepted=parsed.results.filter(item=>shadowByName.has(item.skillName));
  const grouped=new Map<string,V80ShadowBenchmarkCase[]>();
  for(const item of accepted){
    grouped.set(item.skillName,[...(grouped.get(item.skillName)??[]),item]);
  }

  const reports=[...grouped.entries()]
    .map(([skillName,cases])=>aggregateSkillBenchmark(skillName,cases))
    .filter((item):item is NonNullable<typeof item>=>Boolean(item))
    .sort((a,b)=>b.benchmarkScore-a.benchmarkScore||b.cases-a.cases||a.skillName.localeCompare(b.skillName));

  const canaryEvidence=reports.map(report=>({
    skillName:report.skillName,
    benchmarkScore:report.benchmarkScore,
    benchmarkCases:report.cases,
    semanticMaxSimilarity:report.semanticMaxSimilarity,
    proceduralMaxSimilarity:report.proceduralMaxSimilarity,
    specializationDistinct:report.specializationDistinct,
    evidenceComplete:report.evidenceComplete,
    validatorPass:report.validatorPass,
    regressionRate:report.regressionRate,
    securityPass:report.securityPass
  }));

  const canary=selectV42CanaryCohortV80(v80V42CanarySelectionSchema.parse({
    evidence:canaryEvidence,
    maxCandidates:parsed.maxCanaryCandidates,
    maxPerArea:parsed.maxCanaryPerArea,
    benchmarkThreshold:parsed.canaryBenchmarkThreshold,
    minimumBenchmarkCases:parsed.minimumCasesPerSkill,
    similarityReviewThreshold:parsed.similarityReviewThreshold,
    maxRegressionRate:parsed.maxRegressionRate
  }));

  const insufficientSamples=reports
    .filter(item=>item.cases<parsed.minimumCasesPerSkill)
    .map(item=>item.skillName);

  const failureTaxonomy={
    testFailures:reports.reduce((sum,item)=>sum+item.failCount,0),
    blockedCases:reports.reduce((sum,item)=>sum+item.blockedCount,0),
    missingEvidenceCases:accepted.filter(item=>item.evidenceRefs.length===0).length,
    validatorFailures:accepted.filter(item=>!item.validatorPass).length,
    securityFailures:accepted.filter(item=>!item.securityPass).length,
    unsupportedClaims:accepted.filter(item=>item.unsupportedClaim).length,
    regressions:accepted.filter(item=>item.regressionDetected).length,
    latencyBudgetMisses:accepted.filter(item=>item.latencyMs>item.latencyBudgetMs).length,
    missingSourceRefs:accepted.filter(item=>!item.sourceRef).length
  };

  const status =
    unknownSkillNames.length||alreadyPromotedSkillNames.length||duplicateCaseIds.length
      ? 'CONDITIONAL'
      : 'PASS';

  return {
    release:'v80',
    phase:'shadow-benchmark-runner',
    benchmarkId:parsed.benchmarkId,
    status,
    sourceMode:'SUPPLIED_RESULTS_ONLY',
    externalExecutionPerformed:false,
    stableCatalogCount:stableSkillCount,
    shadowCandidateCount:activeShadowSeeds.length,
    promotedCandidateCount:V80_PROMOTED_V42_SKILL_COUNT,
    submittedCases:parsed.results.length,
    acceptedCases:accepted.length,
    evaluatedSkills:reports.length,
    unknownSkillNames,
    alreadyPromotedSkillNames,
    duplicateCaseIds,
    insufficientSamples,
    failureTaxonomy,
    reports,
    canaryRecommendation:{
      selectedCount:canary.selectedCount,
      selected:canary.selected,
      eligibleCount:canary.eligibleCount,
      hostAuthorizationRequired:canary.hostAuthorizationRequired,
      promotionApplied:false,
      executable:false
    },
    stableCatalogMutation:false,
    executionClaim:false
  } as const;
}

export const v80ShadowBenchmarkReportSchema=z.object({
  benchmarkId:z.string().min(1),
  skillName:z.string().min(1),
  results:z.array(v80ShadowBenchmarkCaseSchema).min(1).max(20000)
});

export function getV42ShadowBenchmarkReportV80(input:z.input<typeof v80ShadowBenchmarkReportSchema>){
  const parsed=v80ShadowBenchmarkReportSchema.parse(input);
  if(promotedNameSet.has(parsed.skillName)){
    return {
      release:'v80',
      phase:'shadow-benchmark-runner',
      benchmarkId:parsed.benchmarkId,
      status:'ALREADY_PROMOTED',
      skillName:parsed.skillName,
      lifecycle:'STABLE',
      executable:true,
      executionClaim:false
    } as const;
  }
  if(!shadowByName.has(parsed.skillName)){
    return {
      release:'v80',
      phase:'shadow-benchmark-runner',
      benchmarkId:parsed.benchmarkId,
      status:'NOT_FOUND',
      skillName:parsed.skillName,
      executionClaim:false
    } as const;
  }
  const cases=parsed.results.filter(item=>item.skillName===parsed.skillName);
  if(!cases.length){
    return {
      release:'v80',
      phase:'shadow-benchmark-runner',
      benchmarkId:parsed.benchmarkId,
      status:'NO_RESULTS',
      skillName:parsed.skillName,
      lifecycle:'SHADOW',
      executable:false,
      executionClaim:false
    } as const;
  }
  const report=aggregateSkillBenchmark(parsed.skillName,cases);
  return {
    release:'v80',
    phase:'shadow-benchmark-runner',
    benchmarkId:parsed.benchmarkId,
    status:'FOUND',
    lifecycle:'SHADOW',
    executable:false,
    report,
    executionClaim:false
  } as const;
}

export function auditV42ShadowBenchmarkRunnerV80(){
  const candidates=activeShadowSeeds.slice(0,2);
  const skillA=candidates[0]?.n;
  const skillB=candidates[1]?.n;
  if(!skillA||!skillB){
    return {
      release:'v80',
      phase:'shadow-benchmark-runner',
      status:'PASS',
      checks:{noRemainingShadowCandidates:true},
      failures:[],
      executionClaim:false
    } as const;
  }

  const results:V80ShadowBenchmarkCase[]=[];

  for(let i=0;i<24;i++){
    results.push({
      caseId:'audit-a-'+i,
      skillName:skillA,
      outcome:'PASS',
      evidenceRefs:['evidence:a:'+i],
      validatorPass:true,
      securityPass:true,
      unsupportedClaim:false,
      regressionDetected:false,
      latencyMs:800,
      latencyBudgetMs:5000,
      semanticSimilarity:0.55,
      proceduralSimilarity:0.62,
      specializationDistinct:true,
      sourceRef:'fixture:a:'+i
    });
  }

  for(let i=0;i<24;i++){
    results.push({
      caseId:'audit-b-'+i,
      skillName:skillB,
      outcome:i<12?'PASS':'FAIL',
      evidenceRefs:i<18?['evidence:b:'+i]:[],
      validatorPass:i<16,
      securityPass:true,
      unsupportedClaim:i>=20,
      regressionDetected:i>=18,
      latencyMs:i<20?1000:7000,
      latencyBudgetMs:5000,
      semanticSimilarity:0.60,
      proceduralSimilarity:0.68,
      specializationDistinct:true,
      sourceRef:i<20?'fixture:b:'+i:undefined
    });
  }

  const run=evaluateV42ShadowBenchmarkV80({
    benchmarkId:'v80-phase5-audit',
    results,
    minimumCasesPerSkill:20,
    canaryBenchmarkThreshold:0.90,
    maxCanaryCandidates:5,
    maxCanaryPerArea:5
  });
  const report=getV42ShadowBenchmarkReportV80({
    benchmarkId:'v80-phase5-audit',
    skillName:skillA,
    results
  });
  const unknown=evaluateV42ShadowBenchmarkV80({
    benchmarkId:'v80-phase5-unknown',
    results:[{
      caseId:'unknown-1',
      skillName:'not-a-v42-shadow-skill',
      outcome:'PASS',
      evidenceRefs:['evidence:unknown'],
      validatorPass:true,
      securityPass:true
    }]
  });

  const expectedStableCount=1465+V80_PROMOTED_V42_SKILL_COUNT;
  const checks={
    stableCatalogAligned:run.stableCatalogCount===expectedStableCount&&!run.stableCatalogMutation,
    shadowRegistryCount:run.shadowCandidateCount===500-V80_PROMOTED_V42_SKILL_COUNT,
    suppliedResultsOnly:run.sourceMode==='SUPPLIED_RESULTS_ONLY'&&!run.externalExecutionPerformed,
    aggregatesTwoSkills:run.evaluatedSkills===2,
    strongSkillRanksAboveWeak:(run.reports[0]?.skillName===skillA),
    strongSkillCanaryRecommended:run.canaryRecommendation.selected.some(item=>item.skillName===skillA),
    weakSkillNotCanary:!run.canaryRecommendation.selected.some(item=>item.skillName===skillB),
    canaryNonExecutable:!run.canaryRecommendation.executable&&!run.canaryRecommendation.promotionApplied,
    reportBounded:report.status==='FOUND'&&report.lifecycle==='SHADOW'&&!report.executable,
    unknownSkillFlagged:unknown.status==='CONDITIONAL'&&unknown.unknownSkillNames.includes('not-a-v42-shadow-skill')
  };
  const failures=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);
  return {
    release:'v80',
    phase:'shadow-benchmark-runner',
    status:failures.length?'FAIL':'PASS',
    checks,
    failures,
    executionClaim:false
  } as const;
}
