import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildV42RealBenchmarkManifestV80, verifyV42RealBenchmarkReceiptsV80 } from '../src/v80-real-benchmark-evidence-pipeline';
import { getVerifiedResumeStateV80 } from '../src/v80-host-resume';
import { executeV43HostBenchmarkV80 } from '../src/v80-host-benchmark-executor';
import { createV43PackHostAdapterV80 } from '../src/v80-v43-pack-host-adapter';
import { createCodexHostExecutorV80 } from '../src/v80-codex-host-bridge';

async function main(){
 const [scenarioFile,outputDirectory,...flags]=process.argv.slice(2);
 if(!scenarioFile||!outputDirectory) throw Error('Usage: node --import tsx scripts/run-v80-codex-host.ts scenarios.json /absolute/new/output-directory [--max-cases=N] [--resume-from=result.json]');
 const maxCasesFlag=flags.find(item=>item.startsWith('--max-cases='));
 const resumeFlag=flags.find(item=>item.startsWith('--resume-from='));
 const maxCases=Math.min(100,Math.max(1,Number(maxCasesFlag?.split('=')[1]??100)));
 if(!Number.isInteger(maxCases)) throw Error('INVALID_MAX_CASES');
 const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(execFileSync('git',['status','--porcelain','--untracked-files=normal'],{encoding:'utf8'}).trim()) throw Error('CLEAN_SOURCE_COMMIT_REQUIRED');
 const scenario=JSON.parse(await fs.readFile(scenarioFile,'utf8'));
 const campaignManifest=buildV42RealBenchmarkManifestV80(scenario);
 const directory=path.resolve(outputDirectory);
 await fs.mkdir(directory,{recursive:false,mode:0o700});
 let previousState:ReturnType<typeof getVerifiedResumeStateV80>={completedCaseIds:new Set<string>(),receipts:[],artifacts:[]};
 if(resumeFlag){
  const previousCheckpoint=JSON.parse(await fs.readFile(resumeFlag.slice('--resume-from='.length),'utf8'));
  previousState=getVerifiedResumeStateV80({checkpoint:previousCheckpoint,manifest:campaignManifest,sourceCommit});
 }
 const pendingScenario={...scenario,cases:(scenario.cases??[]).filter((item:{caseId:string})=>!previousState.completedCaseIds.has(item.caseId)).slice(0,maxCases)};
 if(!pendingScenario.cases.length){console.log(JSON.stringify({status:'NO_WORK',completedCases:previousState.completedCaseIds.size,promotionApplied:false},null,2));return;}
 const manifest=buildV42RealBenchmarkManifestV80(pendingScenario);
 await fs.writeFile(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx',mode:0o600});
 const controller=new AbortController(); const abort=()=>controller.abort();process.once('SIGINT',abort);process.once('SIGTERM',abort);
 try {
  const output=await executeV43HostBenchmarkV80({manifest,sourceCommit,maxCases,signal:controller.signal,
   adapter:createV43PackHostAdapterV80(createCodexHostExecutorV80({directory:path.join(directory,'requests'),sourceCommit}))});
  const receipts=[...previousState.receipts,...output.receipts];
  const artifacts=[...previousState.artifacts,...output.artifacts];
  const verification=receipts.length?verifyV42RealBenchmarkReceiptsV80({manifest:campaignManifest,receipts,requireAllManifestCases:false}):output.verification;
  const checkpoint={...output,receipts,artifacts,verification,executedCases:previousState.receipts.length+output.executedCases,
   resumeVersion:1,campaignDigest:campaignManifest.manifestDigest};
  await fs.writeFile(path.join(directory,'result.json'),JSON.stringify(checkpoint,null,2),{flag:'wx',mode:0o600});
  console.log(JSON.stringify({bindingValidationStatus:output.status,executedCases:output.executedCases,
   outcomes:output.receipts.map(item=>({caseId:item.caseId,outcome:item.outcome,validatorPass:item.validatorPass})),
   failures:output.failures,blockers:output.blockers,resumedCompletedCases:previousState.completedCaseIds.size,
   campaignDigest:campaignManifest.manifestDigest,promotionApplied:false},null,2));
  if(output.status!=='PASS'||output.receipts.some(item=>item.outcome!=='PASS'||!item.validatorPass||!item.securityPass)) process.exitCode=1;
 } finally {process.removeListener('SIGINT',abort);process.removeListener('SIGTERM',abort);}
}
main().catch(error=>{console.error(error instanceof Error?error.message:'HOST_RUN_FAILED');process.exitCode=1;});
