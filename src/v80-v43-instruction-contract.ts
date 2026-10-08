import { createHash } from 'node:crypto';

export const V80_V43_HASH_CONTRACT = 'krom-instruction-raw-utf8-v1' as const;
export const V80_V43_LEGACY_STATUS = 'LEGACY_UNPROVEN' as const;

export function decodeOriginalUtf8(bytes:Buffer,skillName:string):string {
  let text:string;
  // ignoreBOM=true means U+FEFF is ordinary content; it remains in text and in the hashed bytes.
  try { text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes); }
  catch { throw new Error(`INVALID_UTF8:${skillName}`); }
  if(!Buffer.from(text,'utf8').equals(bytes)) throw new Error(`UTF8_ROUNDTRIP_MISMATCH:${skillName}`);
  return text;
}

/** v4.3 hashes the exact original SKILL.md bytes. No trim, normalization, or newline rewrite. */
export function hashOriginalInstructionBytes(bytes:Buffer,skillName='unknown'):string {
  decodeOriginalUtf8(bytes,skillName);
  return createHash('sha256').update(bytes).digest('hex');
}

/** The execution text is valid only when UTF-8 re-encoding reproduces the loaded bytes exactly. */
export function assertExecutionTextMatchesBytes(text:string,bytes:Buffer,skillName='unknown'):void {
  const encoded=Buffer.from(text,'utf8');
  if(!encoded.equals(bytes)) throw new Error(`EXECUTION_TEXT_BYTES_MISMATCH:${skillName}`);
  if(hashOriginalInstructionBytes(encoded,skillName)!==hashOriginalInstructionBytes(bytes,skillName)) throw new Error(`EXECUTION_HASH_MISMATCH:${skillName}`);
}
