import { V76_SKILL_INDEX } from '../src/v76-skill-index';
import {
  selectSkillSetV77,
  mergeDirectivesV77,
  detectDirectiveConflictsV77,
  classifyActionV77,
  buildExecutionContractV77,
  scoreRouteConfidenceV77,
  buildMultiSkillExecutionGraphV77,
  explainRoutingDecisionV77,
  auditNativeSkillRuntimeV77
} from '../src/v77-native-skill-runtime';
import { resolveSkillDirectivePolicyV77, evaluateDirectiveApplicabilityV77, enforceExecutionPolicyV77, buildSkillExecutionPacketV77, resolveSkillConflictsV77, auditDirectiveEnforcementV77 } from '../src/v77-directive-enforcement';
import { buildNativeMissionPlanV77, auditNativeMissionPlannerV77 } from '../src/v77-native-mission-planner';
import { getNativeSkillDirectivesV77, auditNativeSkillDirectiveBundleV77 } from '../src/v77-native-skill-directives';
import { buildSkillTeamV77, auditSkillTeamOrchestratorV77 } from '../src/v77-skill-team-orchestrator';

const candidates=[
  {name:'krom_audit_database_architecture',title:'Audit database architecture',description:'database schema migration rls audit'},
  {name:'krom_audit_ui',title:'Audit UI',description:'ui ux responsive rtl accessibility dashboard'},
  {name:'krom_evaluate_security_assessment',title:'Security assessment',description:'security auth authorization secrets threats'},
  {name:'krom_decide_release',title:'Decide release',description:'release deployment production rollback gate'},
  {name:'krom_generate_test_plan',title:'Generate test plan',description:'qa tests regression e2e verification'},
  {name:'krom_v72_build_skill_tool_chain',title:'Build skill tool chain',description:'skill capability tool chain orchestration'}
];

if(V76_SKILL_INDEX.length!==50) throw new Error(`Expected 50 v76 skills, got ${V76_SKILL_INDEX.length}`);

const nativeDirectiveAudit=auditNativeSkillDirectiveBundleV77();
if(nativeDirectiveAudit.status!=='PASS') throw new Error(`Native directive bundle audit failed: ${JSON.stringify(nativeDirectiveAudit)}`);
if(nativeDirectiveAudit.skillCount!==50) throw new Error(`Expected 50 native skill directive records, got ${nativeDirectiveAudit.skillCount}`);
if(nativeDirectiveAudit.directiveCount<250) throw new Error(`Expected >=250 deterministic runtime directives, got ${nativeDirectiveAudit.directiveCount}`);

const nativeSecret=getNativeSkillDirectivesV77('krom-secrets-credential-guardian');
if(!nativeSecret || nativeSecret.sha256!==V76_SKILL_INDEX.find(x=>x.name==='krom-secrets-credential-guardian')?.sha256) {
  throw new Error('Native secret skill SHA-256 does not match validated metadata');
}
if(!nativeSecret.directives.some(x=>/secret|credential|سر|مفتاح/i.test(x))) {
  throw new Error('Native secret guardian directives were not loaded from SKILL.md');
}

const compound=selectSkillSetV77('fix responsive rtl dashboard accessibility and test it',4,0.20);
if(compound.length<2 || compound.length>4) throw new Error('Expected bounded multi-skill selection for compound UI/accessibility request');

const arabic=selectSkillSetV77('فحص قاعدة البيانات والصلاحيات والأمان',4,0.20);
if(arabic.length<2 || arabic.length>4) throw new Error('Expected bounded multi-skill selection for Arabic compound request');

const directives=mergeDirectivesV77(compound.map(x=>x.name));
if(!directives.length) throw new Error('Merged directives are empty');

const conflicts=detectDirectiveConflictsV77(compound.map(x=>x.name));
if(!Array.isArray(conflicts)) throw new Error('Conflict detector did not return an array');

const readOnly=classifyActionV77('audit database schema and rls');
if(readOnly.class!=='READ_ONLY') throw new Error(`Expected READ_ONLY, got ${readOnly.class}`);

const mutation=classifyActionV77('deploy production release');
if(mutation.class!=='HIGH_RISK_MUTATION') throw new Error(`Expected HIGH_RISK_MUTATION, got ${mutation.class}`);

const blocked=buildExecutionContractV77({
  query:'deploy production release after tests',
  maxSkills:4,
  maxCapabilities:8,
  relativeSkillThreshold:0.55,
  hostAuthorized:false,
  approvalRequired:false,
  approved:false,
  schemaValidated:false
},candidates);
if(blocked.status!=='BLOCKED_AUTHORIZATION') throw new Error(`Expected BLOCKED_AUTHORIZATION, got ${blocked.status}`);
if(blocked.dispatchAllowed) throw new Error('Unauthorized mutation must not be dispatchable');

const schemaBlocked=buildExecutionContractV77({
  query:'audit database schema and rls',
  maxSkills:4,
  maxCapabilities:8,
  relativeSkillThreshold:0.55,
  hostAuthorized:false,
  approvalRequired:false,
  approved:false,
  schemaValidated:false
},candidates);
if(schemaBlocked.status!=='BLOCKED_SCHEMA_VALIDATION') throw new Error(`Expected BLOCKED_SCHEMA_VALIDATION, got ${schemaBlocked.status}`);
if(schemaBlocked.dispatchAllowed) throw new Error('Schema-unvalidated contract must not be dispatchable');

const authorized=buildExecutionContractV77({
  query:'deploy production release after tests',
  maxSkills:4,
  maxCapabilities:8,
  relativeSkillThreshold:0.55,
  hostAuthorized:true,
  approvalRequired:false,
  approved:false,
  schemaValidated:true
},candidates);
if(authorized.status==='BLOCKED_AUTHORIZATION') throw new Error('Authorized mutation remained authorization-blocked');

const approvalBlocked=buildExecutionContractV77({
  query:'deploy production release after tests',
  maxSkills:4,
  maxCapabilities:8,
  relativeSkillThreshold:0.55,
  hostAuthorized:true,
  approvalRequired:true,
  approved:false,
  schemaValidated:true
},candidates);
if(approvalBlocked.status!=='BLOCKED_APPROVAL') throw new Error(`Expected BLOCKED_APPROVAL, got ${approvalBlocked.status}`);

const highRiskAutoApproval=buildExecutionContractV77({
  query:'deploy production release after tests',
  maxSkills:4,
  maxCapabilities:8,
  relativeSkillThreshold:0.55,
  hostAuthorized:true,
  approvalRequired:false,
  approved:false,
  schemaValidated:true
},candidates);
if(highRiskAutoApproval.status!=='BLOCKED_APPROVAL') throw new Error(`High-risk mutation must auto-require approval, got ${highRiskAutoApproval.status}`);
if(!highRiskAutoApproval.approvalRequired) throw new Error('High-risk mutation did not expose effective approval requirement');

const fullyApproved=buildExecutionContractV77({
  query:'deploy production release after tests',
  maxSkills:4,
  maxCapabilities:8,
  relativeSkillThreshold:0.55,
  hostAuthorized:true,
  approvalRequired:false,
  approved:true,
  schemaValidated:true
},candidates);
if(fullyApproved.status!=='READY') throw new Error(`Expected fully approved high-risk contract READY, got ${fullyApproved.status}`);
if(!/^[a-f0-9]{64}$/.test(fullyApproved.contractDigest)) throw new Error('Missing deterministic execution contract digest');

const fullyApprovedAgain=buildExecutionContractV77({
  query:'deploy production release after tests',
  maxSkills:4,
  maxCapabilities:8,
  relativeSkillThreshold:0.55,
  hostAuthorized:true,
  approvalRequired:false,
  approved:true,
  schemaValidated:true
},candidates);
if(fullyApprovedAgain.contractDigest!==fullyApproved.contractDigest) throw new Error('Execution contract digest is not deterministic');

const confidence=scoreRouteConfidenceV77({
  query:'audit database schema and rls',
  maxSkills:4,
  maxCapabilities:8,
  relativeSkillThreshold:0.55,
  hostAuthorized:false,
  approvalRequired:false,
  approved:false,
  schemaValidated:true
},candidates);
if(!['LOW','MEDIUM','HIGH'].includes(confidence.level)) throw new Error('Invalid route confidence level');
if(confidence.score<0 || confidence.score>1) throw new Error('Route confidence score outside [0,1]');

const graph=buildMultiSkillExecutionGraphV77({
  query:'fix responsive rtl dashboard accessibility and test it',
  maxSkills:4,
  maxCapabilities:8,
  relativeSkillThreshold:0.20,
  hostAuthorized:true,
  approvalRequired:false,
  approved:true,
  schemaValidated:true
},candidates);
if(!/^[a-f0-9]{64}$/.test(graph.graphDigest)) throw new Error('Missing deterministic graph digest');
if(!graph.nodes.some(x=>x.id==='PRECHECK') || !graph.nodes.some(x=>x.id==='VERIFY')) throw new Error('Execution graph missing safety gates');

const explanation=explainRoutingDecisionV77({
  query:'فحص قاعدة البيانات والصلاحيات والأمان',
  maxSkills:4,
  maxCapabilities:8,
  relativeSkillThreshold:0.20,
  hostAuthorized:false,
  approvalRequired:false,
  approved:false,
  schemaValidated:true
},candidates);
if(!explanation.agent.selected || !explanation.skills.length || !explanation.capabilities.length) throw new Error('Routing explanation is incomplete');

const policy=resolveSkillDirectivePolicyV77(['ksa-database-schema-migration-architect','krom-secure-code-auditor']);
if(policy.status!=='PASS') throw new Error(`Expected compatible skill policy PASS, got ${policy.status}`);

const unknownPolicy=resolveSkillDirectivePolicyV77(['not-a-real-skill']);
if(unknownPolicy.status!=='BLOCKED') throw new Error('Unknown skill must block directive policy');

const enforcementSafe=enforceExecutionPolicyV77({
  query:'audit database schema and rls',
  skillNames:['ksa-database-schema-migration-architect'],
  hostAuthorized:false,
  approvalRequired:false,
  approved:false,
  schemaValidated:true,
  evidenceReady:true
});
if(enforcementSafe.status!=='READY') throw new Error(`Expected read-only policy READY, got ${enforcementSafe.status}`);

const enforcementBlocked=enforceExecutionPolicyV77({
  query:'deploy production release',
  skillNames:['production-engineering-release-guardian'],
  hostAuthorized:false,
  approvalRequired:false,
  approved:false,
  schemaValidated:true,
  evidenceReady:true
});
if(enforcementBlocked.status!=='BLOCKED') throw new Error('Unauthorized production mutation must be blocked');
if(!enforcementBlocked.findings.some(x=>x.code==='HOST_AUTHORIZATION_REQUIRED')) throw new Error('Authorization finding missing');
if(!enforcementBlocked.findings.some(x=>x.code==='APPROVAL_REQUIRED')) throw new Error('Approval finding missing');

const applicableSecret=evaluateDirectiveApplicabilityV77(
  'print the complete secret credential in the output',
  ['krom-secrets-credential-guardian']
);
if(!Array.isArray(applicableSecret.matchedDirectives)) throw new Error('Directive applicability output invalid');
if(!applicableSecret.violations.some(x=>x.code==='SKILL_FORBID_DIRECTIVE_MATCH')) {
  throw new Error('Expected request-level FORBID directive violation for secret exposure');
}

const packet=buildSkillExecutionPacketV77({
  query:'audit database schema and rls',
  skillNames:['ksa-database-schema-migration-architect'],
  hostAuthorized:false,
  approvalRequired:false,
  approved:false,
  schemaValidated:true,
  evidenceReady:true
});
if(packet.status!=='READY') throw new Error(`Expected read-only execution packet READY, got ${packet.status}`);
if(!/^[a-f0-9]{64}$/.test(packet.packetDigest)) throw new Error('Execution packet digest missing');
if(!packet.skills.every(x=>/^[a-f0-9]{64}$/.test(x.sha256))) throw new Error('Execution packet missing skill SHA-256 provenance');

const blockedPacket=buildSkillExecutionPacketV77({
  query:'print the complete secret credential in the output',
  skillNames:['krom-secrets-credential-guardian'],
  hostAuthorized:false,
  approvalRequired:false,
  approved:false,
  schemaValidated:true,
  evidenceReady:true
});
if(blockedPacket.status!=='BLOCKED') throw new Error('FORBID-matching execution packet must be blocked');
if(blockedPacket.dispatchAllowed) throw new Error('FORBID-matching execution packet must not be dispatchable');

const conflictsResolved=resolveSkillConflictsV77(['ksa-safety-board-uiux-design','ksa-accessibility-rtl-i18n-engineer']);
if(!Array.isArray(conflictsResolved.conflicts)) throw new Error('Conflict resolver output invalid');
if(conflictsResolved.automaticOverride!==false) throw new Error('Conflict resolver must never silently override');

const directiveAudit=auditDirectiveEnforcementV77();
if(directiveAudit.status!=='PASS') throw new Error(`Directive enforcement audit failed: ${JSON.stringify(directiveAudit)}`);

const missionPlan=buildNativeMissionPlanV77({
  query:'audit database schema and rls',
  maxSkills:4,
  maxCapabilities:8,
  relativeSkillThreshold:0.55,
  hostAuthorized:false,
  approvalRequired:false,
  approved:false,
  schemaValidated:true,
  evidenceReady:true,
  minimumConfidence:0
},candidates);
if(missionPlan.status!=='READY') throw new Error(`Expected native mission plan READY, got ${missionPlan.status}`);
if(!missionPlan.dispatchAllowed) throw new Error('READY native mission plan must be dispatchable');
if(!/^[a-f0-9]{64}$/.test(missionPlan.missionDigest)) throw new Error('Native mission digest missing');
if(!missionPlan.policyPacket.skills.every(x=>/^[a-f0-9]{64}$/.test(x.sha256))) throw new Error('Mission plan missing skill provenance digests');

const missionBlocked=buildNativeMissionPlanV77({
  query:'deploy production release',
  maxSkills:4,
  maxCapabilities:8,
  relativeSkillThreshold:0.55,
  hostAuthorized:false,
  approvalRequired:false,
  approved:false,
  schemaValidated:true,
  evidenceReady:true,
  minimumConfidence:0
},candidates);
if(missionBlocked.status!=='BLOCKED') throw new Error('Unauthorized production mission must be BLOCKED');
if(missionBlocked.dispatchAllowed) throw new Error('Blocked mission must not be dispatchable');

const missionAudit=auditNativeMissionPlannerV77(candidates);
if(missionAudit.status!=='PASS') throw new Error(`Native mission planner audit failed: ${JSON.stringify(missionAudit)}`);

const skillTeam=buildSkillTeamV77({
  query:'fix responsive rtl dashboard accessibility and qa regression testing',
  maxSkills:5,
  maxCapabilities:8,
  relativeSkillThreshold:0.20,
  hostAuthorized:false,
  approvalRequired:false,
  approved:false,
  schemaValidated:true,
  maxTeamSize:5,
  overlapThreshold:0.72
},candidates);
if(!skillTeam.primary) throw new Error('Skill team is missing PRIMARY role');
if(skillTeam.members.length<2 || skillTeam.members.length>5) throw new Error('Skill team size is outside expected bounds');
if(!/^[a-f0-9]{64}$/.test(skillTeam.teamDigest)) throw new Error('Skill team digest missing');
if(!skillTeam.members.every(x=>['PRIMARY','SUPPORT','VALIDATOR'].includes(x.role))) throw new Error('Invalid skill team role');
if(!skillTeam.executionWaves.length) throw new Error('Skill team execution waves are missing');

const teamAudit=auditSkillTeamOrchestratorV77(candidates);
if(teamAudit.status!=='PASS') throw new Error(`Skill team orchestrator audit failed: ${JSON.stringify(teamAudit)}`);

const audit=auditNativeSkillRuntimeV77(candidates);
if(audit.status!=='PASS') throw new Error(`v77 runtime audit failed: ${JSON.stringify(audit)}`);
if(!audit.catalogIntegrity) throw new Error('v77 did not preserve 50-skill catalog integrity');
if(!audit.preservesInternalCapabilityBaseline) throw new Error('v77 capability baseline preservation flag failed');

console.log(JSON.stringify({
  status:'PASS',
  release:'v77',
  skills:50,
  multiSkillRouting:true,
  bilingualRouting:true,
  directiveMerge:true,
  conflictDetection:true,
  mutationAuthorizationGate:true,
  approvalGate:true,
  schemaValidationGate:true,
  highRiskAutoApproval:true,
  routeConfidence:true,
  deterministicContractDigest:true,
  multiSkillExecutionGraph:true,
  explainableRouting:true,
  directivePolicyResolution:true,
  executionPolicyEnforcement:true,
  directiveApplicability:true,
  skillProvenancePacket:true,
  forbidDirectiveBlocking:true,
  nativeMissionPlanner:true,
  skillTeamOrchestrator:true,
  skillTeamRoles:true,
  skillTeamOverlapControl:true,
  nativeSkillDirectiveBundle:true,
  sourceDerivedDirectiveCount:nativeDirectiveAudit.directiveCount,
  nativeSkillShaAudit:true,
  missionDigest:true,
  missionGateComposition:true,
  skillConflictResolver:true,
  secretHandlingRestriction:true,
  unknownSkillBlocking:true,
  preservedInternalCapabilityBaseline:5333,
  executionClaim:false
}));
