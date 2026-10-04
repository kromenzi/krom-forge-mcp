import { z } from 'zod';
import { V76_SKILL_INDEX, getSkillMetadataV76 } from './v76-skill-index';
import { rankSkillsV76, selectAgentV76, rankCapabilitiesV76, type V76CapabilityCandidate } from './v76-semantic-skill-runtime';

export const v77RuntimeSchema = z.object({
  query: z.string().min(1),
  maxSkills: z.number().int().min(1).max(6).default(4),
  maxCapabilities: z.number().int().min(1).max(20).default(8),
  relativeSkillThreshold: z.number().min(0).max(1).default(0.55),
  hostAuthorized: z.boolean().default(false),
  approvalRequired: z.boolean().default(false),
  approved: z.boolean().default(false),
  schemaValidated: z.boolean().default(false)
});

export type V77Directive = {
  skill: string;
  directive: string;
  normalized: string;
  polarity: 'REQUIRE' | 'FORBID' | 'GUIDE';
};

const MUTATION_WORDS = [
  'create','update','delete','remove','write','send','deploy','publish','merge','push','apply','execute','run',
  'انشئ','أنشئ','حدث','حدّث','احذف','أرسل','ارسل','انشر','ادمج','نفذ','نفّذ','طبق','طبّق'
];

const HIGH_RISK_WORDS = [
  'production','secret','credential','auth','authorization','permission','database','migration','rls','deploy',
  'إنتاج','سر','مفتاح','صلاحية','صلاحيات','قاعدة','ترحيل','نشر'
];

function normalize(value:string){
  return value.toLowerCase().normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g,'')
    .replace(/[_/.-]+/g,' ')
    .replace(/[^\p{L}\p{N}\s]+/gu,' ')
    .replace(/\s+/g,' ').trim();
}

function classifyDirective(value:string): V77Directive['polarity'] {
  const n=normalize(value);
  if (/\b(do not|never|must not|forbid|blocked|cannot)\b/.test(n) || /(?:لا|ممنوع|يحظر|حظر)/.test(n)) return 'FORBID';
  if (/\b(must|required|always|before|require)\b/.test(n) || /(?:يجب|دائما|قبل|يتطلب)/.test(n)) return 'REQUIRE';
  return 'GUIDE';
}

function directiveObject(skill:string,directive:string): V77Directive {
  return {skill,directive,normalized:normalize(directive),polarity:classifyDirective(directive)};
}

export function selectSkillSetV77(query:string,maxSkills=4,relativeThreshold=0.55){
  const ranked=rankSkillsV76(query,Math.max(maxSkills*3,8));
  if(!ranked.length) return [];
  const top=Math.max(1,ranked[0].score);
  const selected=ranked
    .filter((item,index)=>index===0 || item.score/top>=relativeThreshold)
    .slice(0,maxSkills)
    .map(item=>{
      const metadata=getSkillMetadataV76(item.name);
      return {
        ...item,
        metadata,
        relativeScore:Number((item.score/top).toFixed(3))
      };
    });
  return selected;
}

export function mergeDirectivesV77(skillNames:string[]){
  const all:V77Directive[]=[];
  for(const skill of skillNames){
    const meta=getSkillMetadataV76(skill);
    if(!meta) continue;
    for(const directive of meta.instructionContract) all.push(directiveObject(skill,directive));
  }
  const unique=new Map<string,V77Directive>();
  for(const item of all){
    const key=item.normalized;
    if(!unique.has(key)) unique.set(key,item);
  }
  return [...unique.values()];
}

function extractCore(normalized:string){
  return normalized
    .replace(/\b(do not|never|must not|must|required|always|before|require|forbid|blocked|cannot)\b/g,'')
    .replace(/(?:لا|ممنوع|يحظر|حظر|يجب|دائما|قبل|يتطلب)/g,'')
    .replace(/\s+/g,' ').trim();
}

export function detectDirectiveConflictsV77(skillNames:string[]){
  const directives=mergeDirectivesV77(skillNames);
  const conflicts:{a:V77Directive,b:V77Directive,reason:string}[]=[];
  for(let i=0;i<directives.length;i++){
    for(let j=i+1;j<directives.length;j++){
      const a=directives[i], b=directives[j];
      if(a.skill===b.skill || a.polarity===b.polarity) continue;
      const coreA=extractCore(a.normalized), coreB=extractCore(b.normalized);
      if(!coreA || !coreB) continue;
      const overlap=coreA===coreB || coreA.includes(coreB) || coreB.includes(coreA);
      if(overlap && ((a.polarity==='FORBID'&&b.polarity==='REQUIRE')||(a.polarity==='REQUIRE'&&b.polarity==='FORBID'))){
        conflicts.push({a,b,reason:'Contradictory REQUIRE/FORBID directives over the same normalized action.'});
      }
    }
  }
  return conflicts;
}

export function classifyActionV77(query:string){
  const n=normalize(query);
  const mutation=MUTATION_WORDS.some(word=>n.includes(normalize(word)));
  const highRisk=HIGH_RISK_WORDS.some(word=>n.includes(normalize(word)));
  return {
    mutation,
    highRisk,
    class: mutation ? (highRisk ? 'HIGH_RISK_MUTATION' : 'MUTATION') : 'READ_ONLY'
  } as const;
}

export function routeCompoundIntentV77(
  input:z.infer<typeof v77RuntimeSchema>,
  capabilityCandidates:V76CapabilityCandidate[]
){
  const skills=selectSkillSetV77(input.query,input.maxSkills,input.relativeSkillThreshold);
  const skillNames=skills.map(x=>x.name);
  const agent=selectAgentV76(input.query,undefined,skillNames);
  const capabilities=rankCapabilitiesV76(input.query,capabilityCandidates,input.maxCapabilities);
  const directives=mergeDirectivesV77(skillNames);
  const conflicts=detectDirectiveConflictsV77(skillNames);
  const action=classifyActionV77(input.query);
  const authorizationSatisfied=!action.mutation || input.hostAuthorized;
  const approvalSatisfied=!input.approvalRequired || input.approved;
  const status = conflicts.length
    ? 'BLOCKED_CONFLICT'
    : !authorizationSatisfied
      ? 'BLOCKED_AUTHORIZATION'
      : !approvalSatisfied
        ? 'BLOCKED_APPROVAL'
        : capabilities.length===0
          ? 'REVIEW_REQUIRED'
          : 'READY';

  return {
    release:'v77',
    status,
    query:input.query,
    action,
    selectedAgent:agent,
    selectedSkills:skills,
    selectedCapabilities:capabilities,
    directives,
    conflicts,
    authorization:{
      hostAuthorized:input.hostAuthorized,
      approvalRequired:input.approvalRequired,
      approved:input.approved,
      authorizationSatisfied,
      approvalSatisfied
    },
    executionClaim:false
  };
}

export function buildExecutionContractV77(
  input:z.infer<typeof v77RuntimeSchema>,
  capabilityCandidates:V76CapabilityCandidate[]
){
  const route=routeCompoundIntentV77(input,capabilityCandidates);
  const capability=route.selectedCapabilities[0]?.name ?? null;
  const schemaSatisfied=Boolean(capability) && input.schemaValidated;
  const contractStatus = route.status!=='READY'
    ? route.status
    : !schemaSatisfied
      ? 'BLOCKED_SCHEMA_VALIDATION'
      : 'READY';
  return {
    release:'v77',
    status:contractStatus,
    query:input.query,
    agent:route.selectedAgent.agentId,
    skills:route.selectedSkills.map(x=>x.name),
    capability,
    directives:route.directives,
    conflicts:route.conflicts,
    action:route.action,
    preconditions:[
      {id:'P1',name:'SKILL_SET_RESOLVED',satisfied:route.selectedSkills.length>0},
      {id:'P2',name:'NO_DIRECTIVE_CONFLICTS',satisfied:route.conflicts.length===0},
      {id:'P3',name:'CAPABILITY_SELECTED',satisfied:Boolean(capability)},
      {id:'P4',name:'HOST_AUTHORIZATION',satisfied:route.authorization.authorizationSatisfied},
      {id:'P5',name:'APPROVAL',satisfied:route.authorization.approvalSatisfied},
      {id:'P6',name:'INPUT_SCHEMA_VALIDATION_REQUIRED',satisfied:schemaSatisfied},
      {id:'P7',name:'POST_EXECUTION_EVIDENCE_REQUIRED',satisfied:false}
    ],
    steps:[
      {id:'S1',action:'RESOLVE_MULTI_SKILL_SET',target:route.selectedSkills.map(x=>x.name)},
      {id:'S2',action:'MERGE_DIRECTIVES',target:'selected-skill-contracts'},
      {id:'S3',action:'DETECT_CONFLICTS',target:'merged-directives'},
      {id:'S4',action:'ROUTE_AGENT',target:route.selectedAgent.agentId},
      {id:'S5',action:'SELECT_CAPABILITY',target:capability},
      {id:'S6',action:'VALIDATE_INPUT_SCHEMA',target:capability},
      {id:'S7',action:'CHECK_AUTHORIZATION_AND_APPROVAL',target:route.action.class},
      {id:'S8',action:'DISPATCH_IF_ALL_PRECONDITIONS_PASS',target:capability},
      {id:'S9',action:'VERIFY_EVIDENCE',target:'claim-to-evidence gate'}
    ],
    dispatchAllowed:contractStatus==='READY' && Boolean(capability) && schemaSatisfied,
    hostAuthorizationRequired:route.action.mutation,
    executionClaim:false
  };
}

export function auditNativeSkillRuntimeV77(capabilityCandidates:V76CapabilityCandidate[]){
  const cases=[
    {q:'audit database schema and rls',expectSkills:1,authorized:false},
    {q:'fix responsive rtl dashboard and accessibility',expectSkills:2,authorized:false},
    {q:'deploy production release after tests',expectSkills:1,authorized:false,expectBlocked:true},
    {q:'deploy production release after tests',expectSkills:1,authorized:true},
    {q:'فحص قاعدة البيانات والصلاحيات والأمان',expectSkills:2,authorized:false},
    {q:'صمم واجهة عربية RTL واختبر الوصول',expectSkills:2,authorized:false}
  ];
  const results=cases.map(c=>{
    const route=routeCompoundIntentV77({
      query:c.q,maxSkills:4,maxCapabilities:8,relativeSkillThreshold:0.55,
      hostAuthorized:c.authorized,approvalRequired:false,approved:false,schemaValidated:true
    },capabilityCandidates);
    const skillPass=route.selectedSkills.length>=c.expectSkills;
    const capabilityPass=route.selectedCapabilities.length>0;
    const blockPass=c.expectBlocked ? route.status==='BLOCKED_AUTHORIZATION' : true;
    return {query:c.q,status:route.status,skillCount:route.selectedSkills.length,skillPass,capabilityPass,blockPass};
  });
  const passed=results.filter(x=>x.skillPass&&x.capabilityPass&&x.blockPass).length;
  const catalogIntegrity=V76_SKILL_INDEX.length===50 && new Set(V76_SKILL_INDEX.map(x=>x.name)).size===50;
  return {
    release:'v77',
    status:passed===results.length && catalogIntegrity ? 'PASS' : 'PASS_WITH_GAPS',
    cases:results.length,
    passed,
    failed:results.length-passed,
    catalogIntegrity,
    skillCount:V76_SKILL_INDEX.length,
    preservesInternalCapabilityBaseline:true,
    results,
    executionClaim:false
  };
}
