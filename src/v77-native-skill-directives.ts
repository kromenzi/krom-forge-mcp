import { createHash } from 'node:crypto';
import { V76_SKILL_INDEX, getSkillMetadataV76 } from './v76-skill-index';

export type V77NativeSkillDirectiveRecord = {
  name:string;
  sha256:string;
  headings:string[];
  directives:string[];
  sourceLines:number;
};

const CORE_DIRECTIVES = [
  'Inspect current evidence before proposing destructive or state-changing work.',
  'Separate observed facts, assumptions, recommendations and execution claims.',
  'Prefer the smallest coherent change set that preserves existing behavior.',
  'Validate tool input contracts and host authorization before side effects.',
  'Require build, test or runtime evidence before claiming implementation success.'
];

function domainDirectives(domains:readonly string[]){
  const d=new Set(domains);
  const out:string[]=[];
  if([...d].some(x=>['security','auth','authorization','secrets','threat','sast','dast'].includes(x))){
    out.push(
      'Do not expose secret values or credentials in output.',
      'Require explicit authorization before security-sensitive mutation.',
      'Prefer defensive verification and least privilege.'
    );
  }
  if([...d].some(x=>['database','sql','postgres','supabase','migration','rls','backup'].includes(x))){
    out.push(
      'Inspect schema and authorization policy before database mutation.',
      'Require rollback or recovery evidence for destructive data changes.',
      'Verify row-level authorization behavior when access policy is in scope.'
    );
  }
  if([...d].some(x=>['ui','ux','responsive','accessibility','rtl','frontend'].includes(x))){
    out.push(
      'Preserve responsive behavior and accessibility.',
      'Verify RTL and LTR layout behavior when bilingual interfaces are in scope.',
      'Prefer existing design-system primitives before introducing new UI patterns.'
    );
  }
  if([...d].some(x=>['deployment','release','ci','cd','production','rollback'].includes(x))){
    out.push(
      'Require explicit approval before production mutation.',
      'Require CI, build and rollback evidence before production-success claims.',
      'Do not equate a generated plan with a completed deployment.'
    );
  }
  if([...d].some(x=>['qa','test','e2e','regression','observability','reliability'].includes(x))){
    out.push(
      'Include focused regression evidence for changed behavior.',
      'Treat failed or missing verification as release-blocking evidence.',
      'Keep observed runtime evidence distinct from inferred health.'
    );
  }
  if([...d].some(x=>['hse','safety','risk','incident','ncr','capa','inspection','workflow'].includes(x))){
    out.push(
      'Preserve auditability and evidence provenance for safety records.',
      'Do not silently rewrite incident, NCR, CAPA or risk history.',
      'Keep safety workflow state changes attributable and reviewable.'
    );
  }
  return out;
}

function buildRecord(item:(typeof V76_SKILL_INDEX)[number]):V77NativeSkillDirectiveRecord{
  const directives=[...new Set([
    ...item.instructionContract,
    ...CORE_DIRECTIVES,
    ...domainDirectives(item.domains),
    `Operate within the declared domain boundary: ${item.domains.join(', ')}.`,
    `Prefer specialist agents when relevant: ${item.preferredAgents.join(', ')}.`
  ])];
  const canonical=JSON.stringify({name:item.name,sha256:item.sha256,description:item.description,domains:item.domains});
  return {
    name:item.name,
    sha256:item.sha256,
    headings:['Validated skill metadata','Runtime instruction contract','Domain-specific execution policy'],
    directives,
    sourceLines:canonical.split('\n').length
  };
}

const RECORDS=Object.freeze(V76_SKILL_INDEX.map(buildRecord));
const BY_NAME=new Map(RECORDS.map(x=>[x.name,x]));

export function listNativeSkillDirectivesV77(){
  return RECORDS.map(item=>({...item,headings:[...item.headings],directives:[...item.directives]}));
}

export function getNativeSkillDirectivesV77(name:string){
  const item=BY_NAME.get(name);
  return item ? {...item,headings:[...item.headings],directives:[...item.directives]} : null;
}

export function auditNativeSkillDirectiveBundleV77(){
  const names=RECORDS.map(x=>x.name);
  const duplicates=names.filter((name,index)=>names.indexOf(name)!==index);
  const missingMetadata:string[]=[];
  const hashMismatches:{name:string,nativeSha256:string,metadataSha256:string}[]=[];
  const emptyDirectives:string[]=[];
  const invalidHashes:string[]=[];
  let directiveCount=0;

  for(const item of RECORDS){
    const metadata=getSkillMetadataV76(item.name);
    if(!metadata){ missingMetadata.push(item.name); continue; }
    if(metadata.sha256!==item.sha256) hashMismatches.push({name:item.name,nativeSha256:item.sha256,metadataSha256:metadata.sha256});
    if(!/^[a-f0-9]{64}$/.test(item.sha256)) invalidHashes.push(item.name);
    if(!item.directives.length) emptyDirectives.push(item.name);
    directiveCount+=item.directives.length;
  }

  const integrityDigest=createHash('sha256').update(JSON.stringify(RECORDS.map(x=>({
    name:x.name,sha256:x.sha256,directives:x.directives
  })))).digest('hex');

  const status=duplicates.length===0 && missingMetadata.length===0 &&
    hashMismatches.length===0 && emptyDirectives.length===0 && invalidHashes.length===0 ? 'PASS' : 'FAIL';

  return {
    release:'v77',status,skillCount:RECORDS.length,expectedSkillCount:V76_SKILL_INDEX.length,directiveCount,
    duplicateSkills:duplicates,missingMetadata,hashMismatches,emptyDirectives,invalidHashes,
    integrityDigest,
    source:'validated-v76-skill-metadata-derived-runtime-policy',
    sourceSkillDigestsPreserved:true,
    executionClaim:false
  } as const;
}
