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

const fail = (message: string): never => {
  console.error(`FAIL: ${message}`);
  process.exit(1);
};

const root = process.cwd();
const route = fs.readFileSync(path.resolve(root, 'app/mcp/route.ts'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.resolve(root, 'package.json'), 'utf8'));

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
if (v42Summary.shadowCandidates.count !== 500) fail('v4.2 shadow registry must contain exactly 500 candidates.');
if (v42Summary.stableCatalog.count !== 1465 || !v42Summary.stableCatalog.unchanged) {
  fail('Registering v4.2 shadow candidates changed the stable 1,465-skill catalog.');
}
if (v42Summary.shadowCandidates.executable || v42Summary.shadowCandidates.promoted !== 0) {
  fail('v4.2 shadow candidates became executable or promoted without authorization.');
}
if (v42Summary.collisionAudit.exactStableCollisions.length || v42Summary.collisionAudit.normalizedStableCollisions.length) {
  fail('v4.2 shadow pack collides with the stable catalog.');
}

const firstShadow = getV42ShadowCandidateV80({skillName:'kfg-v4-0001-bounded-context-migration-map'});
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
    skillName:'kfg-v4-0001-bounded-context-migration-map',
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
if (qualifiedCanary.selectedCount !== 1 || qualifiedCanary.selected[0]?.skillName !== 'kfg-v4-0001-bounded-context-migration-map') {
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
  skillName:'kfg-v4-0001-bounded-context-migration-map',
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
if (shadowBenchmark.stableCatalogCount !== 1465 || shadowBenchmark.stableCatalogMutation) {
  fail('Shadow benchmark runner changed the stable 1,465-skill catalog.');
}

const shadowReport = getV42ShadowBenchmarkReportV80({
  benchmarkId:'verify-v80-phase5',
  skillName:'kfg-v4-0001-bounded-context-migration-map',
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
  skillName:'kfg-v4-0001-bounded-context-migration-map',
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
    {...promotionBase,skillName:'kfg-v4-0002-architecture-fitness-function-suite',benchmarkScore:0.60}
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
if (promotionPlan.stableCatalogCount !== 1465) {
  fail('Promotion controller changed the stable 1,465-skill baseline.');
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
  automaticCatalogMutation:false
}, null, 2));
