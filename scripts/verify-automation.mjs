import fs from 'node:fs';
import path from 'node:path';
import { buildMcpManifest, validateMcpManifest } from './mcp-manifest-lib.mjs';

const root=process.cwd();
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const workflow=read('.github/workflows/ci.yml');
const route=read('app/mcp/route.ts');
const v53=JSON.parse(read('src/v53-catalog.json'));
const v54=JSON.parse(read('src/v54-catalog.json'));
const manifestA=buildMcpManifest({root});
const manifestB=buildMcpManifest({root});
const failures=[];
const requireText=(text,label)=>{if(!workflow.includes(text)) failures.push(`Missing CI automation control: ${label}`);};

requireText('cancel-in-progress: true','concurrency cancellation');
requireText("node: ['20', '22']",'Node 20/22 matrix');
requireText('npm run verify:mcp','MCP verifier');
requireText('npm run verify:automation','automation verifier');
requireText('npm test','unit tests');
requireText('npm run typecheck','TypeScript');
requireText('npm run audit:production','production dependency audit');
requireText('npm run build','Next.js build');
requireText('if: always()','always-upload verification evidence');
requireText('actions/upload-artifact@v4','artifact evidence upload');
requireText('retention-days: 14','evidence retention');

if(validateMcpManifest(manifestA).status!=='PASS') failures.push('MCP manifest integrity failed.');
if(manifestA.fingerprint!==manifestB.fingerprint) failures.push('Manifest fingerprint is not deterministic.');
if(manifestA.counts.registered!==5000) failures.push(`Registered tools must equal 5000; found ${manifestA.counts.registered}`);
if(manifestA.counts.capabilities!==5000) failures.push(`Capability tools must equal 5000; found ${manifestA.counts.capabilities}`);
if(manifestA.integrity.duplicateRegistrations.length) failures.push('Duplicate registrations detected.');
if(manifestA.integrity.duplicateCapabilities.length) failures.push('Duplicate capabilities detected.');
if(manifestA.integrity.missingCapabilities.length) failures.push('Missing capability entries detected.');
if(manifestA.integrity.extraCapabilities.length) failures.push('Extra capability entries detected.');
if(manifestA.integrity.metadataGaps.length) failures.push('Metadata gaps detected.');
if(v53.domains.length*v53.operations.length!==2000) failures.push('v53 generated count drift.');
if(v54.domains.length!==35||v54.operations.length!==71||v54.domains.length*v54.operations.length!==2485) failures.push('v54 catalog dimensions drift.');
if(!route.includes('executeV53Tool(spec, input)')||!route.includes('executeV54Tool(spec, input)')) failures.push('Generated runtime execution contracts missing.');

const names=manifestA.tools.map((tool)=>tool.name);
if(new Set(names).size!==5000) failures.push('Global tool-name uniqueness violated.');

const report={
 status:failures.length?'FAIL':'PASS',
 totalTools:manifestA.counts.registered,
 capabilities:manifestA.counts.capabilities,
 v53Generated:2000,
 v54Generated:2485,
 duplicates:manifestA.integrity.duplicateRegistrations.length+manifestA.integrity.duplicateCapabilities.length,
 missingCapabilities:manifestA.integrity.missingCapabilities.length,
 extraCapabilities:manifestA.integrity.extraCapabilities.length,
 metadataGaps:manifestA.integrity.metadataGaps.length,
 deterministicManifest:manifestA.fingerprint===manifestB.fingerprint,
 automationControls:{
  concurrency:true,nodeMatrix:['20','22'],registryGate:true,automationGate:true,unitTests:true,typecheck:true,
  dependencyAudit:true,build:true,evidenceArtifact:true
 },
 fingerprint:manifestA.fingerprint,
 failures
};
console.log(JSON.stringify(report,null,2));
if(failures.length) process.exit(1);
