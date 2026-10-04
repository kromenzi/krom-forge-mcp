import { createHash } from 'node:crypto';
import { getSkillMetadataV76 } from './v76-skill-index';
import { mergeDirectivesV77, detectDirectiveConflictsV77, classifyActionV77 } from './v77-native-skill-runtime';

export type V77EnforcementInput = {
  query:string;
  skillNames:string[];
  hostAuthorized?:boolean;
  approvalRequired?:boolean;
  approved?:boolean;
  schemaValidated?:boolean;
  evidenceReady?:boolean;
};

export type V77PolicyFinding = {
  code:string;
  severity:'INFO'|'LOW'|'MEDIUM'|'HIGH'|'CRITICAL';
  blocking:boolean;
  message:string;
  skills?:string[];
};

const MUTATION_TERMS=/\b(create|update|delete|remove|write|send|deploy|publish|merge|push|apply|execute|run)\b|(?:انشئ|أنشئ|حدث|حدّث|احذف|أرسل|ارسل|انشر|ادمج|نفذ|نفّذ|طبق|طبّق)/i;
const READ_ONLY_TERMS=/\b(audit|inspect|review|read|list|search|analyze|compare|check|verify)\b|(?:افحص|راجع|اقرأ|اعرض|ابحث|حلل|قارن|تحقق)/i;
const SECRET_TERMS=/\b(secret|credential|token|password|api key|private key)\b|(?:سر|اسرار|أسرار|كلمة مرور|مفتاح)/i;
const PROD_TERMS=/\b(prod|production|deploy|release|publish)\b|(?:إنتاج|الانتاج|الإنتاج|نشر|إصدار)/i;

function uniq<T>(xs:T[]){ return [...new Set(xs)]; }

function normalizeText(value:string){
  return value.toLowerCase().normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g,'')
    .replace(/[_/.-]+/g,' ')
    .replace(/[^\p{L}\p{N}\s]+/gu,' ')
    .replace(/\s+/g,' ').trim();
}

function tokens(value:string){
  return normalizeText(value).split(' ').filter(x=>x.length>2);
}

function contentWords(value:string){
  const stop=new Set([
    'the','and','for','with','from','that','this','into','only','before','after','must','never','always','required','require','without','when',
    'على','الى','إلى','في','من','عن','مع','قبل','بعد','يجب','دائما','دائمًا','بدون','عدم','هذا','هذه','التي','الذي'
  ]);
  return tokens(value).filter(x=>!stop.has(x));
}

function overlapScore(a:string,b:string){
  const aa=new Set(contentWords(a));
  const bb=new Set(contentWords(b));
  if(!aa.size || !bb.size) return 0;
  let hit=0;
  for(const x of aa) if(bb.has(x)) hit++;
  return hit/Math.max(1,Math.min(aa.size,bb.size));
}

function semanticDirectiveMatch(query:string,directive:string,polarity:'REQUIRE'|'FORBID'|'GUIDE'){
  const q=normalizeText(query);
  const d=normalizeText(directive);
  if(polarity==='FORBID'){
    const secretDomain=/(secret|credential|token|password|api key|private key|سر|اسرار|كلمة مرور|مفتاح)/.test(d)
      && /(secret|credential|token|password|api key|private key|سر|اسرار|كلمة مرور|مفتاح)/.test(q);
    const exposureIntent=/(print|show|display|expose|reveal|output|log|full|complete|اطبع|اعرض|اكشف|اظهر|كامل)/.test(q);
    if(secretDomain && exposureIntent) return true;

    const productionBlind=/(production|prod|deploy|release|انتاج|نشر|اصدار)/.test(d)
      && /(production|prod|deploy|release|انتاج|نشر|اصدار)/.test(q)
      && /(blind|without test|without verification|force|تجاهل|بدون اختبار|بدون تحقق|اجبار)/.test(q);
    if(productionBlind) return true;
  }
  return false;
}


export function evaluateDirectiveApplicabilityV77(query:string,skillNames:string[]){
  const policy=resolveSkillDirectivePolicyV77(skillNames);
  const directives=mergeDirectivesV77(policy.skills);
  const action=classifyActionV77(query);
  const queryNorm=normalizeText(query);
  const queryWords=new Set(contentWords(query));
  const matched=directives.map(directive=>{
    const core=directive.normalized
      .replace(/\b(do not|never|must not|must|required|always|before|require|forbid|blocked|cannot)\b/g,'')
      .replace(/(?:لا|ممنوع|يحظر|حظر|يجب|دائما|قبل|يتطلب)/g,'')
      .trim();
    const coreWords=contentWords(core);
    const exact=core && queryNorm.includes(core);
    const tokenHits=coreWords.filter(w=>queryWords.has(w));
    const score=exact?1:overlapScore(query,core);
    const semanticMatch=semanticDirectiveMatch(query,directive.directive,directive.polarity);
    const applicable=exact || semanticMatch || tokenHits.length>=2 || score>=0.34;
    return {...directive,core,score:Number(score.toFixed(3)),tokenHits,semanticMatch,applicable};
  }).filter(x=>x.applicable);

  const forbidden=matched.filter(x=>x.polarity==='FORBID');
  const required=matched.filter(x=>x.polarity==='REQUIRE');
  const guides=matched.filter(x=>x.polarity==='GUIDE');

  const violations:V77PolicyFinding[]=[];
  for(const item of forbidden){
    violations.push({
      code:'SKILL_FORBID_DIRECTIVE_MATCH',
      severity:action.highRisk?'CRITICAL':'HIGH',
      blocking:true,
      message:`Request matches a FORBID directive from ${item.skill}: ${item.directive}`,
      skills:[item.skill]
    });
  }

  return {
    release:'v77',
    query,
    skills:policy.skills,
    action,
    matchedDirectives:matched,
    requiredPreconditions:required.map((x,index)=>({
      id:`REQ_${index+1}`,
      skill:x.skill,
      directive:x.directive,
      satisfied:false,
      evidenceRequired:true
    })),
    guideDirectives:guides,
    violations,
    status:violations.length?'BLOCKED':'PASS',
    executionClaim:false
  } as const;
}

export function buildSkillExecutionPacketV77(input:V77EnforcementInput){
  const policy=enforceExecutionPolicyV77(input);
  const applicability=evaluateDirectiveApplicabilityV77(input.query,input.skillNames);
  const skills=uniq(input.skillNames).map(name=>getSkillMetadataV76(name)).filter(Boolean).map(skill=>({
    name:skill!.name,
    sha256:skill!.sha256,
    preferredAgents:skill!.preferredAgents,
    domains:skill!.domains
  }));

  const allFindings=[...policy.findings,...applicability.violations];
  const blocking=allFindings.filter(x=>x.blocking);
  const canonical={
    release:'v77',
    query:input.query,
    skills:skills.map(x=>({name:x.name,sha256:x.sha256})),
    action:policy.action,
    policyDigest:policy.policyDigest,
    matchedDirectives:applicability.matchedDirectives.map(x=>({
      skill:x.skill,normalized:x.normalized,polarity:x.polarity,score:x.score
    })),
    blockingCodes:blocking.map(x=>x.code).sort(),
    schemaValidated:Boolean(input.schemaValidated),
    evidenceReady:Boolean(input.evidenceReady),
    hostAuthorized:Boolean(input.hostAuthorized),
    approved:Boolean(input.approved)
  };
  const packetDigest=createHash('sha256').update(JSON.stringify(canonical)).digest('hex');

  return {
    ...canonical,
    skills,
    policy,
    applicability,
    findings:allFindings,
    requiredPreconditions:applicability.requiredPreconditions,
    status:blocking.length?'BLOCKED':'READY',
    packetDigest,
    dispatchAllowed:blocking.length===0 && policy.dispatchAllowed,
    executionClaim:false
  } as const;
}

export function resolveSkillDirectivePolicyV77(skillNames:string[]){
  const known=uniq(skillNames).map(name=>getSkillMetadataV76(name)).filter(Boolean);
  const directives=mergeDirectivesV77(known.map(x=>x!.name));
  const conflicts=detectDirectiveConflictsV77(known.map(x=>x!.name));
  const findings:V77PolicyFinding[]=[];

  if(known.length!==uniq(skillNames).length){
    findings.push({
      code:'UNKNOWN_SKILL',
      severity:'HIGH',
      blocking:true,
      message:'One or more requested skills are not present in the validated 50-skill catalog.'
    });
  }

  for(const conflict of conflicts){
    findings.push({
      code:'DIRECTIVE_CONFLICT',
      severity:'HIGH',
      blocking:true,
      message:conflict.reason,
      skills:uniq([conflict.a.skill,conflict.b.skill])
    });
  }

  const forbid=directives.filter(x=>x.polarity==='FORBID');
  const require=directives.filter(x=>x.polarity==='REQUIRE');
  if(!directives.length){
    findings.push({
      code:'EMPTY_DIRECTIVE_SET',
      severity:'MEDIUM',
      blocking:false,
      message:'Selected skill set produced no explicit enforceable directives; continue under global authorization, schema and evidence gates.'
    });
  }

  return {
    release:'v77',
    skills:known.map(x=>x!.name),
    directiveCount:directives.length,
    requireCount:require.length,
    forbidCount:forbid.length,
    guideCount:directives.filter(x=>x.polarity==='GUIDE').length,
    conflicts,
    findings,
    status:findings.some(x=>x.blocking)?'BLOCKED':'PASS',
    executionClaim:false
  } as const;
}

export function enforceExecutionPolicyV77(input:V77EnforcementInput){
  const policy=resolveSkillDirectivePolicyV77(input.skillNames);
  const action=classifyActionV77(input.query);
  const applicability=evaluateDirectiveApplicabilityV77(input.query,input.skillNames);
  const findings:V77PolicyFinding[]=[...policy.findings,...applicability.violations];
  const mutating=MUTATION_TERMS.test(input.query) || action.mutation;
  const readOnly=READ_ONLY_TERMS.test(input.query) && !mutating;
  const secretSensitive=SECRET_TERMS.test(input.query);
  const productionSensitive=PROD_TERMS.test(input.query) || action.highRisk;

  if(mutating && !input.hostAuthorized){
    findings.push({
      code:'HOST_AUTHORIZATION_REQUIRED',
      severity:'CRITICAL',
      blocking:true,
      message:'Mutating actions require explicit host authorization.'
    });
  }

  const effectiveApprovalRequired=Boolean(input.approvalRequired || (mutating && (productionSensitive || secretSensitive)));
  if(effectiveApprovalRequired && !input.approved){
    findings.push({
      code:'APPROVAL_REQUIRED',
      severity:productionSensitive?'CRITICAL':'HIGH',
      blocking:true,
      message:'This action crosses an approval boundary and cannot proceed without approval.'
    });
  }

  if(!input.schemaValidated){
    findings.push({
      code:'SCHEMA_VALIDATION_REQUIRED',
      severity:'HIGH',
      blocking:true,
      message:'Capability input schema must be validated before dispatch.'
    });
  }

  if(mutating && !input.evidenceReady){
    findings.push({
      code:'PRE_EXECUTION_EVIDENCE_REQUIRED',
      severity:'HIGH',
      blocking:true,
      message:'Mutation requires pre-execution evidence sufficient to support the intended change and rollback.'
    });
  }

  if(secretSensitive){
    findings.push({
      code:'SECRET_HANDLING_RESTRICTION',
      severity:'HIGH',
      blocking:false,
      message:'Never expose full secrets or credentials in logs, evidence, prompts, or tool output.'
    });
  }

  const blocking=findings.filter(x=>x.blocking);
  const status=blocking.length?'BLOCKED':'READY';
  const canonical={
    release:'v77',
    query:input.query,
    skills:policy.skills,
    action:action.class,
    readOnly,
    mutating,
    productionSensitive,
    secretSensitive,
    effectiveApprovalRequired,
    hostAuthorized:Boolean(input.hostAuthorized),
    approved:Boolean(input.approved),
    schemaValidated:Boolean(input.schemaValidated),
    evidenceReady:Boolean(input.evidenceReady),
    blockingCodes:blocking.map(x=>x.code).sort(),
    matchedDirectiveCount:applicability.matchedDirectives.length,
    requiredDirectiveCount:applicability.requiredPreconditions.length
  };
  return {
    ...canonical,
    status,
    findings,
    applicability,
    policyDigest:createHash('sha256').update(JSON.stringify(canonical)).digest('hex'),
    dispatchAllowed:status==='READY',
    executionClaim:false
  } as const;
}

export function resolveSkillConflictsV77(skillNames:string[]){
  const policy=resolveSkillDirectivePolicyV77(skillNames);
  const precedence=[
    'Host authorization and explicit approval boundaries',
    'Security / secrets / destructive-action prohibitions',
    'Skill-specific MUST NOT / NEVER constraints',
    'Skill-specific MUST / REQUIRED constraints',
    'Guidance and preferences'
  ];
  return {
    release:'v77',
    skillNames:uniq(skillNames),
    conflictCount:policy.conflicts.length,
    conflicts:policy.conflicts,
    precedence,
    resolution:policy.conflicts.length
      ? 'HUMAN_OR_HIGHER_POLICY_REVIEW_REQUIRED'
      : 'NO_CONFLICT',
    automaticOverride:false,
    executionClaim:false
  } as const;
}

export function auditDirectiveEnforcementV77(){
  const safe=enforceExecutionPolicyV77({
    query:'audit database schema and rls',
    skillNames:['ksa-database-schema-migration-architect'],
    hostAuthorized:false,
    approved:false,
    schemaValidated:true,
    evidenceReady:true
  });
  const unauthorized=enforceExecutionPolicyV77({
    query:'deploy production release',
    skillNames:['production-engineering-release-guardian'],
    hostAuthorized:false,
    approved:false,
    schemaValidated:true,
    evidenceReady:true
  });
  const noSchema=enforceExecutionPolicyV77({
    query:'inspect security authorization',
    skillNames:['krom-secure-code-auditor'],
    hostAuthorized:false,
    approved:false,
    schemaValidated:false,
    evidenceReady:true
  });
  const secret=enforceExecutionPolicyV77({
    query:'update production api key secret',
    skillNames:['krom-secrets-credential-guardian'],
    hostAuthorized:true,
    approved:true,
    schemaValidated:true,
    evidenceReady:true
  });
  const unknown=resolveSkillDirectivePolicyV77(['not-a-real-skill']);

  const checks={
    readOnlyAllowed:safe.status==='READY',
    unauthorizedMutationBlocked:unauthorized.status==='BLOCKED' && unauthorized.findings.some(x=>x.code==='HOST_AUTHORIZATION_REQUIRED'),
    productionApprovalBlocked:unauthorized.findings.some(x=>x.code==='APPROVAL_REQUIRED'),
    schemaGateBlocked:noSchema.status==='BLOCKED' && noSchema.findings.some(x=>x.code==='SCHEMA_VALIDATION_REQUIRED'),
    secretRestrictionPresent:secret.findings.some(x=>x.code==='SECRET_HANDLING_RESTRICTION'),
    unknownSkillBlocked:unknown.status==='BLOCKED'
  };
  const passed=Object.values(checks).filter(Boolean).length;
  return {
    release:'v77',
    status:passed===Object.keys(checks).length?'PASS':'FAIL',
    checks,
    passed,
    total:Object.keys(checks).length,
    executionClaim:false
  } as const;
}
