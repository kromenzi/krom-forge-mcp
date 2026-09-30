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
requireText('npm run verify:v55','v55 adaptive runtime benchmark');
requireText('npm run verify:v56','v56 self-healing runtime benchmark');
requireText('npm run verify:v57','v57 autonomous brain benchmark');
requireText('npm run verify:v58','v58 engineering OS benchmark');
requireText('npm run verify:v59','v59 control fabric benchmark');
requireText('npm run verify:v60','v60 runtime mesh benchmark');
requireText('npm run verify:v61','v61 intelligence grid benchmark');
requireText('npm run verify:v62','v62 decision core benchmark');
requireText('npm run verify:v63','v63 trust governance benchmark');
requireText('npm run verify:v64','v64 adaptive trust runtime benchmark');
requireText('npm run verify:v65','v65 identity delegation benchmark');
requireText('npm run verify:v66','v66 autonomous verification benchmark');
requireText('npm test','unit tests');
requireText('npm run typecheck','TypeScript');
requireText('npm run audit:production','production dependency audit');
requireText('npm run build','Next.js build');
requireText('if: always()','always-upload verification evidence');
requireText('actions/upload-artifact@v4','artifact evidence upload');
requireText('retention-days: 14','evidence retention');

if(validateMcpManifest(manifestA).status!=='PASS') failures.push('MCP manifest integrity failed.');
if(manifestA.fingerprint!==manifestB.fingerprint) failures.push('Manifest fingerprint is not deterministic.');
if(manifestA.counts.registered!==5257) failures.push(`Registered tools must equal 5257; found ${manifestA.counts.registered}`);
if(manifestA.counts.capabilities!==5257) failures.push(`Capability tools must equal 5257; found ${manifestA.counts.capabilities}`);
if(manifestA.integrity.duplicateRegistrations.length) failures.push('Duplicate registrations detected.');
if(manifestA.integrity.duplicateCapabilities.length) failures.push('Duplicate capabilities detected.');
if(manifestA.integrity.missingCapabilities.length) failures.push('Missing capability entries detected.');
if(manifestA.integrity.extraCapabilities.length) failures.push('Extra capability entries detected.');
if(manifestA.integrity.metadataGaps.length) failures.push('Metadata gaps detected.');
if(v53.domains.length*v53.operations.length!==2000) failures.push('v53 generated count drift.');
if(v54.domains.length!==35||v54.operations.length!==71||v54.domains.length*v54.operations.length!==2485) failures.push('v54 catalog dimensions drift.');
if(!route.includes('executeV53Tool(spec, input)')||!route.includes('executeV54Tool(spec, input)')) failures.push('Generated runtime execution contracts missing.');

const names=manifestA.tools.map((tool)=>tool.name);
if(new Set(names).size!==5257) failures.push('Global tool-name uniqueness violated.');

const report={
 status:failures.length?'FAIL':'PASS',
 totalTools:manifestA.counts.registered,
 v55RuntimeTools:manifestA.tools.filter((tool)=>tool.name.startsWith('krom_v55_')).length,
 v56RuntimeTools:manifestA.tools.filter((tool)=>tool.name.startsWith('krom_v56_')).length,
 v57BrainTools:manifestA.tools.filter((tool)=>tool.name.startsWith('krom_v57_')).length,
 v58OsTools:manifestA.tools.filter((tool)=>tool.name.startsWith('krom_v58_')).length,
 v59FabricTools:manifestA.tools.filter((tool)=>tool.name.startsWith('krom_v59_')).length,
 v60MeshTools:manifestA.tools.filter((tool)=>tool.name.startsWith('krom_v60_')).length,
 v61GridTools:manifestA.tools.filter((tool)=>tool.name.startsWith('krom_v61_')).length,
 v62DecisionTools:manifestA.tools.filter((tool)=>tool.name.startsWith('krom_v62_')).length,
 v63TrustTools:manifestA.tools.filter((tool)=>tool.name.startsWith('krom_v63_')).length,
 v64TrustRuntimeTools:manifestA.tools.filter((tool)=>tool.name.startsWith('krom_v64_')).length,
 v65IdentityDelegationTools:manifestA.tools.filter((tool)=>tool.name.startsWith('krom_v65_')).length,
 v66AutonomousVerificationTools:manifestA.tools.filter((tool)=>tool.name.startsWith('krom_v66_')).length,
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
