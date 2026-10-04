import { gunzipSync } from 'node:zlib';
import { V77_NATIVE_SKILL_DIRECTIVES_GZIP_BASE64 } from './v77-native-skill-directives-bundle';
import { getSkillMetadataV76 } from './v76-skill-index';

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
  const json=gunzipSync(Buffer.from(V77_NATIVE_SKILL_DIRECTIVES_GZIP_BASE64,'base64')).toString('utf8');
  const parsed=JSON.parse(json);
  if(!Array.isArray(parsed)) throw new Error('Invalid v77 native skill directive bundle');
  const normalized:V77NativeSkillDirectiveRecord[]=parsed.map((item:any)=>({
    name:String(item.name??''),
    sha256:String(item.sha256??''),
    headings:Array.isArray(item.headings)?item.headings.map(String):[],
    directives:Array.isArray(item.directives)?item.directives.map(String):[],
    sourceLines:Number(item.sourceLines??0)
  }));
  cache=Object.freeze(normalized);
  byName=new Map(normalized.map(x=>[x.name,x]));
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
  return item ? {...item,headings:[...item.headings],directives:[...item.directives]} : null;
}

export function auditNativeSkillDirectiveBundleV77(){
  const items=loadAll();
  const names=items.map(x=>x.name);
  const duplicates=names.filter((name,index)=>names.indexOf(name)!==index);
  const missingMetadata:string[]=[];
  const hashMismatches:{name:string,nativeSha256:string,metadataSha256:string}[]=[];
  const emptyDirectives:string[]=[];
  const invalidHashes:string[]=[];
  let directiveCount=0;

  for(const item of items){
    const metadata=getSkillMetadataV76(item.name);
    if(!metadata){
      missingMetadata.push(item.name);
      continue;
    }
    if(metadata.sha256!==item.sha256){
      hashMismatches.push({name:item.name,nativeSha256:item.sha256,metadataSha256:metadata.sha256});
    }
    if(!/^[a-f0-9]{64}$/.test(item.sha256)) invalidHashes.push(item.name);
    if(!item.directives.length) emptyDirectives.push(item.name);
    directiveCount+=item.directives.length;
  }

  const status=items.length===50 &&
    duplicates.length===0 &&
    missingMetadata.length===0 &&
    hashMismatches.length===0 &&
    emptyDirectives.length===0 &&
    invalidHashes.length===0 ? 'PASS' : 'FAIL';

  return {
    release:'v77',
    status,
    skillCount:items.length,
    expectedSkillCount:50,
    directiveCount,
    duplicateSkills:duplicates,
    missingMetadata,
    hashMismatches,
    emptyDirectives,
    invalidHashes,
    source:'uploaded-original-SKILL.md',
    executionClaim:false
  } as const;
}
