import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createCodexHostExecutorV80 } from '../src/v80-codex-host-bridge';
const sourceCommit='a'.repeat(40);
const result={outcome:'PASS',validatorPass:true,securityPass:true,unsupportedClaim:false,regressionDetected:false,
 semanticSimilarity:1,proceduralSimilarity:1,specializationDistinct:false,artifacts:[{kind:'fixture',content:'TRANSPORT TEST ONLY'}]};
async function request(directory:string){
 for(let i=0;i<100;i++) {for(const child of await fs.readdir(directory)){
  try {return {folder:path.join(directory,child),...JSON.parse(await fs.readFile(path.join(directory,child,'request.json'),'utf8'))};} catch {}}
  await delay(10);
 } throw Error('request unavailable');
}
for(const mismatch of [null,'requestId','requestDigest','sourceCommit','instructionHash'] as const){
 test('bridge binds response: '+(mismatch??'valid'),async()=>{
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'codex-bridge-test-'));
  try {
   const execute=createCodexHostExecutorV80({directory,sourceCommit,timeoutMs:2000});
   const pending=execute({skillName:'test',instruction:'exact\r\ntext',benchmarkCase:{caseId:'test'},signal:new AbortController().signal});
   const rejection=mismatch?assert.rejects(pending,/HOST_RESPONSE_BINDING_MISMATCH/):null;
   const envelope=await request(directory);
   const response={protocol:'krom-codex-host-v1',requestId:envelope.request.requestId,requestDigest:envelope.requestDigest,
     sourceCommit,instructionHash:envelope.request.instructionHash,executor:'codex-interactive',result};
   if(mismatch) response[mismatch]=mismatch==='requestId'?'00000000-0000-4000-8000-000000000000':'b'.repeat(64);
   if(mismatch==='sourceCommit') response.sourceCommit='b'.repeat(40);
   await fs.writeFile(path.join(envelope.folder,'response.json'),JSON.stringify(response));
   if(rejection) await rejection; else assert.equal((await pending).artifacts.at(-1)?.kind,'host-transport');
  } finally {await fs.rm(directory,{recursive:true,force:true});}
 });
}
test('bridge times out without a host',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'codex-bridge-test-'));
 try {await assert.rejects(createCodexHostExecutorV80({directory,sourceCommit,timeoutMs:30})({skillName:'test',instruction:'text',benchmarkCase:{},signal:new AbortController().signal}),/CODEX_HOST_TIMEOUT/);}
 finally {await fs.rm(directory,{recursive:true,force:true});}
});
test('bridge cancellation prevents late evidence',async()=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'codex-bridge-test-'));const controller=new AbortController();
 try {const pending=createCodexHostExecutorV80({directory,sourceCommit})({skillName:'test',instruction:'text',benchmarkCase:{},signal:controller.signal});
 const rejected=assert.rejects(pending);const envelope=await request(directory);controller.abort();await rejected;
 assert.equal(JSON.parse(await fs.readFile(path.join(envelope.folder,'state.json'),'utf8')).state,'CANCELLED');}
 finally {await fs.rm(directory,{recursive:true,force:true});}
});
