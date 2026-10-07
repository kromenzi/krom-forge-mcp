import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { buildV42RealBenchmarkManifestV80 } from '../src/v80-real-benchmark-evidence-pipeline';
import { executeV43HostBenchmarkV80 } from '../src/v80-host-benchmark-executor';
import { createV43PackHostAdapterV80 } from '../src/v80-v43-pack-host-adapter';
import { createCodexHostExecutorV80 } from '../src/v80-codex-host-bridge';

async function main(){
 const [scenarioFile,outputDirectory]=process.argv.slice(2);
 if(!scenarioFile||!outputDirectory) throw Error('Usage: node --import tsx scripts/run-v80-codex-host.ts scenarios.json /absolute/new/output-directory');
 const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(execFileSync('git',['status','--porcelain','--untracked-files=normal'],{encoding:'utf8'}).trim()) throw Error('CLEAN_SOURCE_COMMIT_REQUIRED');
 const directory=path.resolve(outputDirectory);
 await fs.mkdir(directory,{recursive:false,mode:0o700});
 const scenario=JSON.parse(await fs.readFile(scenarioFile,'utf8'));
 const manifest=buildV42RealBenchmarkManifestV80(scenario);
 await fs.writeFile(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2));
 const controller=new AbortController(); const abort=()=>controller.abort();process.once('SIGINT',abort);process.once('SIGTERM',abort);
 try {
  const output=await executeV43HostBenchmarkV80({manifest,sourceCommit,maxCases:100,signal:controller.signal,
   adapter:createV43PackHostAdapterV80(createCodexHostExecutorV80({directory:path.join(directory,'requests'),sourceCommit}))});
  await fs.writeFile(path.join(directory,'result.json'),JSON.stringify(output,null,2));
  console.log(JSON.stringify({bindingValidationStatus:output.status,executedCases:output.executedCases,
   outcomes:output.receipts.map(item=>({caseId:item.caseId,outcome:item.outcome,validatorPass:item.validatorPass})),
   failures:output.failures,blockers:output.blockers,promotionApplied:false},null,2));
  if(output.status!=='PASS'||output.receipts.some(item=>item.outcome!=='PASS'||!item.validatorPass||!item.securityPass)) process.exitCode=1;
 } finally {process.removeListener('SIGINT',abort);process.removeListener('SIGTERM',abort);}
}
main().catch(error=>{console.error(error instanceof Error?error.message:'HOST_RUN_FAILED');process.exitCode=1;});
