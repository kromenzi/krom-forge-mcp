import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { V80_V43_INSTRUCTION_MANIFEST } from '../src/v80-v43-instruction-manifest';
import { V80_V43_HASH_CONTRACT } from '../src/v80-v43-instruction-contract';

const root=path.resolve(process.cwd());
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const skillsRoot=path.resolve(process.env.KROM_V43_SKILLS_ROOT??path.join(root,'skills'));
async function listSkillFiles(dir:string,base=dir):Promise<string[]> {
  const entries=await fs.readdir(dir,{withFileTypes:true});
  const files:string[]=[];
  for(const entry of entries){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) files.push(...await listSkillFiles(full,base));
    else if(entry.isFile() && entry.name==='SKILL.md') files.push(path.relative(base,full).split(path.sep).join('/'));
  }
  return files;
}
async function main(){
  const failures:string[]=[];
  const vectors=JSON.parse(await fs.readFile(path.join(root,'artifacts/v80-v43-instruction-test-vectors.json'),'utf8')) as {hashContract:string;algorithm:string;transformation:string;vectors:Array<{name:string;bytes:number;hexPrefix:string;instructionHash:string}>};
  if(V80_V43_INSTRUCTION_MANIFEST.length!==500) failures.push(`MANIFEST_COUNT:${V80_V43_INSTRUCTION_MANIFEST.length}`);
  if(V80_V43_HASH_CONTRACT!=='krom-instruction-raw-utf8-v1') failures.push('CONTRACT_ID');
  if(V80_V43_INSTRUCTION_MANIFEST.some(e=>e.name==='supabase-security-boundaries')) failures.push('EXCLUDED_SUPABASE_PRESENT');
  if(vectors.hashContract!==V80_V43_HASH_CONTRACT || vectors.algorithm!=='SHA-256' || vectors.transformation!=='none') failures.push('VECTOR_CONTRACT');
  const names=new Set<string>(); let rawMatches=0,legacyPreserved=0,utf8Valid=0,vectorMatches=0;
  const manifestPaths=new Set(V80_V43_INSTRUCTION_MANIFEST.map(entry=>entry.relativePath));
  // Existing baseline skills are outside the v4.3 pack; all other skill files must be registered.
  const baselineSkills=new Set(["auth-abuse-and-rate-limiting", "ci-dependency-quality-remediation", "evidence-provenance-and-scoring", "frontend-regression-repair", "git-pr-integrity-safety", "krom-3d-design-studio", "krom-function-audit-repair", "ksa-2026-security-quality-remediation", "migration-and-schema-safety", "production-runtime-verification", "production-security-hardening", "release-gate-and-readiness", "safe-rollback-and-recovery", "security-regression-prevention", "supabase-security-boundaries"]);
  const actualPaths=new Set((await listSkillFiles(skillsRoot)).filter(file=>!baselineSkills.has(file.split('/')[0])).map(file=>path.posix.join('skills',file)));
  for(const extra of [...actualPaths].filter(file=>!manifestPaths.has(file)).sort()) failures.push(`UNREGISTERED_SKILL_FILE:${extra}`);
  for(const missing of [...manifestPaths].filter(file=>!actualPaths.has(file)).sort()) failures.push(`MISSING_SKILL_FILE:${missing}`);
  for(const entry of V80_V43_INSTRUCTION_MANIFEST){
    if(names.has(entry.name)) failures.push(`DUPLICATE:${entry.name}`); names.add(entry.name);
    if(!actualPaths.has(entry.relativePath)) continue;
    const bytes=await fs.readFile(path.join(root,entry.relativePath));
    try { const text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes); if(!Buffer.from(text,'utf8').equals(bytes)) failures.push(`UTF8_ROUNDTRIP:${entry.name}`); else utf8Valid++; } catch { failures.push(`INVALID_UTF8:${entry.name}`); }
    const actual=sha(bytes); if(actual===entry.instructionHash && actual===entry.rawFileHash) rawMatches++; else failures.push(`HASH_MISMATCH:${entry.name}`);
    if(/^[a-f0-9]{64}$/.test(entry.legacyInstructionHash) && entry.legacyInstructionHashStatus==='LEGACY_UNPROVEN' && entry.legacyInstructionHashSource) legacyPreserved++; else failures.push(`LEGACY_METADATA:${entry.name}`);
    const vector=vectors.vectors.find(v=>v.name===entry.name); if(vector && vector.instructionHash===actual && vector.bytes===bytes.length && vector.hexPrefix===bytes.subarray(0,16).toString('hex')) vectorMatches++; else failures.push(`VECTOR_MISMATCH:${entry.name}`);
  }
  const result={status:failures.length?'FAIL':'PASS',hashContract:V80_V43_HASH_CONTRACT,count:V80_V43_INSTRUCTION_MANIFEST.length,manifestSkillFiles:manifestPaths.size,actualSkillFiles:actualPaths.size,rawHashMatches:rawMatches,utf8Valid,legacyPreserved,vectorMatches,excludedSupabase:!names.has('supabase-security-boundaries'),adapterExecutionAvailable:null,hostExecutionEvidenceEvaluated:false,decision:failures.length?'BLOCKED':'CONDITIONAL',blockers:failures.length?failures:['HOST_EXECUTION_EVIDENCE_NOT_EVALUATED_BY_PACK_CHECK'],note:'PASS proves package/loader integrity only; it is not execution evidence for the 500 skills.'};
  console.log(JSON.stringify(result,null,2));
  if(failures.length) process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
