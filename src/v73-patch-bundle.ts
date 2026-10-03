import { z } from 'zod';

export const v73PatchSchema=z.object({
  objective:z.string().min(1),
  files:z.array(z.object({path:z.string(),action:z.enum(['CREATE','MODIFY','DELETE','RENAME']),summary:z.string().default('')})).default([]),
  allowedPaths:z.array(z.string()).default([]),
  forbiddenPaths:z.array(z.string()).default([]),
  buildStatus:z.enum(['PASS','FAIL','NOT_RUN','UNKNOWN']).default('UNKNOWN'),
  testStatus:z.enum(['PASS','FAIL','NOT_RUN','UNKNOWN']).default('UNKNOWN'),
  evidence:z.array(z.string()).default([]),
  requiresMutation:z.boolean().default(true),
  hostAuthorized:z.boolean().default(false),
  approvalRequired:z.boolean().default(false),
  approved:z.boolean().default(false)
});
export type V73PatchInput=z.infer<typeof v73PatchSchema>;
const allowed=(path:string,allowedPaths:string[])=>!allowedPaths.length||allowedPaths.some(p=>path===p||path.startsWith(p.endsWith('/')?p:p+'/'));
export function buildPatchBundleV73(input:V73PatchInput){
  const outOfScope=input.files.filter(f=>!allowed(f.path,input.allowedPaths)||input.forbiddenPaths.some(p=>f.path===p||f.path.startsWith(p.endsWith('/')?p:p+'/')));
  return {release:'v73',objective:input.objective,status:outOfScope.length?'BLOCKED':'READY',files:input.files,outOfScope,evidenceRefs:input.evidence,executionClaim:false};
}
export function verifyPatchBundleV73(input:V73PatchInput){
  const scope=buildPatchBundleV73(input);
  const blockers:string[]=[];
  if(scope.status!=='READY') blockers.push('SCOPE_VIOLATION');
  if(input.buildStatus!=='PASS') blockers.push('BUILD_NOT_PASSING');
  if(input.testStatus!=='PASS') blockers.push('TESTS_NOT_PASSING');
  if(!input.evidence.length) blockers.push('EVIDENCE_REQUIRED');
  return {release:'v73',objective:input.objective,status:blockers.length?'BLOCKED':'PASS',blockers,buildStatus:input.buildStatus,testStatus:input.testStatus,executionClaim:false};
}
export function buildPatchExecutionContractV73(input:V73PatchInput){
  const blockers:string[]=[];
  if(input.requiresMutation&&!input.hostAuthorized) blockers.push('HOST_AUTHORIZATION_REQUIRED');
  if(input.approvalRequired&&!input.approved) blockers.push('APPROVAL_REQUIRED');
  return {release:'v73',objective:input.objective,status:blockers.length?'BLOCKED':'READY',blockers,preconditions:['verified patch bundle','host-authorized mutation adapter','post-change build/test evidence'],rollbackRequired:input.files.some(f=>f.action!=='CREATE'),executionClaim:false};
}
