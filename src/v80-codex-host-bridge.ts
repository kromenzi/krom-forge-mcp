import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { z } from 'zod';
import type { V80TrustedHostExecutor } from './v80-v43-pack-host-adapter';
import { V80_V43_HASH_CONTRACT } from './v80-v43-instruction-contract';

const hash=(value:string)=>createHash('sha256').update(value,'utf8').digest('hex');
const responseSchema=z.object({
  protocol:z.literal('krom-codex-host-v1'), requestId:z.string().uuid(),
  requestDigest:z.string().regex(/^[a-f0-9]{64}$/), sourceCommit:z.string().regex(/^[a-f0-9]{40}$/),
  instructionHash:z.string().regex(/^[a-f0-9]{64}$/),
  executor:z.literal('codex-interactive'),
  result:z.object({outcome:z.enum(['PASS','FAIL','BLOCKED']),validatorPass:z.boolean(),securityPass:z.boolean(),
    unsupportedClaim:z.boolean(),regressionDetected:z.boolean(),semanticSimilarity:z.number().min(0).max(1),
    proceduralSimilarity:z.number().min(0).max(1),specializationDistinct:z.boolean(),
    artifacts:z.array(z.object({kind:z.string().min(1),content:z.string().min(1)})).min(1).max(99)})
});

/** Local trusted-operator IPC, not remote attestation. Codex must actually read and execute
 * each request; writing canned responses is FIXTURE evidence and is not authorized here.
 * Use a fresh private directory. No subprocess or model API is implicitly invoked. */
export function createCodexHostExecutorV80(options:{directory:string;sourceCommit:string;timeoutMs?:number}):V80TrustedHostExecutor{
  const sourceCommit=z.string().regex(/^[a-f0-9]{40}$/).parse(options.sourceCommit);
  const timeoutMs=z.number().int().positive().max(3600000).parse(options.timeoutMs??600000);
  return async ({skillName,instruction,benchmarkCase,signal})=>{
    signal.throwIfAborted();
    await fs.mkdir(options.directory,{recursive:true,mode:0o700});
    const requestId=randomUUID();
    const directory=await fs.mkdtemp(path.join(options.directory,'case-'));
    const request={protocol:'krom-codex-host-v1',requestId,sourceCommit,skillName,
      instructionHash:hash(instruction),hashContract:V80_V43_HASH_CONTRACT,instruction,benchmarkCase};
    const requestText=JSON.stringify(request); const requestDigest=hash(requestText);
    await fs.writeFile(path.join(directory,'request.json'),JSON.stringify({request,requestDigest},null,2),{flag:'wx',mode:0o600});
    const deadline=Date.now()+timeoutMs;
    let state='REJECTED';
    try {
      while(Date.now()<deadline){
        signal.throwIfAborted();
        let bytes:Buffer;
        try {
          const handle=await fs.open(path.join(directory,'response.json'),'r');
          try {
            const maximum=8*1024*1024;
            const buffer=Buffer.alloc(maximum+1); let count=0;
            while(count<buffer.length){const read=await handle.read(buffer,count,buffer.length-count,null);if(!read.bytesRead) break;count+=read.bytesRead;}
            if(count>maximum) throw Error('HOST_RESPONSE_TOO_LARGE');
            bytes=buffer.subarray(0,count);
          } finally {await handle.close();}
        }
        catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT') throw error;
          await delay(50,undefined,{signal}); continue;}
        signal.throwIfAborted();
        if(bytes.length>8*1024*1024) throw Error('HOST_RESPONSE_TOO_LARGE');
        const response=responseSchema.parse(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));
        if(response.requestId!==requestId || response.requestDigest!==requestDigest ||
          response.sourceCommit!==sourceCommit || response.instructionHash!==request.instructionHash) throw Error('HOST_RESPONSE_BINDING_MISMATCH');
        state='ACCEPTED';
        return {...response.result,artifacts:[...response.result.artifacts,{kind:'host-transport',content:JSON.stringify({
          requestId,requestDigest,sourceCommit,instructionHash:request.instructionHash,
          responseHash:createHash('sha256').update(bytes).digest('hex'),executor:response.executor,
          trustBoundary:'local trusted operator; not signed remote attestation'
        })}]};
      }
      throw Error('CODEX_HOST_TIMEOUT');
    } finally {
      if(signal.aborted) state='CANCELLED';
      await fs.writeFile(path.join(directory,'state.json'),JSON.stringify({requestId,state}),{mode:0o600});
    }
  };
}
