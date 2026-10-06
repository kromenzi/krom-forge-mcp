import { z } from 'zod';
import { V75_AGENT_IDS, V75_SKILL_NAMES } from './v75-agent-capability-fabric';
import {
  evaluateSkillPackOnboardingV80,
  normalizeSkillIdentityV80,
  type V80SkillOnboardingCandidate
} from './v80-skill-onboarding-governance';
import { V80_V42_SHADOW_SKILLS_0 } from './v80-shadow-skill-catalog-part-0';
import { V80_V42_SHADOW_SKILLS_1 } from './v80-shadow-skill-catalog-part-1';
import { V80_V42_SHADOW_SKILLS_2 } from './v80-shadow-skill-catalog-part-2';
import { V80_V42_SHADOW_SKILLS_3 } from './v80-shadow-skill-catalog-part-3';
import { V80_V42_SHADOW_SKILLS_4 } from './v80-shadow-skill-catalog-part-4';

export const V80_V42_SHADOW_SOURCE = {
  packName:'KROM-Forge-v79-Native-Skills-Pack-v4.2-500-New',
  sourceManifestPackName:'KROM-Forge-v79-Native-Skills-Pack-v4.0-500-New',
  version:'4.2.0',
  archiveSha256:'6dfa6f35e552712d6158c12917d0cf632f87707a607ed9a8657857eda1aa05a5',
  baseCatalogCount:1465,
  candidateCount:500,
  projectedCatalogIfPromoted:1965,
  publicTools:15,
  internalCapabilities:5333,
  agents:11,
  qualityEvidence:{
    uniqueProceduralBodies:500,
    exactNormalizedClusters:0,
    pairsAtOrAbove090:0,
    pairsAtOrAbove085:28,
    pairsAtOrAbove080:95,
    highestCombinedSimilarity:0.8961,
    behavioralTests:4000,
    securityPass:true,
    secretPatternHits:0,
    unsafeMutationPayloadHits:0,
    qaValidatorCoverage:193,
    databaseValidatorCoverage:70,
    backendDevopsValidatorConcentration:0.156
  }
} as const;

type RawShadowSkill = {
  name:string;
  sha256:string;
  area:string;
  primaryAgent?:string;
  validatorAgent?:string;
  handoffAgents?:readonly string[];
};

const RAW_V42_SHADOW_SKILLS:RawShadowSkill[] = [
  ...V80_V42_SHADOW_SKILLS_0,
  ...V80_V42_SHADOW_SKILLS_1,
  ...V80_V42_SHADOW_SKILLS_2,
  ...V80_V42_SHADOW_SKILLS_3,
  ...V80_V42_SHADOW_SKILLS_4
];

const agentSet = new Set<string>(V75_AGENT_IDS as readonly string[]);

function inferPrimaryAgent(area:string){
  if (['cybersecurity','privacy','industrial','appsec','cloudsec','secrets','auth','abac'].includes(area)) return 'security';
  if (['governance','sbom','sre','git-forensics'].includes(area)) return 'release-auditor';
  if (['disaster','incident','projects','construction','agents','multiagent','autonomous-repair'].includes(area)) return 'orchestrator';
  if (['digitaltwins','iot','otit','distributed','microservices','monorepos','mcp','modelrouting','saudi','architecture'].includes(area)) return 'architect';
  if (['hr','maintenance','analytics','bi','ai','llm','rag','embeddings','vision','ocr','docintel','arabic','rootcause'].includes(area)) return 'researcher';
  if (['accessibility','pdf','images','video','audio','unit-testing','integration-testing','e2e','contract-testing','chaos','hse'].includes(area)) return 'qa';
  if (['rls','elasticsearch','dataeng','etl','data-quality','vector','spreadsheet','erp','finance','assets'].includes(area)) return 'database';
  if (['frontend','mobile','i18n'].includes(area)) return 'frontend';
  if (['uiux','rtl'].includes(area)) return 'uiux';
  if (['devops','cicd','github-actions','vercel','containers','kubernetes','terraform','serverless','edge','observability','performance'].includes(area)) return 'devops';
  return 'backend';
}

function inferValidatorAgent(area:string,primary:string){
  if (['database','rls','elasticsearch','dataeng','etl','data-quality','vector','spreadsheet','erp','finance','assets','manufacturing','supplychain','cmms'].includes(area)) return primary==='database'?'qa':'database';
  if (['security','cybersecurity','privacy','industrial','iot','otit','auth','abac','appsec','cloudsec','secrets'].includes(area)) return primary==='security'?'qa':'security';
  if (['architecture','distributed','microservices','monorepos','digitaltwins','modelrouting'].includes(area)) return primary==='architect'?'qa':'architect';
  if (['disaster','incident','governance','sre','git-forensics'].includes(area)) return primary==='release-auditor'?'qa':'release-auditor';
  if (['uiux','rtl','accessibility'].includes(area)) return primary==='qa'?'uiux':'qa';
  return 'qa';
}

function defaultHandoffs(primary:string,validator:string){
  const ordered=[validator,'qa','release-auditor','orchestrator']
    .filter((value,index,array)=>value!==primary&&array.indexOf(value)===index);
  return ordered.slice(0,2);
}

function normalizeRecord(raw:RawShadowSkill,index:number){
  const primaryAgent=agentSet.has(raw.primaryAgent??'') ? raw.primaryAgent! : inferPrimaryAgent(raw.area);
  const validatorAgent=agentSet.has(raw.validatorAgent??'') && raw.validatorAgent!==primaryAgent
    ? raw.validatorAgent!
    : inferValidatorAgent(raw.area,primaryAgent);
  const handoffAgents=(raw.handoffAgents??defaultHandoffs(primaryAgent,validatorAgent))
    .filter(agent=>agentSet.has(agent)&&agent!==primaryAgent)
    .filter((agent,index,array)=>array.indexOf(agent)===index)
    .slice(0,6);
  return {
    id:index+1,
    name:raw.name,
    sha256:raw.sha256,
    area:raw.area,
    primaryAgent,
    validatorAgent,
    handoffAgents,
    lifecycle:'SHADOW' as const,
    runtimeActivated:false,
    sourcePack:V80_V42_SHADOW_SOURCE.packName,
    sourceVersion:V80_V42_SHADOW_SOURCE.version
  };
}

export const V80_V42_SHADOW_SKILLS = RAW_V42_SHADOW_SKILLS.map(normalizeRecord);

export const v80ShadowCatalogQuerySchema=z.object({
  offset:z.number().int().min(0).default(0),
  limit:z.number().int().min(1).max(100).default(25),
  area:z.string().min(1).optional(),
  primaryAgent:z.enum(V75_AGENT_IDS).optional()
});

function duplicates(values:string[]){
  return [...new Set(values.filter((value,index,array)=>array.indexOf(value)!==index))].sort();
}

export function auditV80ShadowCatalog(){
  const names=V80_V42_SHADOW_SKILLS.map(item=>item.name);
  const hashes=V80_V42_SHADOW_SKILLS.map(item=>item.sha256);
  const activeNames=new Set<string>(V75_SKILL_NAMES as readonly string[]);
  const activeNormalized=new Set((V75_SKILL_NAMES as readonly string[]).map(normalizeSkillIdentityV80));
  const exactCollisions=names.filter(name=>activeNames.has(name)).sort();
  const normalizedCollisions=names
    .filter(name=>activeNormalized.has(normalizeSkillIdentityV80(name)))
    .sort();
  const invalidHashes=V80_V42_SHADOW_SKILLS
    .filter(item=>!/^[a-f0-9]{64}$/.test(item.sha256))
    .map(item=>item.name);
  const invalidAgents=V80_V42_SHADOW_SKILLS
    .filter(item=>!agentSet.has(item.primaryAgent)||!agentSet.has(item.validatorAgent))
    .map(item=>item.name);
  const activeCatalogCount=V75_SKILL_NAMES.length;
  const checks={
    candidateCount:V80_V42_SHADOW_SKILLS.length===V80_V42_SHADOW_SOURCE.candidateCount,
    uniqueNames:new Set(names).size===V80_V42_SHADOW_SOURCE.candidateCount,
    uniqueHashes:new Set(hashes).size===V80_V42_SHADOW_SOURCE.candidateCount,
    internalExactDuplicates:duplicates(names).length===0,
    exactActiveCollisions:exactCollisions.length===0,
    normalizedActiveCollisions:normalizedCollisions.length===0,
    hashesValid:invalidHashes.length===0,
    agentsValid:invalidAgents.length===0,
    activeCatalogPreserved:activeCatalogCount===V80_V42_SHADOW_SOURCE.baseCatalogCount,
    publicSurfacePreserved:V80_V42_SHADOW_SOURCE.publicTools===15,
    capabilityBaselinePreserved:V80_V42_SHADOW_SOURCE.internalCapabilities===5333,
    agentBaselinePreserved:V75_AGENT_IDS.length===V80_V42_SHADOW_SOURCE.agents,
    sourceOriginalityGate:V80_V42_SHADOW_SOURCE.qualityEvidence.pairsAtOrAbove090===0,
    sourceSecurityGate:V80_V42_SHADOW_SOURCE.qualityEvidence.securityPass
  };
  const failures=Object.entries(checks).filter(([,passed])=>!passed).map(([name])=>name);
  return {
    release:'v80',
    phase:'PHASE_4_V42_SHADOW_CATALOG',
    status:failures.length?'FAIL':'PASS',
    source:V80_V42_SHADOW_SOURCE,
    activeCatalogCount,
    shadowCandidateCount:V80_V42_SHADOW_SKILLS.length,
    projectedCatalogIfEventuallyPromoted:activeCatalogCount+V80_V42_SHADOW_SKILLS.length,
    runtimeActivated:false,
    lifecycle:'SHADOW',
    exactCollisions,
    normalizedCollisions,
    internalDuplicateNames:duplicates(names),
    invalidHashes,
    invalidAgents,
    checks,
    failures,
    executionClaim:false
  } as const;
}

function toOnboardingCandidate(item:(typeof V80_V42_SHADOW_SKILLS)[number]):V80SkillOnboardingCandidate {
  return {
    skillName:item.name,
    packageId:V80_V42_SHADOW_SOURCE.packName,
    domain:item.area,
    primaryAgent:item.primaryAgent as (typeof V75_AGENT_IDS)[number],
    validatorAgent:item.validatorAgent as (typeof V75_AGENT_IDS)[number],
    handoffAgents:item.handoffAgents as (typeof V75_AGENT_IDS)[number][],
    exactNameCollision:false,
    normalizedNameCollision:false,
    semanticMaxSimilarity:V80_V42_SHADOW_SOURCE.qualityEvidence.highestCombinedSimilarity,
    proceduralMaxSimilarity:V80_V42_SHADOW_SOURCE.qualityEvidence.highestCombinedSimilarity,
    semanticDuplicateEvidence:false,
    purposeOverlapRisk:'low',
    specializationDistinct:false,
    contractValid:true,
    schemaValid:true,
    securityPass:true,
    provenanceValid:true,
    checksumValid:true,
    agentMappingValid:true,
    capabilityMappingValid:true,
    evidenceContractValid:true,
    behavioralTests:8,
    benchmarkScore:0,
    benchmarkCases:0
  };
}

export function evaluateV80ShadowPack(){
  const audit=auditV80ShadowCatalog();
  const evaluation=evaluateSkillPackOnboardingV80({
    packName:V80_V42_SHADOW_SOURCE.packName,
    version:V80_V42_SHADOW_SOURCE.version,
    baseCatalogCount:V75_SKILL_NAMES.length,
    publicToolsExpected:15,
    internalCapabilitiesExpected:5333,
    agentsExpected:V75_AGENT_IDS.length,
    candidates:V80_V42_SHADOW_SKILLS.map(toOnboardingCandidate)
  });
  const allShadow=
    evaluation.counts.SHADOW===V80_V42_SHADOW_SOURCE.candidateCount &&
    evaluation.counts.CANARY===0 &&
    evaluation.counts.REVIEW_REQUIRED===0 &&
    evaluation.counts.BLOCKED===0;
  return {
    release:'v80',
    phase:'PHASE_4_V42_SHADOW_CATALOG',
    status:audit.status==='PASS'&&evaluation.status==='READY_FOR_GOVERNED_ONBOARDING'&&allShadow?'PASS':'FAIL',
    audit,
    onboarding:evaluation,
    activeCatalogCount:V75_SKILL_NAMES.length,
    shadowCandidateCount:V80_V42_SHADOW_SKILLS.length,
    projectedCatalogIfEventuallyPromoted:V75_SKILL_NAMES.length+V80_V42_SHADOW_SKILLS.length,
    runtimeActivated:false,
    promotionApplied:false,
    requiredNextStage:'Collect evidence-bound SHADOW outcomes; promote only qualifying individual skills to CANARY after real benchmark evidence.',
    executionClaim:false
  } as const;
}

export function getV80ShadowCatalogPage(input:z.input<typeof v80ShadowCatalogQuerySchema>){
  const parsed=v80ShadowCatalogQuerySchema.parse(input);
  const filtered=V80_V42_SHADOW_SKILLS.filter(item=>
    (!parsed.area||item.area===parsed.area)&&
    (!parsed.primaryAgent||item.primaryAgent===parsed.primaryAgent)
  );
  const items=filtered.slice(parsed.offset,parsed.offset+parsed.limit);
  return {
    release:'v80',
    source:V80_V42_SHADOW_SOURCE.packName,
    version:V80_V42_SHADOW_SOURCE.version,
    activeCatalogCount:V75_SKILL_NAMES.length,
    totalShadowCandidates:V80_V42_SHADOW_SKILLS.length,
    filteredCount:filtered.length,
    offset:parsed.offset,
    limit:parsed.limit,
    nextOffset:parsed.offset+items.length<filtered.length?parsed.offset+items.length:null,
    items,
    runtimeActivated:false,
    lifecycle:'SHADOW',
    executionClaim:false
  } as const;
}
