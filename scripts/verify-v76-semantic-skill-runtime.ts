import { V75_AGENT_IDS, V75_SKILL_NAMES } from '../src/v75-agent-capability-fabric';
import { selectAgentV76, rankSkillsV76, rankCapabilitiesV76, buildExecutionPlanV76, auditSemanticRouterV76 } from '../src/v76-semantic-skill-runtime';
import { auditSkillIndexV76, getSkillMetadataV76 } from '../src/v76-skill-index';
import { V80_PROMOTED_V42_SKILL_COUNT } from '../src/v80-promoted-v42-skill-seeds';

const expectedSkillCount=1465+V80_PROMOTED_V42_SKILL_COUNT;

if (V75_AGENT_IDS.length !== 11) throw new Error(`Expected 11 agents, got ${V75_AGENT_IDS.length}`);
if (V75_SKILL_NAMES.length !== expectedSkillCount) throw new Error(`Expected ${expectedSkillCount} skills, got ${V75_SKILL_NAMES.length}`);

const skillIndexAudit = auditSkillIndexV76();
if (skillIndexAudit.status !== 'PASS') throw new Error(`Skill index audit failed: ${JSON.stringify(skillIndexAudit)}`);
if (skillIndexAudit.actualCount !== expectedSkillCount) throw new Error(`Expected ${expectedSkillCount} indexed skills, got ${skillIndexAudit.actualCount}`);
if (skillIndexAudit.digestCoverage !== expectedSkillCount) throw new Error(`Expected SHA-256 coverage for all ${expectedSkillCount} skills, got ${skillIndexAudit.digestCoverage}`);
const repairSamples=['krom-api-network-repair','11-krom-environment-config-repair','21-krom-routing-navigation-repair','krom-full-system-autonomous-repair-orchestrator'];
for(const skillName of repairSamples){
  if(!getSkillMetadataV76(skillName)) throw new Error(`Missing imported repair skill metadata: ${skillName}`);
}
const remediationSkill = getSkillMetadataV76('ksa-2026-security-quality-remediation');
if (!remediationSkill) throw new Error('Missing ksa-2026-security-quality-remediation');
if (!remediationSkill.domains.includes('security') || !remediationSkill.domains.includes('print') || !remediationSkill.domains.includes('asset')) throw new Error('Remediation skill routing domains incomplete');
const hseSkill = getSkillMetadataV76('enterprise-hse-platform-engineer');
if (!hseSkill?.description.includes('HSE')) throw new Error('Validated HSE skill metadata was not loaded');

for(const skillName of ['kfg-001-developer-experience','ent-101-skill','ent-200-enterprise-system-composer']){
  const meta=getSkillMetadataV76(skillName);
  if(!meta) throw new Error(`Missing v79 native skill metadata: ${skillName}`);
  if(!/^[a-f0-9]{64}$/.test(meta.sha256)) throw new Error(`Invalid v79 native skill digest: ${skillName}`);
  if(!meta.preferredAgents.length) throw new Error(`Missing v79 native agent mapping: ${skillName}`);
}

const capabilityCandidates = [
  {name:'krom_audit_database_architecture',title:'Audit database architecture',description:'Audit schema migrations database integrity and RLS'},
  {name:'krom_audit_ui',title:'Audit UI',description:'Audit UI UX responsive RTL accessibility'},
  {name:'krom_evaluate_security_assessment',title:'Security assessment',description:'Audit auth authorization secrets threats and vulnerabilities'},
  {name:'krom_decide_release',title:'Decide release',description:'Release deployment rollback and production readiness'},
  {name:'krom_v66_build_capability_discovery',title:'Capability discovery',description:'Discover and rank tools'}
];

const english = rankSkillsV76('responsive rtl ui ux dashboard',5);
if (!english.some(x=>x.name==='ksa-safety-board-uiux-design')) throw new Error('English UI/UX skill routing failed');

const arabic = rankSkillsV76('تصميم واجهة لوحة السلامة ودعم RTL',8);
if (!arabic.some(x=>x.name==='ksa-safety-board-uiux-design') && !arabic.some(x=>x.name==='elite-product-uiux-designer')) {
  throw new Error('Arabic UI/UX skill routing failed');
}

const dbAgent = selectAgentV76('audit database schema migration rls');
if (dbAgent.agentId !== 'database') throw new Error(`Expected database agent, got ${dbAgent.agentId}`);

const uiSkills = rankSkillsV76('responsive rtl dashboard interface',5);
const uiAgent = selectAgentV76('responsive rtl dashboard interface', undefined, uiSkills.map(x=>x.name));
if (!['uiux','frontend'].includes(uiAgent.agentId)) {
  throw new Error(`Expected UI-aligned agent, got ${uiAgent.agentId}`);
}
if (!uiAgent.candidates?.some(x=>x.skillAffinity>0)) {
  throw new Error('Expected skill affinity to influence agent routing');
}

const rankedCaps = rankCapabilitiesV76('database schema rls', capabilityCandidates,5);
if (rankedCaps[0]?.name !== 'krom_audit_database_architecture') throw new Error('Capability ranking failed');

const plan = buildExecutionPlanV76({
  query:'security auth secrets threat model',
  maxResults:10,
  ambiguityThreshold:0.18
}, capabilityCandidates);
if (!plan.agent) throw new Error('Execution plan missing agent');
if (!plan.steps.some(x=>x.action==='VALIDATE_INPUT_SCHEMA')) throw new Error('Execution plan missing schema validation');
if (!plan.hostAuthorizationRequired) throw new Error('Execution plan must preserve host authorization boundary');

const audit = auditSemanticRouterV76(capabilityCandidates);
if (!['PASS','PASS_WITH_GAPS'].includes(audit.status)) throw new Error('Semantic router audit returned invalid status');

console.log(JSON.stringify({
  status:'PASS',
  release:'v76',
  agents:11,
  skills:expectedSkillCount,
  preservedInternalCapabilityBaseline:5333,
  bilingualSearch:true,
  fuzzyRanking:true,
  ambiguityDetection:true,
  validatedSkillMetadata:true,
  skillDigestCoverage:skillIndexAudit.digestCoverage,
  skillDescriptionCoverage:skillIndexAudit.descriptionCoverage,
  skillInstructionCoverage:skillIndexAudit.instructionCoverage,
  skillEvidenceCoverage:skillIndexAudit.evidenceCoverage,
  skillAwareAgentRouting:true,
  hostAuthorizationBoundaryPreserved:true
}));
