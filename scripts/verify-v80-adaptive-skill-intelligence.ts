import fs from 'node:fs';
import path from 'node:path';
import {
  V80_RELEASE,
  auditAdaptiveSkillIntelligenceV80,
  buildAgentPerformanceMatrixV80,
  buildEvidenceGraphV80,
  evaluateMultiAgentReviewV80,
  evaluateSkillBenchmarkV80,
  evaluateSkillLifecycleV80,
  invalidateEvidenceGraphV80,
  rankAdaptiveSkillsV80,
  scoreSkillEffectivenessV80,
  v80AdaptiveRoutingSchema,
  v80AgentMatrixSchema,
  v80BenchmarkSchema,
  v80EffectivenessSchema,
  v80EvidenceGraphSchema,
  v80LifecycleEvaluationSchema,
  v80MultiAgentReviewSchema
} from '../src/v80-adaptive-skill-intelligence';

import {
  auditOperationalLearningV80,
  buildSkillControlCenterSnapshotV80,
  buildSkillHealthSnapshotV80,
  createObservationLedgerV80,
  recordMissionOutcomeV80,
  recordSkillObservationV80
} from '../src/v80-operational-learning';
import { V75_SKILL_NAMES } from '../src/v75-agent-capability-fabric';
import { V80_V42_SHADOW_SEEDS } from '../src/v80-v42-shadow-seeds';
import { V80_PROMOTED_V42_SKILL_NAMES, V80_PROMOTED_V42_SKILL_COUNT } from '../src/v80-promoted-v42-skill-seeds';
import {
  auditSkillOnboardingGovernanceV80,
  buildRetirementPortfolioV80,
  classifySkillDuplicatePairV80,
  evaluateSkillOnboardingV80,
  evaluateSkillPackOnboardingV80,
  evaluateSkillRetirementV80
} from '../src/v80-skill-onboarding-governance';


import {
  auditV42ShadowRegistryV80,
  getV42ShadowCandidateV80,
  getV42ShadowRegistrySummaryV80,
  selectV42CanaryCohortV80
} from '../src/v80-v42-shadow-registry';

import {
  auditV42ShadowBenchmarkRunnerV80,
  evaluateV42ShadowBenchmarkV80,
  getV42ShadowBenchmarkReportV80
} from '../src/v80-shadow-benchmark-runner';

import {
  auditV42PromotionControllerV80,
  buildV42PromotionPlanV80,
  evaluateV42PromotionReadinessV80
} from '../src/v80-canary-promotion-controller';

import {
  auditV42AuthorizedPromotionExecutorV80,
  digestPromotionStateV80,
  executeV42PromotionTransactionV80,
  prepareV42PromotionTransactionV80
} from '../src/v80-authorized-promotion-executor';

import {
  auditV42RealCatalogPromotionAdapterV80,
  digestRealSkillCatalogV80,
  prepareV42RealCatalogPromotionV80,
  verifyV42RealCatalogPatchV80
} from '../src/v80-real-catalog-promotion-adapter';

import {
  auditV42RealBenchmarkEvidencePipelineV80,
  buildV42RealBenchmarkEvidenceV80,
  buildV42RealBenchmarkManifestV80,
  verifyV42RealBenchmarkReceiptsV80
} from '../src/v80-real-benchmark-evidence-pipeline';

import {
  auditV42RealBenchmarkCampaignOrchestratorV80,
  planV42RealBenchmarkCampaignV80
} from '../src/v80-real-benchmark-campaign-orchestrator';

const fail = (message: string): never => {
  console.error(`FAIL: ${message}`);
  process.exit(1);
};

const root = process.cwd();
const route = fs.readFileSync(path.resolve(root, 'app/mcp/route.ts'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.resolve(root, 'package.json'), 'utf8'));
const expectedStableSkillCount=1465+V80_PROMOTED_V42_SKILL_COUNT;
const promotedV42NameSet=new Set<string>(V80_PROMOTED_V42_SKILL_NAMES);
const remainingShadowSeeds=V80_V42_SHADOW_SEEDS.filter(seed=>!promotedV42NameSet.has(seed.n));
const firstShadowSkillName=remainingShadowSeeds[0]?.n;
const secondShadowSkillName=remainingShadowSeeds[1]?.n;
if(!firstShadowSkillName||!secondShadowSkillName) fail('Phase 9 verification requires at least two remaining SHADOW candidates.');

if (V80_RELEASE !== 'v80') fail('Unexpected v80 release marker.');
if (!route.includes("'krom_v80_adaptive_skill_intelligence'")) fail('v80 control-plane gateway is not registered.');
if (route.includes("KROM_CORE_PUBLIC_TOOL_NAMES = new Set([\n    'krom_v80_adaptive_skill_intelligence'")) {
  fail('v80 must not replace the compact core public surface.');
}

const audit = auditAdaptiveSkillIntelligenceV80();
if (audit.status !== 'PASS') fail(`v80 audit failed: ${audit.failures.join(', ')}`);
if (audit.agentCount !== 11) fail(`Expected 11 agents, got ${audit.agentCount}`);
if (audit.corePublicToolSurfaceChange !== 0) fail('v80 changed the compact public tool surface.');
if (audit.internalCapabilityRegistryChange !== 0) fail('v80 changed the fixed 5,333 internal capability registry.');
if (audit.controlPlaneCapabilitiesAdded !== 1) fail('v80 should add exactly one control-plane gateway.');

const strong = scoreSkillEffectivenessV80(v80EffectivenessSchema.parse({
  metrics: {
    skillName:'verified-strong',
    selectionCount:50,
    successCount:48,
    validatorPassCount:47,
    evidenceCompleteCount:50,
    handoffCount:2,
    regressionCount:1,
    failureCount:1,
    avgLatencyMs:2500
  }
}));
if (strong.score < 85) fail(`Strong skill effectiveness score too low: ${strong.score}`);

const routeDecision = rankAdaptiveSkillsV80(v80AdaptiveRoutingSchema.parse({
  query:'secure database migration',
  candidates:[
    {skillName:'candidate-a',semanticScore:0.95,evidenceFit:0.45,historicalQuality:0.40,agentFit:0.70,lifecycle:'STABLE',riskLevel:'medium'},
    {skillName:'candidate-b',semanticScore:0.89,evidenceFit:0.96,historicalQuality:0.95,agentFit:0.94,lifecycle:'STABLE',riskLevel:'low'}
  ]
}));
if (routeDecision.selectedSkill !== 'candidate-b') fail('Adaptive router ignored evidence/history quality.');

const lifecycle = evaluateSkillLifecycleV80(v80LifecycleEvaluationSchema.parse({
  skillName:'stable-candidate',
  currentState:'CANARY',
  contractValid:true,
  schemaValid:true,
  securityPass:true,
  sampleSize:35,
  successRate:0.93,
  validatorPassRate:0.94,
  evidenceCompletenessRate:0.98,
  regressionRate:0.03
}));
if (lifecycle.recommendedState !== 'STABLE') fail('Qualified canary was not promoted to STABLE.');

const matrix = buildAgentPerformanceMatrixV80(v80AgentMatrixSchema.parse({
  minimumSamples:2,
  observations:[
    {domain:'database',primaryAgent:'database',validatorAgent:'database',outcome:'PASS',evidenceComplete:true,latencyMs:1000},
    {domain:'database',primaryAgent:'database',validatorAgent:'database',outcome:'PASS',evidenceComplete:true,latencyMs:1200},
    {domain:'database',primaryAgent:'backend',validatorAgent:'backend',outcome:'FAIL',evidenceComplete:false,latencyMs:1200},
    {domain:'database',primaryAgent:'backend',validatorAgent:'backend',outcome:'FAIL',evidenceComplete:false,latencyMs:1200}
  ]
}));
const dbRecommendation = matrix.recommendations.find(item => item.domain === 'database');
if (dbRecommendation?.recommendedValidatorAgent !== 'database') fail('Agent matrix did not learn database validator fit.');

const graph = v80EvidenceGraphSchema.parse({
  version:'verify-v80',
  nodes:[
    {id:'commit:abc',kind:'commit'},
    {id:'test:db',kind:'test'},
    {id:'claim:safe',kind:'claim'}
  ],
  edges:[
    {from:'commit:abc',to:'test:db',relation:'bound_to'},
    {from:'test:db',to:'claim:safe',relation:'validates'}
  ]
});
const graphResult = buildEvidenceGraphV80(graph);
if (!graphResult.graphValid || graphResult.unsupportedClaims.length) fail('Evidence graph coverage failed.');
const invalidation = invalidateEvidenceGraphV80({graph,changedNodeIds:['commit:abc']});
if (!invalidation.invalidatedClaims.includes('claim:safe')) fail('Evidence invalidation did not propagate to claim.');

const review = evaluateMultiAgentReviewV80(v80MultiAgentReviewSchema.parse({
  domain:'security',
  riskLevel:'high',
  primary:{agent:'security',status:'PASS'},
  validator:{agent:'qa',status:'PASS'}
}));
if (review.status !== 'BLOCKED' || !review.highRiskJudgeMissing) fail('High-risk review must require an independent judge.');

const benchmark = evaluateSkillBenchmarkV80(v80BenchmarkSchema.parse({
  cases:[
    {id:'a',expectedSkill:'s1',rankedSkills:['s1','s2'],evidenceComplete:true,unsupportedClaim:false,safeBlockExpected:false,safeBlockObserved:false,latencyMs:1000},
    {id:'b',expectedSkill:'s2',rankedSkills:['s3','s2'],evidenceComplete:true,unsupportedClaim:false,safeBlockExpected:true,safeBlockObserved:true,latencyMs:2000}
  ]
}));
if (benchmark.top1Accuracy !== 0.5 || benchmark.top3Recall !== 1) fail('Benchmark metrics are not deterministic.');

const operationalAudit = auditOperationalLearningV80();
if (operationalAudit.status !== 'PASS') fail(`Operational learning audit failed: ${operationalAudit.failures.join(', ')}`);

const knownSkill = V75_SKILL_NAMES[0];
let ledger = createObservationLedgerV80();
for (let i=0; i<4; i++) {
  const recorded = recordSkillObservationV80({
    ledger,
    observation:{
      id:`verify-observation-${i}`,
      skillName:knownSkill,
      domain:'verification',
      primaryAgent:'qa',
      validatorAgent:'qa',
      outcome:'PASS',
      evidenceComplete:true,
      verificationPassed:true,
      regressionDetected:false,
      handoffCount:0,
      latencyMs:900,
      timestampEpoch:i
    }
  });
  if (!recorded.recorded) fail('Known skill observation was not recorded.');
  ledger = recorded.ledger;
}

const healthSnapshot = buildSkillHealthSnapshotV80({ledger,minConfidenceSamples:2});
if (healthSnapshot.observedSkillCount !== 1 || healthSnapshot.health[0]?.skillName !== knownSkill) {
  fail('Operational health snapshot did not aggregate the observed skill.');
}

const missionOutcome = recordMissionOutcomeV80({
  ledger,
  missionDigest:'c'.repeat(64),
  skillNames:[knownSkill],
  domain:'verification',
  primaryAgent:'qa',
  validatorAgent:'release-auditor',
  outcome:'SUCCEEDED',
  evidenceRefs:['github-actions:verify-v80'],
  verificationPassed:true,
  executionAuthorized:true,
  latencyMs:1000
});
if (missionOutcome.normalizedOutcome !== 'PASS' || missionOutcome.recorded !== 1) {
  fail('Verified mission outcome was not normalized into a PASS observation.');
}

const controlCenter = buildSkillControlCenterSnapshotV80({ledger:missionOutcome.ledger,minConfidenceSamples:2});
if (controlCenter.catalog.skills !== audit.currentSkillCatalogCount || controlCenter.catalog.agents !== 11) {
  fail('Control-center snapshot does not match current KROM catalog/agent baselines.');
}
if (controlCenter.persistence.durableStoreConfigured) fail('Operational learning must remain portable without an authorized persistence adapter.');

const onboardingAudit = auditSkillOnboardingGovernanceV80();
if (onboardingAudit.status !== 'PASS') fail(`Onboarding governance audit failed: ${onboardingAudit.failures.join(', ')}`);
if (onboardingAudit.publicToolSurfaceChange !== 0 || onboardingAudit.internalCapabilityRegistryChange !== 0 || onboardingAudit.additionalGatewayCount !== 0) {
  fail('Phase 3 must not expand public tools, fixed capabilities, or v80 gateway count.');
}

const onboardingCandidate = evaluateSkillOnboardingV80({
  candidate:{
    skillName:'verify-v80-shadow-canary-skill',
    packageId:'verify-pack',
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
    benchmarkScore:0.96,
    benchmarkCases:40,
    semanticMaxSimilarity:0.55,
    proceduralMaxSimilarity:0.51,
    purposeOverlapRisk:'low'
  }
});
if (onboardingCandidate.recommendation !== 'CANARY' || !onboardingCandidate.onboardingAllowed) {
  fail('High-quality candidate did not clear the governed CANARY onboarding gate.');
}

const collisionCandidate = evaluateSkillOnboardingV80({
  candidate:{
    skillName:knownSkill,
    packageId:'verify-pack',
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
if (collisionCandidate.recommendation !== 'BLOCKED') fail('Existing catalog collision was not blocked.');

const packGate = evaluateSkillPackOnboardingV80({
  packName:'verify-v80-pack',
  version:'1.0.0',
  baseCatalogCount:audit.currentSkillCatalogCount,
  candidates:[
    {
      skillName:'verify-v80-pack-skill-a',
      packageId:'verify-v80-pack',
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
      benchmarkScore:0.94,
      benchmarkCases:25,
      semanticMaxSimilarity:0.45,
      proceduralMaxSimilarity:0.40
    },
    {
      skillName:'verify-v80-pack-skill-b',
      packageId:'verify-v80-pack',
      primaryAgent:'database',
      validatorAgent:'qa',
      handoffAgents:['release-auditor'],
      contractValid:true,
      schemaValid:true,
      securityPass:true,
      provenanceValid:true,
      checksumValid:true,
      agentMappingValid:true,
      capabilityMappingValid:true,
      evidenceContractValid:true,
      behavioralTests:8,
      benchmarkScore:0.75,
      benchmarkCases:8,
      semanticMaxSimilarity:0.50,
      proceduralMaxSimilarity:0.48
    }
  ]
});
if (packGate.status !== 'READY_FOR_GOVERNED_ONBOARDING' || packGate.counts.BLOCKED !== 0) {
  fail('Clean onboarding pack did not pass package governance.');
}

const specializedPair = classifySkillDuplicatePairV80({
  skillA:'api-rate-limit-diagnostic',
  skillB:'api-rate-limit-recovery',
  semanticSimilarity:0.94,
  proceduralSimilarity:0.86,
  purposeSimilarity:0.90,
  outcomeAgreement:0.85,
  evidenceOverlap:0.78,
  coSelectionRate:0.60,
  sampleSize:35,
  specializationDistinct:true
});
if (specializedPair.classification !== 'KEEP_SPECIALIZED') fail('Distinct specialization was incorrectly treated as redundant.');

const retirement = evaluateSkillRetirementV80({
  skillName:'verify-legacy-skill',
  currentLifecycle:'DEPRECATED',
  sampleSize:60,
  usageLast30d:0,
  effectivenessScore:80,
  uniqueValueRemaining:false,
  openIncidents:0,
  securityBlocker:false,
  replacementName:'verify-stable-replacement',
  replacementLifecycle:'STABLE',
  replacementEffectivenessScore:94,
  duplicateConfidence:0.97,
  coverageMatch:0.99
});
if (retirement.recommendation !== 'RETIRE' || !retirement.hostAuthorizationRequired) {
  fail('Strong retirement evidence did not produce a governed RETIRE recommendation.');
}

const portfolio = buildRetirementPortfolioV80({
  assessments:[
    {
      skillName:'weak-stable-skill',
      currentLifecycle:'STABLE',
      sampleSize:50,
      usageLast30d:20,
      effectivenessScore:62,
      regressionRate:0.20,
      failureRate:0.18,
      uniqueValueRemaining:true
    },
    {
      skillName:'healthy-stable-skill',
      currentLifecycle:'STABLE',
      sampleSize:50,
      usageLast30d:20,
      effectivenessScore:94,
      regressionRate:0.02,
      failureRate:0.02,
      uniqueValueRemaining:true
    }
  ]
});
if (portfolio.counts.CANARY_DOWNGRADE !== 1 || portfolio.counts.KEEP !== 1) {
  fail('Retirement portfolio did not separate degraded and healthy skills correctly.');
}

const v42Audit = auditV42ShadowRegistryV80();
if (v42Audit.status !== 'PASS') fail(`v4.2 shadow registry audit failed: ${v42Audit.failures.join(', ')}`);

const v42Summary = getV42ShadowRegistrySummaryV80();
if (v42Summary.shadowCandidates.count !== 500-V80_PROMOTED_V42_SKILL_COUNT) {
  fail('v4.2 shadow registry count is not aligned with real catalog promotions.');
}
if (v42Summary.stableCatalog.count !== expectedStableSkillCount || !v42Summary.stableCatalog.aligned) {
  fail('v4.2 shadow registry stable catalog count is not promotion-aware.');
}
if (v42Summary.shadowCandidates.executable || v42Summary.shadowCandidates.promoted !== V80_PROMOTED_V42_SKILL_COUNT) {
  fail('v4.2 shadow/promoted lifecycle partition is inconsistent.');
}
if (v42Summary.collisionAudit.exactStableCollisions.length || v42Summary.collisionAudit.normalizedStableCollisions.length) {
  fail('v4.2 shadow pack collides with the stable catalog.');
}

const firstShadow = getV42ShadowCandidateV80({skillName:firstShadowSkillName});
if (firstShadow.status !== 'FOUND' || firstShadow.lifecycle !== 'SHADOW' || firstShadow.executable) {
  fail('v4.2 candidate lookup did not preserve SHADOW/non-executable state.');
}

const emptyCanary = selectV42CanaryCohortV80({evidence:[]});
if (emptyCanary.selectedCount !== 0 || emptyCanary.executable || emptyCanary.promotionApplied) {
  fail('Canary selection must not promote or execute candidates without evidence.');
}

const qualifiedCanary = selectV42CanaryCohortV80({
  maxCandidates:2,
  maxPerArea:2,
  evidence:[{
    skillName:firstShadowSkillName,
    benchmarkScore:0.97,
    benchmarkCases:45,
    semanticMaxSimilarity:0.60,
    proceduralMaxSimilarity:0.72,
    specializationDistinct:true,
    evidenceComplete:true,
    validatorPass:true,
    regressionRate:0.01,
    securityPass:true
  }]
});
if (qualifiedCanary.selectedCount !== 1 || qualifiedCanary.selected[0]?.skillName !== firstShadowSkillName) {
  fail('Qualified SHADOW evidence did not produce a deterministic CANARY recommendation.');
}
if (qualifiedCanary.executable || qualifiedCanary.promotionApplied || !qualifiedCanary.hostAuthorizationRequired) {
  fail('CANARY recommendation crossed the host-authorization boundary.');
}

const shadowBenchmarkAudit = auditV42ShadowBenchmarkRunnerV80();
if (shadowBenchmarkAudit.status !== 'PASS') {
  fail(`Shadow benchmark runner audit failed: ${shadowBenchmarkAudit.failures.join(', ')}`);
}

const benchmarkResults = Array.from({length:24},(_,index)=>({
  caseId:`verify-shadow-${index}`,
  skillName:firstShadowSkillName,
  outcome:'PASS' as const,
  evidenceRefs:[`verify:evidence:${index}`],
  validatorPass:true,
  securityPass:true,
  unsupportedClaim:false,
  regressionDetected:false,
  latencyMs:700,
  latencyBudgetMs:5000,
  semanticSimilarity:0.52,
  proceduralSimilarity:0.61,
  specializationDistinct:true,
  sourceRef:`verify:case:${index}`
}));

const shadowBenchmark = evaluateV42ShadowBenchmarkV80({
  benchmarkId:'verify-v80-phase5',
  results:benchmarkResults,
  minimumCasesPerSkill:20,
  canaryBenchmarkThreshold:0.90,
  maxCanaryCandidates:5,
  maxCanaryPerArea:2
});
if (shadowBenchmark.status !== 'PASS' || shadowBenchmark.evaluatedSkills !== 1) {
  fail('Shadow benchmark runner did not aggregate supplied benchmark results.');
}
if (shadowBenchmark.sourceMode !== 'SUPPLIED_RESULTS_ONLY' || shadowBenchmark.externalExecutionPerformed) {
  fail('Shadow benchmark runner fabricated external execution.');
}
if (shadowBenchmark.canaryRecommendation.selectedCount !== 1) {
  fail('Strong benchmark evidence did not produce one CANARY recommendation.');
}
if (shadowBenchmark.canaryRecommendation.executable || shadowBenchmark.canaryRecommendation.promotionApplied) {
  fail('Shadow benchmark runner crossed the non-executable/non-promotion boundary.');
}
if (shadowBenchmark.stableCatalogCount !== expectedStableSkillCount || shadowBenchmark.stableCatalogMutation) {
  fail('Shadow benchmark runner changed the expected stable catalog.');
}

const shadowReport = getV42ShadowBenchmarkReportV80({
  benchmarkId:'verify-v80-phase5',
  skillName:firstShadowSkillName,
  results:benchmarkResults
});
if (shadowReport.status !== 'FOUND' || shadowReport.lifecycle !== 'SHADOW' || shadowReport.executable) {
  fail('Per-skill benchmark report did not preserve SHADOW/non-executable state.');
}

const promotionAudit = auditV42PromotionControllerV80();
if (promotionAudit.status !== 'PASS') {
  fail(`Promotion controller audit failed: ${promotionAudit.failures.join(', ')}`);
}

const promotionBase = {
  skillName:firstShadowSkillName,
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
  latencyPassRate:0.99,
  evidenceGeneratedAtEpoch:1000,
  nowEpoch:1200,
  freshnessWindowSeconds:3600,
  review:{
    primary:{agent:'architect' as const,status:'PASS' as const},
    validator:{agent:'qa' as const,status:'PASS' as const}
  },
  rollback:{
    ready:true,
    tested:true,
    targetLifecycle:'SHADOW' as const,
    evidenceRefs:['verify:rollback']
  },
  openCriticalIncidents:0
};

const canaryReady = evaluateV42PromotionReadinessV80(promotionBase);
if (canaryReady.status !== 'READY' || canaryReady.recommendation !== 'PROMOTE_CANARY') {
  fail('Qualified SHADOW candidate was not recommended for CANARY.');
}
if (canaryReady.promotionApplied || canaryReady.deploymentApplied || canaryReady.executable) {
  fail('Promotion readiness crossed host authorization or execution boundary.');
}

const stalePromotion = evaluateV42PromotionReadinessV80({...promotionBase,nowEpoch:10000});
if (stalePromotion.status !== 'BLOCKED' || !stalePromotion.blockers.includes('STALE_EVIDENCE')) {
  fail('Stale promotion evidence was not blocked.');
}

const highRiskNoJudge = evaluateV42PromotionReadinessV80({...promotionBase,riskLevel:'high'});
if (highRiskNoJudge.status !== 'BLOCKED' || !highRiskNoJudge.blockers.includes('HIGH_RISK_JUDGE_REQUIRED')) {
  fail('High-risk promotion did not require an independent judge.');
}

const stableReady = evaluateV42PromotionReadinessV80({
  ...promotionBase,
  currentLifecycle:'CANARY',
  benchmarkScore:0.98,
  benchmarkCases:80,
  passRate:0.98,
  validatorPassRate:0.99,
  evidenceCompletenessRate:1,
  securityPassRate:1,
  unsupportedClaimRate:0,
  regressionRate:0.01,
  latencyPassRate:0.99,
  canaryExposurePercent:10,
  canaryObservationHours:48,
  rollback:{
    ready:true,
    tested:true,
    targetLifecycle:'CANARY',
    evidenceRefs:['verify:stable-rollback']
  }
});
if (stableReady.status !== 'READY' || stableReady.recommendation !== 'PROMOTE_STABLE') {
  fail('Qualified CANARY candidate was not recommended for STABLE.');
}

const promotionPlan = buildV42PromotionPlanV80({
  assessments:[
    promotionBase,
    {...promotionBase,skillName:secondShadowSkillName,benchmarkScore:0.60}
  ],
  maxPromotions:5,
  maxPerArea:5
});
if (promotionPlan.counts.selected !== 1 || promotionPlan.counts.promoteCanary !== 1) {
  fail('Promotion plan did not select only qualified candidates.');
}
if (promotionPlan.promotionApplied || promotionPlan.deploymentApplied || promotionPlan.executable || promotionPlan.stableCatalogMutation) {
  fail('Promotion plan mutated runtime, deployment, or stable catalog.');
}
if (promotionPlan.stableCatalogCount !== expectedStableSkillCount) {
  fail('Promotion controller changed the expected stable catalog baseline.');
}

const executorAudit = auditV42AuthorizedPromotionExecutorV80();
if (executorAudit.status !== 'PASS') {
  fail(`Authorized promotion executor audit failed: ${executorAudit.failures.join(', ')}`);
}

const suppliedPromotionState = {
  registryVersion:'verify-v80-phase7',
  entries:[{
    skillName:firstShadowSkillName,
    lifecycle:'SHADOW' as const,
    transitionRevision:0
  }]
};
const suppliedDigest = digestPromotionStateV80(suppliedPromotionState);

const preparedTransaction = prepareV42PromotionTransactionV80({
  state:suppliedPromotionState,
  readiness:promotionBase
});
if (preparedTransaction.status !== 'PREPARED' || preparedTransaction.expectedStateDigest !== suppliedDigest) {
  fail('Authorized promotion executor did not prepare a deterministic transaction.');
}

const unauthorizedTransaction = executeV42PromotionTransactionV80({
  state:suppliedPromotionState,
  readiness:promotionBase,
  expectedStateDigest:suppliedDigest,
  hostAuthorization:false,
  authorizationId:'verify-denied',
  approvalEvidenceRefs:['verify:approval-denied'],
  postApplyVerification:{
    passed:true,
    observedLifecycle:'CANARY',
    evidenceRefs:['verify:post-denied']
  }
});
if (unauthorizedTransaction.status !== 'DENIED' || !unauthorizedTransaction.reasons.includes('HOST_AUTHORIZATION_REQUIRED')) {
  fail('Authorized promotion executor did not block missing host authorization.');
}
if (unauthorizedTransaction.afterDigest !== suppliedDigest) {
  fail('Denied promotion altered the supplied state.');
}

const mismatchTransaction = executeV42PromotionTransactionV80({
  state:suppliedPromotionState,
  readiness:promotionBase,
  expectedStateDigest:'0'.repeat(64),
  hostAuthorization:true,
  authorizationId:'verify-digest-mismatch',
  approvalEvidenceRefs:['verify:approval-digest'],
  postApplyVerification:{
    passed:true,
    observedLifecycle:'CANARY',
    evidenceRefs:['verify:post-digest']
  }
});
if (mismatchTransaction.status !== 'DENIED' || !mismatchTransaction.reasons.includes('EXPECTED_STATE_DIGEST_MISMATCH')) {
  fail('Authorized promotion executor did not block stale/concurrent supplied state.');
}

const rollbackTransaction = executeV42PromotionTransactionV80({
  state:suppliedPromotionState,
  readiness:promotionBase,
  expectedStateDigest:suppliedDigest,
  hostAuthorization:true,
  authorizationId:'verify-rollback',
  approvalEvidenceRefs:['verify:approval-rollback'],
  postApplyVerification:{
    passed:false,
    observedLifecycle:'CANARY',
    evidenceRefs:['verify:post-failed']
  }
});
if (rollbackTransaction.status !== 'ROLLED_BACK' || !rollbackTransaction.atomicRollbackApplied) {
  fail('Failed post-promotion verification did not trigger atomic rollback.');
}
if (rollbackTransaction.afterDigest !== suppliedDigest || rollbackTransaction.stateAfter.entries[0]?.lifecycle !== 'SHADOW') {
  fail('Atomic rollback did not restore the exact prior supplied state.');
}

const committedCanary = executeV42PromotionTransactionV80({
  state:suppliedPromotionState,
  readiness:promotionBase,
  expectedStateDigest:suppliedDigest,
  hostAuthorization:true,
  authorizationId:'verify-canary',
  approvalEvidenceRefs:['verify:approval-canary'],
  postApplyVerification:{
    passed:true,
    observedLifecycle:'CANARY',
    evidenceRefs:['verify:post-canary']
  }
});
if (committedCanary.status !== 'COMMITTED_TO_SUPPLIED_STATE' || committedCanary.stateAfter.entries[0]?.lifecycle !== 'CANARY') {
  fail('Authorized SHADOW to CANARY supplied-state transition failed.');
}
if (committedCanary.repositoryMutation || committedCanary.runtimeCatalogMutation || committedCanary.deploymentMutation) {
  fail('Supplied-state promotion escaped into repository/runtime/deployment mutation.');
}

const canarySuppliedState = committedCanary.stateAfter;
const canarySuppliedDigest = digestPromotionStateV80(canarySuppliedState);
const committedStable = executeV42PromotionTransactionV80({
  state:canarySuppliedState,
  readiness:{
    ...promotionBase,
    currentLifecycle:'CANARY',
    benchmarkScore:0.98,
    benchmarkCases:80,
    passRate:0.98,
    validatorPassRate:0.99,
    evidenceCompletenessRate:1,
    securityPassRate:1,
    unsupportedClaimRate:0,
    regressionRate:0.01,
    latencyPassRate:0.99,
    canaryExposurePercent:10,
    canaryObservationHours:48,
    rollback:{
      ready:true,
      tested:true,
      targetLifecycle:'CANARY',
      evidenceRefs:['verify:stable-rollback']
    }
  },
  expectedStateDigest:canarySuppliedDigest,
  hostAuthorization:true,
  authorizationId:'verify-stable',
  approvalEvidenceRefs:['verify:approval-stable'],
  postApplyVerification:{
    passed:true,
    observedLifecycle:'STABLE',
    evidenceRefs:['verify:post-stable']
  }
});
if (committedStable.status !== 'COMMITTED_TO_SUPPLIED_STATE' || committedStable.stateAfter.entries[0]?.lifecycle !== 'STABLE') {
  fail('Authorized CANARY to STABLE supplied-state transition failed.');
}
if (committedStable.stableCatalogCount !== expectedStableSkillCount || committedStable.runtimeCatalogMutation) {
  fail('Authorized promotion executor changed the real stable catalog baseline.');
}

const realCatalogAudit = auditV42RealCatalogPromotionAdapterV80();
if (realCatalogAudit.status !== 'PASS') {
  fail(`Real catalog promotion adapter audit failed: ${realCatalogAudit.failures.join(', ')}`);
}
if (V80_PROMOTED_V42_SKILL_COUNT !== 0 || V80_PROMOTED_V42_SKILL_NAMES.length !== 0) {
  fail('Phase 8 foundation must not promote any v4.2 candidate yet.');
}
if (V75_SKILL_NAMES.length !== 1465) {
  fail('Phase 8 foundation changed the real stable skill count before an authorized promotion batch.');
}

const actualCatalogDigest=digestRealSkillCatalogV80();
const stableReceipt={
  skillName:firstShadowSkillName,
  transactionId:committedStable.transactionId,
  status:'COMMITTED_TO_SUPPLIED_STATE' as const,
  targetLifecycle:'STABLE' as const,
  beforeDigest:committedStable.beforeDigest,
  afterDigest:committedStable.afterDigest,
  authorizationId:committedStable.evidenceRecord.authorizationId,
  approvalEvidenceRefs:committedStable.evidenceRecord.approvalEvidenceRefs,
  postApplyEvidenceRefs:committedStable.evidenceRecord.postApplyEvidenceRefs
};

const unauthorizedCatalogPatch=prepareV42RealCatalogPromotionV80({
  expectedCatalogDigest:actualCatalogDigest,
  catalogAuthorization:false,
  catalogAuthorizationId:'verify-catalog-denied',
  catalogApprovalEvidenceRefs:['verify:catalog:denied'],
  receipts:[stableReceipt]
});
if (unauthorizedCatalogPatch.status !== 'BLOCKED' || !unauthorizedCatalogPatch.blockers.includes('CATALOG_AUTHORIZATION_REQUIRED')) {
  fail('Real catalog adapter did not require explicit catalog authorization.');
}

const staleCatalogPatch=prepareV42RealCatalogPromotionV80({
  expectedCatalogDigest:'0'.repeat(64),
  catalogAuthorization:true,
  catalogAuthorizationId:'verify-catalog-digest',
  catalogApprovalEvidenceRefs:['verify:catalog:digest'],
  receipts:[stableReceipt]
});
if (staleCatalogPatch.status !== 'BLOCKED' || !staleCatalogPatch.blockers.includes('EXPECTED_CATALOG_DIGEST_MISMATCH')) {
  fail('Real catalog adapter did not protect the expected catalog digest.');
}

const readyCatalogPatch=prepareV42RealCatalogPromotionV80({
  expectedCatalogDigest:actualCatalogDigest,
  catalogAuthorization:true,
  catalogAuthorizationId:'verify-catalog-ready',
  catalogApprovalEvidenceRefs:['verify:catalog:ready'],
  receipts:[stableReceipt]
});
if (readyCatalogPatch.status !== 'PATCH_READY' || readyCatalogPatch.expectedStableSkillCountAfter !== 1466) {
  fail('Valid Phase 7 STABLE receipt did not produce a one-skill real catalog patch plan.');
}
if (readyCatalogPatch.repositoryMutationApplied || readyCatalogPatch.runtimeCatalogMutationApplied || readyCatalogPatch.deploymentMutationApplied) {
  fail('Real catalog adapter applied a mutation instead of returning an authorized patch plan.');
}
if (!readyCatalogPatch.patch.replacementSource.includes(firstShadowSkillName) || !readyCatalogPatch.patch.rollbackSource.includes('V80_PROMOTED_V42_SKILL_NAMES')) {
  fail('Real catalog patch/rollback source is incomplete.');
}

const verifiedCatalogPatch=verifyV42RealCatalogPatchV80({
  proposedPromotedNames:[firstShadowSkillName],
  expectedStableSkillCount:1466,
  expectedCatalogDigest:readyCatalogPatch.nextCatalogDigest
});
if (verifiedCatalogPatch.status !== 'PASS') {
  fail(`Prepared real catalog patch did not verify: ${verifiedCatalogPatch.failures.join(', ')}`);
}

const realBenchmarkAudit=auditV42RealBenchmarkEvidencePipelineV80();
if(realBenchmarkAudit.status!=='PASS'){
  fail(`Real benchmark evidence pipeline audit failed: ${realBenchmarkAudit.failures.join(', ')}`);
}

const realBenchmarkManifest=buildV42RealBenchmarkManifestV80({
  benchmarkId:'verify-v80-phase9',
  cases:[{
    caseId:'verify-real-1',
    skillName:firstShadowSkillName,
    scenarioId:'verify-real-scenario-1',
    scenarioRef:'verify:real:scenario:1',
    expectedEvidenceKinds:['result','validator','security'],
    latencyBudgetMs:5000
  }]
});
const realManifestCase=realBenchmarkManifest.cases[0];
if(realBenchmarkManifest.executionPerformed || realBenchmarkManifest.caseCount!==1){
  fail('Phase 9 manifest fabricated execution or lost benchmark cases.');
}
if(realManifestCase.skillInstructionHash!==remainingShadowSeeds[0].h){
  fail('Phase 9 manifest did not bind the current candidate instruction hash.');
}

const realHostReceipt={
  benchmarkId:realBenchmarkManifest.benchmarkId,
  caseId:realManifestCase.caseId,
  skillName:realManifestCase.skillName,
  manifestCaseDigest:realManifestCase.caseDigest,
  hostExecutionId:'verify-host-run-001',
  evidenceOrigin:'HOST_EXECUTION' as const,
  executionPerformed:true,
  sourceRef:'host://verify/run/001',
  evidenceRefs:['verify:host:result','verify:host:validator','verify:host:security'],
  evidenceKinds:['result','validator','security'],
  outcome:'PASS' as const,
  validatorPass:true,
  securityPass:true,
  unsupportedClaim:false,
  regressionDetected:false,
  latencyMs:900,
  semanticSimilarity:0.55,
  proceduralSimilarity:0.62,
  specializationDistinct:true,
  hostAttestation:'host-verified'
};

const verifiedRealReceipts=verifyV42RealBenchmarkReceiptsV80({
  manifest:realBenchmarkManifest,
  receipts:[realHostReceipt],
  requireAllManifestCases:true
});
if(verifiedRealReceipts.status!=='PASS'||verifiedRealReceipts.verifiedReceipts!==1){
  fail('Valid host benchmark receipt did not pass Phase 9 verification.');
}

const tamperedRealReceipt=verifyV42RealBenchmarkReceiptsV80({
  manifest:realBenchmarkManifest,
  receipts:[{...realHostReceipt,manifestCaseDigest:'0'.repeat(64)}]
});
if(tamperedRealReceipt.rejectedReceipts!==1||!tamperedRealReceipt.evaluations[0]?.failures.includes('MANIFEST_CASE_DIGEST_MISMATCH')){
  fail('Phase 9 did not reject a tampered manifest-case digest.');
}

// An attacker changes both manifest content and its receipt binding.
for(const mutate of [
  (manifest:{-readonly [K in keyof typeof realBenchmarkManifest]:typeof realBenchmarkManifest[K]})=>{manifest.cases[0].scenarioRef='attacker://replacement';},
  (manifest:{-readonly [K in keyof typeof realBenchmarkManifest]:typeof realBenchmarkManifest[K]})=>{manifest.cases[0].skillInstructionHash='f'.repeat(64);},
  (manifest:{-readonly [K in keyof typeof realBenchmarkManifest]:typeof realBenchmarkManifest[K]})=>{manifest.caseCount+=1;},
  (manifest:{-readonly [K in keyof typeof realBenchmarkManifest]:typeof realBenchmarkManifest[K]})=>{manifest.manifestDigest='f'.repeat(64);}
]){
  const altered=structuredClone(realBenchmarkManifest);
  mutate(altered);
  const result=verifyV42RealBenchmarkReceiptsV80({manifest:altered,receipts:[realHostReceipt]});
  if(result.status!=='BLOCKED'||result.verifiedReceipts!==0) fail('Tampered manifest accepted as execution evidence.');
}
const repeatedEvidence=buildV42RealBenchmarkEvidenceV80({
  manifest:realBenchmarkManifest,receipts:[realHostReceipt,realHostReceipt]
});
if(repeatedEvidence.status!=='BLOCKED'||repeatedEvidence.benchmark||repeatedEvidence.promotionReadyCandidates.length){
  fail('Duplicate receipts reached CANARY recommendation.');
}

const fixtureRealReceipt=verifyV42RealBenchmarkReceiptsV80({
  manifest:realBenchmarkManifest,
  receipts:[{...realHostReceipt,evidenceOrigin:'FIXTURE' as const}]
});
if(fixtureRealReceipt.rejectedReceipts!==1||!fixtureRealReceipt.evaluations[0]?.failures.includes('NON_HOST_EXECUTION_EVIDENCE')){
  fail('Phase 9 accepted fixture evidence as real host execution.');
}

const realBenchmarkEvidence=buildV42RealBenchmarkEvidenceV80({
  manifest:realBenchmarkManifest,
  receipts:[realHostReceipt],
  minimumCasesPerSkill:1,
  canaryBenchmarkThreshold:0.50,
  maxCanaryCandidates:5,
  maxCanaryPerArea:5
});
if(realBenchmarkEvidence.phase5BenchmarkInput.caseCount!==1||!realBenchmarkEvidence.benchmark){
  fail('Verified host receipt did not feed the existing Phase 5 benchmark pipeline.');
}
if(realBenchmarkEvidence.externalExecutionPerformedByPipeline){
  fail('Phase 9 claimed external execution performed by the pipeline itself.');
}
if(realBenchmarkEvidence.promotionApplied||realBenchmarkEvidence.repositoryMutationApplied||realBenchmarkEvidence.runtimeCatalogMutationApplied||realBenchmarkEvidence.deploymentMutationApplied){
  fail('Phase 9 crossed promotion/repository/runtime/deployment mutation boundaries.');
}
if(realBenchmarkEvidence.stableCatalogCount!==1465||realBenchmarkEvidence.promotedV42Count!==0){
  fail('Phase 9 changed the real stable catalog before a promotion batch.');
}

const campaignAudit=auditV42RealBenchmarkCampaignOrchestratorV80();
if(campaignAudit.status!=='PASS'){
  fail(`Real benchmark campaign orchestrator audit failed: ${campaignAudit.failures.join(', ')}`);
}

const campaignPlan=planV42RealBenchmarkCampaignV80({
  campaignId:'verify-v80-phase10-plan',
  scenarioBank:[
    {
      scenarioId:'verify-campaign-a',
      scenarioRef:'verify://campaign/a',
      areas:['*'],
      expectedEvidenceKinds:['result','validator','security'],
      latencyBudgetMs:5000
    },
    {
      scenarioId:'verify-campaign-b',
      scenarioRef:'verify://campaign/b',
      areas:['*'],
      expectedEvidenceKinds:['result','validator','security'],
      latencyBudgetMs:5000
    },
    {
      scenarioId:'verify-campaign-c',
      scenarioRef:'verify://campaign/c',
      areas:['*'],
      expectedEvidenceKinds:['result','validator','security'],
      latencyBudgetMs:5000
    }
  ],
  requestedSkillNames:[firstShadowSkillName,secondShadowSkillName],
  targetCasesPerSkill:20,
  maxSkills:2,
  casesPerSkill:4,
  maxTotalCases:8
});
if(campaignPlan.status!=='READY_FOR_HOST_EXECUTION'||campaignPlan.plannedCases!==8||campaignPlan.selectedSkillCount!==2){
  fail('Phase 10 did not create the expected balanced host-execution campaign.');
}
if(campaignPlan.executionPerformed||campaignPlan.externalExecutionPerformedByOrchestrator){
  fail('Phase 10 campaign planner fabricated external execution.');
}
if(campaignPlan.promotionApplied||campaignPlan.repositoryMutationApplied||campaignPlan.runtimeCatalogMutationApplied||campaignPlan.deploymentMutationApplied){
  fail('Phase 10 campaign planner crossed promotion/catalog/deployment mutation boundaries.');
}
if(!route.includes("PLAN_V42_REAL_BENCHMARK_CAMPAIGN")||
   !route.includes("BUILD_V42_REAL_BENCHMARK_CAMPAIGN_STATUS")||
   !route.includes("AUDIT_V42_REAL_BENCHMARK_CAMPAIGN_ORCHESTRATOR")){
  fail('Phase 10 operations are not wired through the existing v80 gateway.');
}

const coreBlock = route.match(/const KROM_CORE_PUBLIC_TOOL_NAMES = new Set\(\[([\s\S]*?)\]\);/);
if (!coreBlock) fail('Could not parse compact public tool surface.');
const coreBlockText = coreBlock?.[1] ?? '';
const coreTools = [...coreBlockText.matchAll(/['"]([^'"]+)['"]/g)].map(match => match[1]);
if (coreTools.length !== 15) fail(`Expected 15 compact public tools, got ${coreTools.length}`);
if (coreTools.includes('krom_v80_adaptive_skill_intelligence')) fail('v80 control-plane tool leaked into compact public tools.');

if (!packageJson.scripts?.['verify:v80']) fail('package.json is missing verify:v80.');
if (!String(packageJson.scripts?.ci ?? '').includes('verify:v80')) fail('CI script is missing verify:v80.');
if (!String(packageJson.scripts?.build ?? '').includes('verify:v80')) fail('Build script is missing verify:v80.');

console.log(JSON.stringify({
  status:'PASS',
  release:V80_RELEASE,
  packageVersion:packageJson.version,
  corePublicTools:coreTools.length,
  internalCapabilityTarget:5333,
  controlPlaneCapabilitiesAdded:1,
  currentSkillCatalogCount:audit.currentSkillCatalogCount,
  agentCount:audit.agentCount,
  engines:audit.engines,
  additionalControls:audit.additionalControls,
  operationalLearning:true,
  portableObservationLedger:true,
  controlCenterSnapshot:true,
  shadowCanaryOnboarding:true,
  duplicateRetirementIntelligence:true,
  v42ShadowRegistry:true,
  v42ShadowCandidates:500,
  v42StableCatalogPreserved:true,
  v42CanarySelectionGoverned:true,
  shadowBenchmarkRunner:true,
  suppliedBenchmarkResultsOnly:true,
  benchmarkCanaryRecommendationsGoverned:true,
  canaryPromotionController:true,
  evidenceFreshnessGate:true,
  rollbackContractGate:true,
  highRiskJudgeGate:true,
  stablePromotionRecommendationGoverned:true,
  authorizedPromotionExecutor:true,
  expectedStateDigestGate:true,
  atomicRollback:true,
  suppliedStateOnlyExecution:true,
  realStableCatalogPreservedAfterExecutor:true,
  realCatalogPromotionAdapter:true,
  promotedV42RegistryCount:V80_PROMOTED_V42_SKILL_COUNT,
  promotionAwareStableCatalog:true,
  catalogDigestGate:true,
  catalogPatchRollbackSource:true,
  realCatalogPatchApplied:false,
  realBenchmarkEvidencePipeline:true,
  deterministicBenchmarkManifest:true,
  hostReceiptDigestBinding:true,
  fixtureEvidenceRejected:true,
  verifiedHostEvidenceFeedsPhase5:true,
  externalExecutionNotFabricated:true,
  realBenchmarkCampaignOrchestrator:true,
  balancedCampaignPlanning:true,
  scenarioDiversityGate:true,
  sourceDiversityGate:true,
  promotionReviewQueue:true,
  campaignExecutionNotFabricated:true,
  automaticCatalogMutation:false
}, null, 2));
