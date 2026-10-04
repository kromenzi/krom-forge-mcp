import { z } from 'zod';
import { V75_AGENT_IDS } from './v75-agent-capability-fabric';
import { V76_SKILL_INDEX, getSkillMetadataV76 } from './v76-skill-index';

export const v76SemanticRuntimeSchema = z.object({
  query: z.string().min(1),
  agentHint: z.enum(V75_AGENT_IDS).optional(),
  maxResults: z.number().int().min(1).max(25).default(10),
  ambiguityThreshold: z.number().min(0).max(1).default(0.18)
});

export type V76CapabilityCandidate = {
  name: string;
  title?: string;
  description?: string;
  publicDirect?: boolean;
};

const AGENT_KEYWORDS: Record<(typeof V75_AGENT_IDS)[number], string[]> = {
  orchestrator: ['orchestrate','coordinate','mission','workflow','cross','multi','plan','portfolio','تنسيق','تخطيط','مهمة'],
  architect: ['architecture','architect','design system','boundary','dependency','adr','معمارية','هيكل','تصميم النظام'],
  researcher: ['research','source','evidence','requirements','investigate','بحث','مصادر','متطلبات'],
  backend: ['backend','api','server','service','endpoint','node','fastify','express','خلفية','واجهة برمجية'],
  frontend: ['frontend','react','next','component','route','form','client','واجهة','صفحة','مكون'],
  uiux: ['ui','ux','design','responsive','rtl','accessibility','figma','تصميم','واجهة','تجربة المستخدم'],
  database: ['database','db','schema','migration','sql','postgres','supabase','rls','قاعدة','بيانات','ترحيل'],
  security: ['security','auth','authorization','secret','threat','vulnerability','sast','dast','أمن','صلاحيات','ثغرة'],
  qa: ['qa','test','e2e','regression','coverage','verify','اختبار','تحقق','جودة'],
  devops: ['deploy','deployment','vercel','ci','cd','pipeline','runtime','observability','نشر','تشغيل'],
  'release-auditor': ['release','readiness','gate','rollback','production','audit','إصدار','جاهزية','تدقيق']
};

const SYNONYMS: Record<string,string[]> = {
  'ui':['ux','interface','frontend','design','واجهة','تصميم'],
  'ux':['ui','experience','interface','تجربة','واجهة'],
  'hse':['safety','ehs','osha','incident','risk','سلامة','سلامه'],
  'safety':['hse','ehs','incident','risk','hazard','سلامة','سلامه','خطر'],
  'database':['db','sql','postgres','schema','migration','supabase','قاعدة','بيانات'],
  'db':['database','sql','schema','postgres'],
  'deploy':['deployment','release','vercel','ci','cd','نشر'],
  'deployment':['deploy','release','vercel','production','نشر'],
  'auth':['authentication','authorization','rbac','rls','security','صلاحيات'],
  'security':['auth','authorization','secret','threat','vulnerability','أمن'],
  'test':['qa','e2e','regression','verify','coverage','اختبار'],
  'qa':['test','e2e','regression','verification','جودة'],
  'print':['pdf','report','document','a4','طباعة','تقرير'],
  'vision':['camera','computer','cv','esp','image','رؤية','كاميرا'],
  'agent':['orchestrator','workflow','automation','وكيل'],
  'skill':['capability','tool','plugin','مهارة','اداة','أداة'],
  'واجهة':['ui','ux','interface','frontend','design'],
  'تصميم':['design','ui','ux','architecture'],
  'سلامة':['safety','hse','ehs','risk','incident'],
  'سلامه':['safety','hse','ehs','risk','incident'],
  'قاعدة':['database','db','sql','schema'],
  'بيانات':['database','db','data','schema'],
  'نشر':['deploy','deployment','release','vercel'],
  'أمن':['security','auth','authorization','threat'],
  'امن':['security','auth','authorization','threat'],
  'صلاحيات':['auth','authorization','rbac','rls','security'],
  'اختبار':['test','qa','e2e','regression','verify'],
  'تحقق':['verify','test','qa','evidence'],
  'طباعة':['print','pdf','report','document'],
  'تقرير':['report','print','pdf','document'],
  'رؤية':['vision','camera','computer','cv'],
  'كاميرا':['vision','camera','computer','cv'],
  'وكيل':['agent','orchestrator','workflow'],
  'مهارة':['skill','capability','tool','plugin'],
  'اداة':['tool','capability','skill'],
  'أداة':['tool','capability','skill']
};

function normalize(value:string){
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g,'')
    .replace(/[_/.-]+/g,' ')
    .replace(/[^\p{L}\p{N}\s]+/gu,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function tokens(value:string){
  return normalize(value).split(' ').filter(Boolean);
}

function expandQuery(value:string){
  const base=tokens(value);
  const expanded=new Set(base);
  for(const token of base){
    for(const s of SYNONYMS[token] ?? []) expanded.add(normalize(s));
  }
  return [...expanded];
}

function trigrams(value:string){
  const v='  '+normalize(value)+'  ';
  const out=new Set<string>();
  for(let i=0;i<Math.max(0,v.length-2);i++) out.add(v.slice(i,i+3));
  return out;
}

function trigramSimilarity(a:string,b:string){
  const A=trigrams(a), B=trigrams(b);
  if(!A.size || !B.size) return 0;
  let intersection=0;
  for(const x of A) if(B.has(x)) intersection++;
  return (2*intersection)/(A.size+B.size);
}

function scoreText(query:string,text:string){
  const qTokens=expandQuery(query);
  const t=normalize(text);
  const tTokens=new Set(tokens(text));
  let score=0;
  let matched=0;
  for(const q of qTokens){
    if(!q) continue;
    if(tTokens.has(q)){ score+=8; matched++; continue; }
    if(t.includes(q)){ score+=5; matched++; continue; }
    const partial=[...tTokens].some(x=>x.startsWith(q)||q.startsWith(x));
    if(partial){ score+=3; matched++; }
  }
  score += trigramSimilarity(query,text)*10;
  const coverage=qTokens.length ? matched/qTokens.length : 0;
  return {score,coverage};
}

export function selectAgentV76(
  query:string,
  agentHint?: (typeof V75_AGENT_IDS)[number],
  skillNames:string[]=[]
){
  if(agentHint){
    return {agentId:agentHint,confidence:1,reason:'Explicit agent hint supplied',candidates:[{agentId:agentHint,score:1,coverage:1,skillAffinity:1}]};
  }
  const skillProfiles=skillNames
    .map(name=>getSkillMetadataV76(name))
    .filter((x): x is NonNullable<typeof x>=>Boolean(x))
    .slice(0,3);

  const ranked=V75_AGENT_IDS.map(agentId=>{
    const keywords=AGENT_KEYWORDS[agentId].join(' ');
    const {score,coverage}=scoreText(query,keywords);
    const skillAffinity=skillProfiles.reduce((total,skill,index)=>{
      if(!skill.preferredAgents.includes(agentId)) return total;
      return total + Math.max(0.5, 2-(index*0.5));
    },0);
    return {agentId,score:Number((score+(skillAffinity*4)).toFixed(3)),coverage,skillAffinity};
  }).sort((a,b)=>b.score-a.score || b.skillAffinity-a.skillAffinity);
  const top=ranked[0], second=ranked[1];
  const denom=Math.max(1,top.score);
  const margin=(top.score-second.score)/denom;
  const confidence=Math.max(0,Math.min(1,(top.coverage*0.5)+(Math.min(1,top.skillAffinity/2)*0.25)+(Math.max(0,margin)*0.25)));
  return {
    agentId: top.score>0 ? top.agentId : 'orchestrator',
    confidence:Number(confidence.toFixed(3)),
    reason:top.skillAffinity>0?'Semantic intent + selected-skill affinity':'Semantic intent ranking',
    candidates:ranked.slice(0,3)
  };
}

export function rankSkillsV76(query:string, maxResults=10){
  const ranked=V76_SKILL_INDEX.map(skill=>{
    const semanticText=[
      skill.name,
      skill.description,
      skill.domains.join(' '),
      skill.instructionContract.join(' '),
      skill.evidenceExpectations.join(' ')
    ].join(' ');
    const direct=scoreText(query,semanticText);
    const nameOnly=scoreText(query,skill.name);
    const domainOnly=scoreText(query,skill.domains.join(' '));
    const bonus=skill.name.includes('orchestrator')?0.25:0;
    return {
      name:skill.name,
      description:skill.description,
      sha256:skill.sha256,
      domains:skill.domains,
      preferredAgents:skill.preferredAgents,
      score:Number((direct.score+(nameOnly.score*0.35)+(domainOnly.score*0.25)+bonus).toFixed(3)),
      coverage:Number(Math.max(direct.coverage,nameOnly.coverage,domainOnly.coverage).toFixed(3))
    };
  }).filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score || b.coverage-a.coverage || a.name.localeCompare(b.name))
    .slice(0,maxResults);
  return ranked;
}

export function rankCapabilitiesV76(query:string,candidates:V76CapabilityCandidate[],maxResults=10){
  return candidates.map(candidate=>{
    const joined=[candidate.name,candidate.title??'',candidate.description??''].join(' ');
    const r=scoreText(query,joined);
    const exactName=normalize(candidate.name).includes(normalize(query)) ? 4 : 0;
    const publicBonus=candidate.publicDirect ? 0.25 : 0;
    return {...candidate,score:Number((r.score+exactName+publicBonus).toFixed(3)),coverage:Number(r.coverage.toFixed(3))};
  }).filter(x=>x.score>0)
    .sort((a,b)=>b.score-a.score || b.coverage-a.coverage || a.name.localeCompare(b.name))
    .slice(0,maxResults);
}

export function routeIntentV76(input:z.infer<typeof v76SemanticRuntimeSchema>, capabilityCandidates:V76CapabilityCandidate[]){
  const skills=rankSkillsV76(input.query,input.maxResults);
  const agent=selectAgentV76(input.query,input.agentHint,skills.map(x=>x.name));
  const capabilities=rankCapabilitiesV76(input.query,capabilityCandidates,input.maxResults);
  const skillGap=(skills[0]?.score??0)-(skills[1]?.score??0);
  const capabilityGap=(capabilities[0]?.score??0)-(capabilities[1]?.score??0);
  const normalizedGap=(value:number,top:number)=>top>0?value/top:0;
  const ambiguity=Math.max(
    skills.length>1 && normalizedGap(skillGap,skills[0].score)<input.ambiguityThreshold ? 1 : 0,
    capabilities.length>1 && normalizedGap(capabilityGap,capabilities[0].score)<input.ambiguityThreshold ? 1 : 0,
    agent.confidence<0.35 ? 1 : 0
  )===1;
  return {
    release:'v76',
    query:input.query,
    selectedAgent:agent,
    skills,
    capabilities,
    ambiguous:ambiguity,
    recommendation: ambiguity
      ? 'Request clarification or inspect top candidates before dispatch.'
      : 'Use the top-ranked skill and capability, then validate the target input schema before dispatch.'
  };
}

export function buildExecutionPlanV76(input:z.infer<typeof v76SemanticRuntimeSchema>, capabilityCandidates:V76CapabilityCandidate[]){
  const route=routeIntentV76(input,capabilityCandidates);
  const selectedSkill=route.skills[0]?.name ?? null;
  const selectedSkillMetadata=selectedSkill ? getSkillMetadataV76(selectedSkill) : null;
  const selectedCapability=route.capabilities[0]?.name ?? null;
  return {
    release:'v76',
    status: route.ambiguous || !selectedCapability ? 'REVIEW_REQUIRED' : 'READY',
    query:input.query,
    agent:route.selectedAgent.agentId,
    skill:selectedSkill,
    skillMetadata:selectedSkillMetadata,
    capability:selectedCapability,
    steps:[
      {id:'S1',action:'ROUTE_AGENT',target:route.selectedAgent.agentId},
      {id:'S2',action:'SELECT_SKILL',target:selectedSkill},
      {id:'S3',action:'SELECT_CAPABILITY',target:selectedCapability},
      {id:'S4',action:'VALIDATE_INPUT_SCHEMA',target:selectedCapability},
      {id:'S5',action:'DISPATCH_IF_AUTHORIZED',target:selectedCapability},
      {id:'S6',action:'VERIFY_EVIDENCE',target:'claim-to-evidence gate'}
    ],
    ambiguity:route.ambiguous,
    alternatives:{
      agents:route.selectedAgent.candidates ?? [],
      skills:route.skills.slice(1,4),
      capabilities:route.capabilities.slice(1,4)
    },
    hostAuthorizationRequired:true,
    executionClaim:false
  };
}

export function auditSemanticRouterV76(capabilityCandidates:V76CapabilityCandidate[]){
  const cases=[
    {q:'audit database schema migrations and rls',agents:['database'],skills:['ksa-database-schema-migration-architect']},
    {q:'fix responsive rtl ui ux dashboard',agents:['uiux','frontend'],skills:['ksa-safety-board-uiux-design','elite-product-uiux-designer']},
    {q:'security auth secrets threat model',agents:['security'],skills:['krom-appsec-threat-model-engineer','krom-secrets-credential-guardian','ksa-auth-rbac-rls-security-engineer']},
    {q:'deploy release rollback vercel pipeline',agents:['devops','release-auditor'],skills:['production-engineering-release-guardian','saudi-forge-public-deployment']},
    {q:'computer vision safety camera esp',agents:['architect','backend','security','qa'],skills:['ksa-computer-vision-safety-engineer','ksa-esp-vision-systems-engineer']},
    {q:'تصميم واجهة عربية RTL ولوحة معلومات متجاوبة',agents:['uiux','frontend'],skills:['ksa-safety-board-uiux-design','elite-product-uiux-designer','ksa-accessibility-rtl-i18n-engineer']},
    {q:'تدقيق قاعدة البيانات والترحيلات وسياسات RLS',agents:['database','security'],skills:['ksa-database-schema-migration-architect','ksa-auth-rbac-rls-security-engineer']},
    {q:'فحص الأسرار والمصادقة والصلاحيات والثغرات',agents:['security'],skills:['krom-secrets-credential-guardian','ksa-auth-rbac-rls-security-engineer','krom-secure-code-auditor']},
    {q:'اختبارات E2E وانحدار وجودة قبل الإنتاج',agents:['qa','release-auditor'],skills:['ksa-qa-e2e-test-automation-engineer','production-engineering-release-guardian']},
    {q:'طباعة تقرير PDF رسمي ثنائي اللغة',agents:['frontend','uiux','qa'],skills:['ksa-safety-board-print-document-architect','typst-pdf-maker','word-playbooks']}
  ];
  const results=cases.map(c=>{
    const skills=rankSkillsV76(c.q,5);
    const agent=selectAgentV76(c.q,undefined,skills.map(x=>x.name));
    const capability=rankCapabilitiesV76(c.q,capabilityCandidates,5);
    const agentPass=c.agents.includes(agent.agentId);
    const skillPass=skills.some(x=>c.skills.includes(x.name));
    const capabilityPass=capability.length>0;
    return {
      query:c.q,
      expectedAgents:c.agents,
      actualAgent:agent.agentId,
      expectedSkills:c.skills,
      topSkills:skills.map(x=>x.name),
      agentPass,
      skillPass,
      capabilityPass,
      capabilityCount:capability.length
    };
  });
  const passed=results.filter(x=>x.agentPass && x.skillPass && x.capabilityPass).length;
  return {
    release:'v76',
    status:passed===results.length?'PASS':'PASS_WITH_GAPS',
    cases:results.length,
    passed,
    failed:results.length-passed,
    results,
    capabilityCandidates:capabilityCandidates.length,
    criteria:'agent + skill + capability must all pass'
  };
}
