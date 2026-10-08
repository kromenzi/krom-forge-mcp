import fs from 'node:fs/promises';
import path from 'node:path';
import { V80_V43_INSTRUCTION_MANIFEST, type V80V43InstructionManifestEntry } from './v80-v43-instruction-manifest';
import { assertExecutionTextMatchesBytes, hashOriginalInstructionBytes, decodeOriginalUtf8, V80_V43_HASH_CONTRACT } from './v80-v43-instruction-contract';

export type V80V43LoadedInstruction = {
  skillName:string;
  instruction:string;
  instructionBytes:Buffer;
  instructionHash:string;
  rawFileHash:string;
  trustedRawFileHash:string;
  trustedInstructionHash:string;
  hashContract:typeof V80_V43_HASH_CONTRACT;
  legacyInstructionHash:string;
  legacyInstructionHashStatus:'LEGACY_UNPROVEN';
  legacyInstructionHashSource:string;
};
const byName=new Map(V80_V43_INSTRUCTION_MANIFEST.map(entry=>[entry.name,entry]));
const root=path.resolve(process.cwd());
function entryFor(skillName:string){
  if(typeof skillName!=='string' || skillName.includes('/') || skillName.includes('\\') || skillName.includes('..')) throw new Error('INVALID_SKILL_NAME');
  const entry=byName.get(skillName); if(!entry) throw new Error('UNKNOWN_SKILL_NAME'); return entry;
}
function fileFor(entry:V80V43InstructionManifestEntry){
  const file=path.resolve(root,entry.relativePath); if(file!==root && !file.startsWith(root+path.sep)) throw new Error('PATH_TRAVERSAL_BLOCKED'); return file;
}
export function listV43InstructionManifestV80(){return [...V80_V43_INSTRUCTION_MANIFEST];}
export function getV43InstructionManifestEntryV80(skillName:string){return entryFor(skillName);}
export async function loadV43InstructionBundleV80(skillName:string):Promise<V80V43LoadedInstruction>{
  const entry=entryFor(skillName); const bytes=await fs.readFile(fileFor(entry));
  const instruction=decodeOriginalUtf8(bytes,skillName); const hash=hashOriginalInstructionBytes(bytes,skillName);
  assertExecutionTextMatchesBytes(instruction,bytes,skillName);
  return {skillName,instruction,instructionBytes:bytes,instructionHash:hash,rawFileHash:hash,trustedRawFileHash:entry.rawFileHash,trustedInstructionHash:entry.instructionHash,hashContract:V80_V43_HASH_CONTRACT,legacyInstructionHash:entry.legacyInstructionHash,legacyInstructionHashStatus:entry.legacyInstructionHashStatus,legacyInstructionHashSource:entry.legacyInstructionHashSource};
}
export async function loadV43InstructionV80(skillName:string){return (await loadV43InstructionBundleV80(skillName)).instruction;}
export async function inspectV43InstructionIntegrityV80(skillName:string){
  const bundle=await loadV43InstructionBundleV80(skillName); const entry=entryFor(skillName);
  return {...entry,rawFileHashObserved:bundle.rawFileHash,instructionHashObserved:bundle.instructionHash,rawFileVerified:bundle.rawFileHash===entry.rawFileHash,instructionHashVerified:bundle.instructionHash===entry.instructionHash,legacyStatus:'LEGACY_UNPROVEN' as const};
}
export const V80_V43_INSTRUCTION_LOADER_META=Object.freeze({skillCount:V80_V43_INSTRUCTION_MANIFEST.length,hashContract:V80_V43_HASH_CONTRACT,transformation:'SHA-256(exact original SKILL.md bytes)',normalization:'none',trim:'none',newlineRewrite:'none',invalidUtf8:'rejected',legacyStatus:'LEGACY_UNPROVEN',fixtureEligibleAsHost:false} as const);
