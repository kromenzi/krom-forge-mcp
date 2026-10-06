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

const coreBlock = route.match(/const KROM_CORE_PUBLIC_TOOL_NAMES = new Set\(\[([\s\S]*?)\]\);/);
if (!coreBlock) fail('Could not parse compact public tool surface.');
const coreTools = [...coreBlock[1].matchAll(/['"]([^'"]+)['"]/g)].map(match => match[1]);
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
  additionalControls:audit.additionalControls
}, null, 2));
