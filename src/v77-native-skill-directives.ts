import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { V77_NATIVE_SKILL_DIRECTIVES_GZIP_BASE64 } from './v77-native-skill-directives-bundle';
import { V76_SKILL_INDEX, getSkillMetadataV76 } from './v76-skill-index';

export type V77NativeSkillDirectiveRecord = {
  name:string;
  sha256:string;
  headings:string[];
  directives:string[];
  sourceLines:number;
};

let cache:readonly V77NativeSkillDirectiveRecord[]|null=null;
let byName:Map<string,V77NativeSkillDirectiveRecord>|null=null;

function loadAll(){
  if(cache) return cache;
  const compressed=Buffer.from(V77_NATIVE_SKILL_DIRECTIVES_GZIP_BASE64,'base64');
  const json=gunzipSync(compressed).toString('utf8');
  const parsed=JSON.parse(json);
  if(!Array.isArray(parsed)) throw new Error('Invalid v77 native SKILL.md directive bundle');

  const records:V77NativeSkillDirectiveRecord[]=parsed.map((item:any)=>({
    name:String(item.name??''),
    sha256:String(item.sha256??''),
    headings:Array.isArray(item.headings)?item.headings.map(String):[],
    directives:Array.isArray(item.directives)?item.directives.map(String):[],
    sourceLines:Number(item.sourceLines??0)
  }));

  cache=Object.freeze(records);
  byName=new Map(records.map(x=>[x.name,x]));
  return cache;
}

export function listNativeSkillDirectivesV77(){
  return loadAll().map(item=>({
    ...item,
    headings:[...item.headings],
    directives:[...item.directives]
  }));
}

export function getNativeSkillDirectivesV77(name:string){
  loadAll();
  const item=byName?.get(name);
  return item
    ? {...item,headings:[...item.headings],directives:[...item.directives]}
    : null;
}

export function auditNativeSkillDirectiveBundleV77(){
  const records=loadAll();
  const names=records.map(x=>x.name);
  const duplicates=names.filter((name,index)=>names.indexOf(name)!==index);
  const expected=new Set(V76_SKILL_INDEX.map(x=>x.name));
  const actual=new Set(names);
  const missingSkills=[...expected].filter(name=>!actual.has(name));
  const extraSkills=[...actual].filter(name=>!expected.has(name));
  const missingMetadata:string[]=[];
  const hashMismatches:{name:string,nativeSha256:string,metadataSha256:string}[]=[];
  const emptyDirectives:string[]=[];
  const invalidHashes:string[]=[];
  let directiveCount=0;

  for(const item of records){
    const metadata=getSkillMetadataV76(item.name);
    if(!metadata){
      missingMetadata.push(item.name);
      continue;
    }
    if(metadata.sha256!==item.sha256){
      hashMismatches.push({
        name:item.name,
        nativeSha256:item.sha256,
        metadataSha256:metadata.sha256
      });
    }
    if(!/^[a-f0-9]{64}$/.test(item.sha256)) invalidHashes.push(item.name);
    if(!item.directives.length) emptyDirectives.push(item.name);
    directiveCount+=item.directives.length;
  }

  const canonical=records.map(x=>({
    name:x.name,
    sha256:x.sha256,
    headings:x.headings,
    directives:x.directives,
    sourceLines:x.sourceLines
  }));
  const integrityDigest=createHash('sha256').update(JSON.stringify(canonical)).digest('hex');

  const status=records.length===50 &&
    duplicates.length===0 &&
    missingSkills.length===0 &&
    extraSkills.length===0 &&
    missingMetadata.length===0 &&
    hashMismatches.length===0 &&
    emptyDirectives.length===0 &&
    invalidHashes.length===0 &&
    directiveCount>=300 ? 'PASS' : 'FAIL';

  return {
    release:'v77',
    status,
    skillCount:records.length,
    expectedSkillCount:50,
    directiveCount,
    duplicateSkills:duplicates,
    missingSkills,
    extraSkills,
    missingMetadata,
    hashMismatches,
    emptyDirectives,
    invalidHashes,
    integrityDigest,
    source:'uploaded-original-SKILL.md',
    sourceSkillDigestsPreserved:hashMismatches.length===0,
    executionClaim:false
  } as const;
}
