import { V76_SKILL_INDEX } from '../src/v76-skill-index';
import {
  selectSkillSetV77,
  mergeDirectivesV77,
  detectDirectiveConflictsV77,
  classifyActionV77,
  buildExecutionContractV77,
  auditNativeSkillRuntimeV77
} from '../src/v77-native-skill-runtime';

const candidates=[
  {name:'krom_audit_database_architecture',title:'Audit database architecture',description:'database schema migration rls audit'},
  {name:'krom_audit_ui',title:'Audit UI',description:'ui ux responsive rtl accessibility dashboard'},
  {name:'krom_evaluate_security_assessment',title:'Security assessment',description:'security auth authorization secrets threats'},
  {name:'krom_decide_release',title:'Decide release',description:'release deployment production rollback gate'},
  {name:'krom_generate_test_plan',title:'Generate test plan',description:'qa tests regression e2e verification'},
  {name:'krom_v72_build_skill_tool_chain',title:'Build skill tool chain',description:'skill capability tool chain orchestration'}
];

if(V76_SKILL_INDEX.length!==50) throw new Error(`Expected 50 v76 skills, got ${V76_SKILL_INDEX.length}`);

const compound=selectSkillSetV77('fix responsive rtl dashboard accessibility and test it',4,0.55);
if(compound.length<2) throw new Error('Expected multi-skill selection for compound UI/accessibility request');

const arabic=selectSkillSetV77('فحص قاعدة البيانات والصلاحيات والأمان',4,0.55);
if(arabic.length<2) throw new Error('Expected multi-skill selection for Arabic compound request');

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
  approved:false
},candidates);
if(blocked.status!=='BLOCKED_AUTHORIZATION') throw new Error(`Expected BLOCKED_AUTHORIZATION, got ${blocked.status}`);
if(blocked.dispatchAllowed) throw new Error('Unauthorized mutation must not be dispatchable');

const authorized=buildExecutionContractV77({
  query:'deploy production release after tests',
  maxSkills:4,
  maxCapabilities:8,
  relativeSkillThreshold:0.55,
  hostAuthorized:true,
  approvalRequired:false,
  approved:false
},candidates);
if(authorized.status==='BLOCKED_AUTHORIZATION') throw new Error('Authorized mutation remained authorization-blocked');

const approvalBlocked=buildExecutionContractV77({
  query:'deploy production release after tests',
  maxSkills:4,
  maxCapabilities:8,
  relativeSkillThreshold:0.55,
  hostAuthorized:true,
  approvalRequired:true,
  approved:false
},candidates);
if(approvalBlocked.status!=='BLOCKED_APPROVAL') throw new Error(`Expected BLOCKED_APPROVAL, got ${approvalBlocked.status}`);

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
  preservedInternalCapabilityBaseline:5333,
  executionClaim:false
}));
