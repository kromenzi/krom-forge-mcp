import { buildPatchBundleV73, verifyPatchBundleV73, buildPatchExecutionContractV73 } from '../src/v73-patch-bundle';

const base={objective:'repair registry',files:[{path:'app/mcp/route.ts',action:'MODIFY' as const,summary:'register tools'}],allowedPaths:['app'],forbiddenPaths:[],buildStatus:'PASS' as const,testStatus:'PASS' as const,evidence:['ci'],requiresMutation:true,hostAuthorized:true,approvalRequired:false,approved:false};
if(buildPatchBundleV73(base).status!=='READY') throw new Error('v73 scoped bundle should be ready');
if(verifyPatchBundleV73(base).status!=='PASS') throw new Error('v73 verified bundle should pass');
if(buildPatchExecutionContractV73({...base,hostAuthorized:false}).status!=='BLOCKED') throw new Error('v73 unauthorized mutation must block');
console.log(JSON.stringify({status:'PASS',release:'v73'}));
