import { z } from 'zod';
import { V75_SKILL_NAMES } from './v75-agent-capability-fabric';
import { V80_V42_SHADOW_SEEDS } from './v80-v42-shadow-seeds';
import {
  V80_PROMOTED_V42_SKILL_NAMES,
  V80_PROMOTED_V42_SKILL_COUNT
} from './v80-promoted-v42-skill-seeds';
import {
  buildV42RealBenchmarkManifestV80,
  verifyV42RealBenchmarkReceiptsV80,
  v80HostBenchmarkReceiptSchema,
  v80RealBenchmarkManifestSchema
} from './v80-real-benchmark-evidence-pipeline';
import {
  evaluateV42ShadowBenchmarkV80,
  type V80ShadowBenchmarkCase
} from './v80-shadow-benchmark-runner';

const promotedNameSet=new Set<string>(V80_PROMOTED_V42_SKILL_NAMES);
const shadowSeeds=V80_V42_SHADOW_SEEDS.filter(seed=>!promotedNameSet.has(seed.n));
const shadowByName=new Map<string,(typeof V80_V42_SHADOW_SEEDS)[number]>(shadowSeeds.map(seed=>[seed.n,seed]));

const v80CampaignScenarioSchema=z.object({
  scenarioId:z.string().min(1),
  scenarioRef:z.string().min(1),
  areas:z.array(z.string().min(1)).min(1).max(100),
  expectedEvidenceKinds:z.array(z.string().min(1)).min(1).max(25),
  latencyBudgetMs:z.number().positive().default(10000),
  enabled:z.boolean().default(true)
});

const v80CampaignCoverageHintSchema=z.object({
  skillName:z.string().min(1),
  verifiedRealCases:z.number().int().min(0).default(0)
});

export const v80PlanRealBenchmarkCampaignSchema=z.object({
  campaignId:z.string().min(1),
  scenarioBank:z.array(v80CampaignScenarioSchema).min(1).max(5000),
  requestedSkillNames:z.array(z.string().min(1)).max(500).optional(),
  existingCoverage:z.array(v80CampaignCoverageHintSchema).max(500).default([]),
  targetCasesPerSkill:z.number().int().min(1).max(200).default(20),
  maxSkills:z.number().int().min(1).max(100).default(25),
  casesPerSkill:z.number().int().min(1).max(20).default(4),
  maxTotalCases:z.number().int().min(1).max(2000).default(500)
});

function scenarioAppliesToArea(areas:string[],area:string){
  return areas.includes('*')||areas.includes(area);
}

export function planV42RealBenchmarkCampaignV80(input:z.input<typeof v80PlanRealBenchmarkCampaignSchema>){
  const parsed=v80PlanRealBenchmarkCampaignSchema.parse(input);
  const duplicateScenarioIds=[...new Set(
    parsed.scenarioBank
      .map(item=>item.scenarioId)
      .filter((id,index,items)=>items.indexOf(id)!==index)
  )].sort();
  const duplicateRequestedSkills=[...new Set(
    (parsed.requestedSkillNames??[])
      .filter((name,index,items)=>items.indexOf(name)!==index)
  )].sort();
  const duplicateCoverageSkills=[...new Set(
    parsed.existingCoverage
      .map(item=>item.skillName)
      .filter((name,index,items)=>items.indexOf(name)!==index)
  )].sort();

  const requestedNames=parsed.requestedSkillNames??shadowSeeds.map(seed=>seed.n);
  const unknownRequestedSkills=[...new Set(
    requestedNames.filter(name=>!V80_V42_SHADOW_SEEDS.some(seed=>seed.n===name))
  )].sort();
  const alreadyPromotedRequestedSkills=[...new Set(
    requestedNames.filter(name=>promotedNameSet.has(name))
  )].sort();

  const blockers:string[]=[];
  if(duplicateScenarioIds.length) blockers.push('DUPLICATE_SCENARIO_IDS');
  if(duplicateRequestedSkills.length) blockers.push('DUPLICATE_REQUESTED_SKILLS');
  if(duplicateCoverageSkills.length) blockers.push('DUPLICATE_COVERAGE_SKILLS');
  if(unknownRequestedSkills.length) blockers.push('UNKNOWN_REQUESTED_SKILLS');
  if(alreadyPromotedRequestedSkills.length) blockers.push('ALREADY_PROMOTED_REQUESTED_SKILLS');

  if(blockers.length){
    return {
      release:'v80',
      phase:'real-benchmark-campaign-orchestrator',
      status:'BLOCKED',
      campaignId:parsed.campaignId,
      blockers,
      duplicateScenarioIds,
      duplicateRequestedSkills,
      duplicateCoverageSkills,
      unknownRequestedSkills,
      alreadyPromotedRequestedSkills,
      selectedSkills:[],
      manifest:null,
      plannedCases:0,
      executionPerformed:false,
      externalExecutionPerformedByOrchestrator:false,
      promotionApplied:false,
      repositoryMutationApplied:false,
      runtimeCatalogMutationApplied:false,
      deploymentMutationApplied:false,
      executionClaim:false
    } as const;
  }

  const coverage=new Map(parsed.existingCoverage.map(item=>[item.skillName,item.verifiedRealCases]));
  const enabledScenarios=parsed.scenarioBank.filter(item=>item.enabled);

  const ranked=requestedNames
    .map(name=>shadowByName.get(name))
    .filter((seed):seed is NonNullable<typeof seed>=>Boolean(seed))
    .filter(seed=>(coverage.get(seed.n)??0)<parsed.targetCasesPerSkill)
    .sort((a,b)=>
      (coverage.get(a.n)??0)-(coverage.get(b.n)??0)||
      a.a.localeCompare(b.a)||
      a.n.localeCompare(b.n)
    );

  const selectedSeeds=ranked.slice(0,parsed.maxSkills);
  const manifestRequests:Array<{
    caseId:string;
    skillName:string;
    scenarioId:string;
    scenarioRef:string;
    expectedEvidenceKinds:string[];
    latencyBudgetMs:number;
  }>=[];
  const scenarioGaps:Array<{skillName:string;area:string;reason:string}>=[];
  const skillPlans:Array<{
    skillName:string;
    area:string;
    currentVerifiedCases:number;
    targetVerifiedCases:number;
    plannedCases:number;
    distinctPlannedScenarios:number;
  }>=[];

  for(const seed of selectedSeeds){
    if(manifestRequests.length>=parsed.maxTotalCases) break;
    const current=coverage.get(seed.n)??0;
    const needed=Math.max(0,parsed.targetCasesPerSkill-current);
    const allocation=Math.min(parsed.casesPerSkill,needed,parsed.maxTotalCases-manifestRequests.length);
    const scenarios=enabledScenarios
      .filter(scenario=>scenarioAppliesToArea(scenario.areas,seed.a))
      .sort((a,b)=>a.scenarioId.localeCompare(b.scenarioId));

    if(!scenarios.length){
      scenarioGaps.push({skillName:seed.n,area:seed.a,reason:'NO_APPLICABLE_SCENARIO'});
      continue;
    }

    const usedScenarioIds=new Set<string>();
    for(let index=0;index<allocation;index++){
      const scenario=scenarios[index%scenarios.length];
      usedScenarioIds.add(scenario.scenarioId);
      manifestRequests.push({
        caseId:`${parsed.campaignId}::${seed.n}::${String(current+index+1).padStart(3,'0')}::${scenario.scenarioId}`,
        skillName:seed.n,
        scenarioId:scenario.scenarioId,
        scenarioRef:scenario.scenarioRef,
        expectedEvidenceKinds:scenario.expectedEvidenceKinds,
        latencyBudgetMs:scenario.latencyBudgetMs
      });
    }
    skillPlans.push({
      skillName:seed.n,
      area:seed.a,
      currentVerifiedCases:current,
      targetVerifiedCases:parsed.targetCasesPerSkill,
      plannedCases:allocation,
      distinctPlannedScenarios:usedScenarioIds.size
    });
  }

  if(!manifestRequests.length){
    return {
      release:'v80',
      phase:'real-benchmark-campaign-orchestrator',
      status:scenarioGaps.length?'BLOCKED':'NO_WORK',
      campaignId:parsed.campaignId,
      blockers:scenarioGaps.length?['NO_PLANNABLE_CASES']:[],
      duplicateScenarioIds:[],
      duplicateRequestedSkills:[],
      duplicateCoverageSkills:[],
      unknownRequestedSkills:[],
      alreadyPromotedRequestedSkills:[],
      scenarioGaps,
      selectedSkills:skillPlans,
      manifest:null,
      plannedCases:0,
      executionPerformed:false,
      externalExecutionPerformedByOrchestrator:false,
      promotionApplied:false,
      repositoryMutationApplied:false,
      runtimeCatalogMutationApplied:false,
      deploymentMutationApplied:false,
      executionClaim:false
    } as const;
  }

  const manifest=buildV42RealBenchmarkManifestV80({
    benchmarkId:parsed.campaignId,
    cases:manifestRequests
  });

  const areaDistribution:Record<string,number>={};
  for(const plan of skillPlans){
    areaDistribution[plan.area]=(areaDistribution[plan.area]??0)+plan.plannedCases;
  }

  return {
    release:'v80',
    phase:'real-benchmark-campaign-orchestrator',
    status:scenarioGaps.length?'CONDITIONAL':'READY_FOR_HOST_EXECUTION',
    campaignId:parsed.campaignId,
    blockers:[],
    duplicateScenarioIds:[],
    duplicateRequestedSkills:[],
    duplicateCoverageSkills:[],
    unknownRequestedSkills:[],
    alreadyPromotedRequestedSkills:[],
    scenarioGaps,
    selectedSkills:skillPlans,
    selectedSkillCount:skillPlans.length,
    plannedCases:manifest.caseCount,
    areaDistribution:Object.fromEntries(Object.entries(areaDistribution).sort(([a],[b])=>a.localeCompare(b))),
    manifest,
    executionPerformed:false,
    externalExecutionPerformedByOrchestrator:false,
    promotionApplied:false,
    repositoryMutationApplied:false,
    runtimeCatalogMutationApplied:false,
    deploymentMutationApplied:false,
    executionClaim:false
  } as const;
}

const v80CampaignEvidenceBatchSchema=z.object({
  manifest:v80RealBenchmarkManifestSchema,
  receipts:z.array(v80HostBenchmarkReceiptSchema).min(1).max(20000)
});

export const v80BuildRealBenchmarkCampaignStatusSchema=z.object({
  campaignId:z.string().min(1),
  batches:z.array(v80CampaignEvidenceBatchSchema).min(1).max(500),
  targetVerifiedCasesPerSkill:z.number().int().min(1).max(200).default(20),
  minimumDistinctScenarios:z.number().int().min(1).max(20).default(3),
  minimumDistinctSources:z.number().int().min(1).max(20).default(2),
  canaryBenchmarkThreshold:z.number().min(0.5).max(1).default(0.90),
  maxPromotionQueue:z.number().int().min(1).max(100).default(25),
  maxQueuePerArea:z.number().int().min(1).max(10).default(2),
  similarityReviewThreshold:z.number().min(0.75).max(0.99).default(0.90),
  maxRegressionRate:z.number().min(0).max(0.5).default(0.05)
});

export function buildV42RealBenchmarkCampaignStatusV80(input:z.input<typeof v80BuildRealBenchmarkCampaignStatusSchema>){
  const parsed=v80BuildRealBenchmarkCampaignStatusSchema.parse(input);
  const verifiedRecords:Array<{
    benchmarkId:string;
    caseId:string;
    skillName:string;
    scenarioId:string;
    sourceRef:string;
    hostExecutionId:string;
    receiptDigest:string;
    benchmarkCase:V80ShadowBenchmarkCase;
  }>=[];
  const rejectedBatches:Array<{benchmarkId:string;status:string;rejectedReceipts:number}>=[];
  const duplicateReceiptDigests:string[]=[];
  const duplicateHostExecutionIds:string[]=[];
  const seenReceiptDigests=new Set<string>();
  const seenHostExecutionIds=new Set<string>();

  for(const batch of parsed.batches){
    const verification=verifyV42RealBenchmarkReceiptsV80({
      manifest:batch.manifest,
      receipts:batch.receipts,
      requireAllManifestCases:false
    });
    if(verification.status==='BLOCKED'||verification.rejectedReceipts){
      rejectedBatches.push({
        benchmarkId:batch.manifest.benchmarkId,
        status:verification.status,
        rejectedReceipts:verification.rejectedReceipts
      });
    }

    if(verification.status==='BLOCKED') continue;
    const manifestByCaseId=new Map(batch.manifest.cases.map(item=>[item.caseId,item]));
    for(const evaluation of verification.evaluations){
      if(!evaluation.verified) continue;
      const receipt=evaluation.receipt;
      const expected=manifestByCaseId.get(receipt.caseId);
      if(!expected) continue;

      if(seenReceiptDigests.has(evaluation.receiptDigest)){
        duplicateReceiptDigests.push(evaluation.receiptDigest);
        continue;
      }
      if(seenHostExecutionIds.has(receipt.hostExecutionId)){
        duplicateHostExecutionIds.push(receipt.hostExecutionId);
        continue;
      }
      seenReceiptDigests.add(evaluation.receiptDigest);
      seenHostExecutionIds.add(receipt.hostExecutionId);

      verifiedRecords.push({
        benchmarkId:batch.manifest.benchmarkId,
        caseId:receipt.caseId,
        skillName:receipt.skillName,
        scenarioId:expected.scenarioId,
        sourceRef:receipt.sourceRef,
        hostExecutionId:receipt.hostExecutionId,
        receiptDigest:evaluation.receiptDigest,
        benchmarkCase:{
          caseId:receipt.caseId,
          skillName:receipt.skillName,
          outcome:receipt.outcome,
          evidenceRefs:[
            ...receipt.evidenceRefs,
            'host-execution:'+receipt.hostExecutionId,
            'receipt-digest:'+evaluation.receiptDigest
          ],
          validatorPass:receipt.validatorPass,
          securityPass:receipt.securityPass,
          unsupportedClaim:receipt.unsupportedClaim,
          regressionDetected:receipt.regressionDetected,
          latencyMs:receipt.latencyMs,
          latencyBudgetMs:expected.latencyBudgetMs,
          semanticSimilarity:receipt.semanticSimilarity,
          proceduralSimilarity:receipt.proceduralSimilarity,
          specializationDistinct:receipt.specializationDistinct,
          sourceRef:receipt.sourceRef
        }
      });
    }
  }

  const benchmark=verifiedRecords.length
    ? evaluateV42ShadowBenchmarkV80({
        benchmarkId:parsed.campaignId,
        results:verifiedRecords.map(item=>item.benchmarkCase),
        minimumCasesPerSkill:parsed.targetVerifiedCasesPerSkill,
        canaryBenchmarkThreshold:parsed.canaryBenchmarkThreshold,
        maxCanaryCandidates:parsed.maxPromotionQueue,
        maxCanaryPerArea:parsed.maxQueuePerArea,
        similarityReviewThreshold:parsed.similarityReviewThreshold,
        maxRegressionRate:parsed.maxRegressionRate
      })
    : null;

  const reportBySkill=new Map((benchmark?.reports??[]).map(report=>[report.skillName,report]));
  const selectedByBenchmark=new Set<string>((benchmark?.canaryRecommendation.selected??[]).map(item=>item.skillName));
  const recordsBySkill=new Map<string,typeof verifiedRecords>();
  for(const record of verifiedRecords){
    recordsBySkill.set(record.skillName,[...(recordsBySkill.get(record.skillName)??[]),record]);
  }

  const coverage=[...recordsBySkill.entries()].map(([skillName,records])=>{
    const seed=shadowByName.get(skillName);
    const report=reportBySkill.get(skillName);
    const distinctScenarios=new Set(records.map(item=>item.scenarioId)).size;
    const distinctSources=new Set(records.map(item=>item.sourceRef)).size;
    const distinctHostExecutions=new Set(records.map(item=>item.hostExecutionId)).size;
    const blockers:string[]=[];

    if(records.length<parsed.targetVerifiedCasesPerSkill) blockers.push('INSUFFICIENT_VERIFIED_REAL_CASES');
    if(distinctScenarios<parsed.minimumDistinctScenarios) blockers.push('INSUFFICIENT_SCENARIO_DIVERSITY');
    if(distinctSources<parsed.minimumDistinctSources) blockers.push('INSUFFICIENT_SOURCE_DIVERSITY');
    if(!report) blockers.push('NO_PHASE5_BENCHMARK_REPORT');
    if(report&&report.benchmarkScore<parsed.canaryBenchmarkThreshold) blockers.push('BENCHMARK_SCORE_BELOW_THRESHOLD');
    if(report&&!report.evidenceComplete) blockers.push('EVIDENCE_COMPLETENESS_BELOW_THRESHOLD');
    if(report&&!report.validatorPass) blockers.push('VALIDATOR_RATE_BELOW_THRESHOLD');
    if(report&&!report.securityPass) blockers.push('SECURITY_GATE_NOT_FULL_PASS');
    if(!selectedByBenchmark.has(skillName)) blockers.push('NOT_SELECTED_BY_PHASE5_CANARY_GATE');

    return {
      skillName,
      area:seed?.a??'unknown',
      primaryAgent:seed?.p??'unknown',
      validatorAgent:seed?.v??'unknown',
      verifiedRealCases:records.length,
      distinctScenarios,
      distinctSources,
      distinctHostExecutions,
      benchmarkScore:report?.benchmarkScore??0,
      passRate:report?.passRate??0,
      regressionRate:report?.regressionRate??0,
      evidenceComplete:report?.evidenceComplete??false,
      validatorPass:report?.validatorPass??false,
      securityPass:report?.securityPass??false,
      promotionReviewEligible:blockers.length===0,
      blockers
    };
  }).sort((a,b)=>
    Number(b.promotionReviewEligible)-Number(a.promotionReviewEligible)||
    b.benchmarkScore-a.benchmarkScore||
    b.verifiedRealCases-a.verifiedRealCases||
    a.skillName.localeCompare(b.skillName)
  );

  const promotionReviewQueue=coverage
    .filter(item=>item.promotionReviewEligible)
    .slice(0,parsed.maxPromotionQueue);

  const underCovered=coverage.filter(item=>!item.promotionReviewEligible);
  const totalShadow=shadowSeeds.length;
  const skillsWithVerifiedEvidence=coverage.length;

  return {
    release:'v80',
    phase:'real-benchmark-campaign-orchestrator',
    status:
      rejectedBatches.length||duplicateReceiptDigests.length||duplicateHostExecutionIds.length
        ? 'CONDITIONAL'
        : verifiedRecords.length
          ? 'PASS'
          : 'NO_VERIFIED_HOST_EVIDENCE',
    campaignId:parsed.campaignId,
    stableCatalogCount:V75_SKILL_NAMES.length,
    promotedV42Count:V80_PROMOTED_V42_SKILL_COUNT,
    remainingShadowCount:totalShadow,
    batchCount:parsed.batches.length,
    verifiedRealCases:verifiedRecords.length,
    rejectedBatches,
    duplicateReceiptDigests:[...new Set(duplicateReceiptDigests)].sort(),
    duplicateHostExecutionIds:[...new Set(duplicateHostExecutionIds)].sort(),
    skillsWithVerifiedEvidence,
    coverage,
    underCovered,
    promotionReviewQueue,
    promotionReviewQueueCount:promotionReviewQueue.length,
    benchmark,
    executionPerformedByOrchestrator:false,
    promotionApplied:false,
    repositoryMutationApplied:false,
    runtimeCatalogMutationApplied:false,
    deploymentMutationApplied:false,
    executionClaim:false
  } as const;
}

export function auditV42RealBenchmarkCampaignOrchestratorV80(){
  const candidates=shadowSeeds.slice(0,2);
  const first=candidates[0];
  const second=candidates[1];
  if(!first||!second){
    return {
      release:'v80',
      phase:'real-benchmark-campaign-orchestrator',
      status:'PASS',
      checks:{noRemainingShadowCandidates:true},
      failures:[],
      executionClaim:false
    } as const;
  }

  const scenarioBank=[
    {
      scenarioId:'audit-scenario-a',
      scenarioRef:'audit://scenario/a',
      areas:['*'],
      expectedEvidenceKinds:['result','validator','security'],
      latencyBudgetMs:5000
    },
    {
      scenarioId:'audit-scenario-b',
      scenarioRef:'audit://scenario/b',
      areas:['*'],
      expectedEvidenceKinds:['result','validator','security'],
      latencyBudgetMs:5000
    },
    {
      scenarioId:'audit-scenario-c',
      scenarioRef:'audit://scenario/c',
      areas:['*'],
      expectedEvidenceKinds:['result','validator','security'],
      latencyBudgetMs:5000
    }
  ];

  const planInput={
    campaignId:'v80-phase10-plan-audit',
    scenarioBank,
    requestedSkillNames:[first.n,second.n],
    targetCasesPerSkill:20,
    maxSkills:2,
    casesPerSkill:4,
    maxTotalCases:8
  };
  const planA=planV42RealBenchmarkCampaignV80(planInput);
  const planB=planV42RealBenchmarkCampaignV80(planInput);

  const evidenceManifest=buildV42RealBenchmarkManifestV80({
    benchmarkId:'v80-phase10-evidence-audit',
    cases:Array.from({length:20},(_,index)=>{
      const scenario=scenarioBank[index%scenarioBank.length];
      return {
        caseId:'audit-real-'+String(index+1).padStart(2,'0'),
        skillName:first.n,
        scenarioId:scenario.scenarioId,
        scenarioRef:scenario.scenarioRef,
        expectedEvidenceKinds:scenario.expectedEvidenceKinds,
        latencyBudgetMs:scenario.latencyBudgetMs
      };
    })
  });

  const receipts=evidenceManifest.cases.map((manifestCase,index)=>({
    benchmarkId:evidenceManifest.benchmarkId,
    caseId:manifestCase.caseId,
    skillName:manifestCase.skillName,
    manifestCaseDigest:manifestCase.caseDigest,
    hostExecutionId:'audit-host-'+String(index+1).padStart(2,'0'),
    evidenceOrigin:'HOST_EXECUTION' as const,
    executionPerformed:true,
    sourceRef:index%2===0?'host://audit/source/a':'host://audit/source/b',
    evidenceRefs:[
      'audit:evidence:result:'+index,
      'audit:evidence:validator:'+index,
      'audit:evidence:security:'+index
    ],
    evidenceKinds:['result','validator','security'],
    outcome:'PASS' as const,
    validatorPass:true,
    securityPass:true,
    unsupportedClaim:false,
    regressionDetected:false,
    latencyMs:800,
    semanticSimilarity:0.55,
    proceduralSimilarity:0.62,
    specializationDistinct:true,
    hostAttestation:'phase10-audit-host-attestation'
  }));

  const status=buildV42RealBenchmarkCampaignStatusV80({
    campaignId:'v80-phase10-evidence-audit',
    batches:[{manifest:evidenceManifest,receipts}],
    targetVerifiedCasesPerSkill:20,
    minimumDistinctScenarios:3,
    minimumDistinctSources:2,
    canaryBenchmarkThreshold:0.90,
    maxPromotionQueue:5,
    maxQueuePerArea:5
  });

  const checks={
    planReady:planA.status==='READY_FOR_HOST_EXECUTION'&&planA.plannedCases===8,
    deterministicPlan:Boolean(planA.manifest&&planB.manifest&&planA.manifest.manifestDigest===planB.manifest.manifestDigest),
    balancedAllocation:planA.selectedSkills.length===2&&planA.selectedSkills.every(item=>item.plannedCases===4),
    plannerDoesNotExecute:!planA.executionPerformed&&!planA.externalExecutionPerformedByOrchestrator,
    verifiedCoverageTracked:status.verifiedRealCases===20&&status.skillsWithVerifiedEvidence===1,
    diversityEnforced:status.coverage[0]?.distinctScenarios===3&&status.coverage[0]?.distinctSources===2,
    qualifiedSkillQueued:status.promotionReviewQueueCount===1&&status.promotionReviewQueue[0]?.skillName===first.n,
    noMutation:!status.promotionApplied&&!status.repositoryMutationApplied&&!status.runtimeCatalogMutationApplied&&!status.deploymentMutationApplied,
    realStableCatalogPreserved:status.stableCatalogCount===1465+V80_PROMOTED_V42_SKILL_COUNT
  };
  const failures=Object.entries(checks).filter(([,ok])=>!ok).map(([name])=>name);

  return {
    release:'v80',
    phase:'real-benchmark-campaign-orchestrator',
    status:failures.length?'FAIL':'PASS',
    checks,
    failures,
    executionClaim:false
  } as const;
}
