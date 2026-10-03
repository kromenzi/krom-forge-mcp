import { z } from 'zod';

export const v72SkillSchema = z.object({
  skillName: z.string().default('unnamed-skill'),
  requiredTools: z.array(z.string()).default([]),
  availableTools: z.array(z.string()).default([]),
  declaredTools: z.array(z.string()).default([]),
  requiredEvidence: z.array(z.string()).default([]),
  evidence: z.array(z.string()).default([]),
  capabilities: z.array(z.string()).default([]),
  requiresMutation: z.boolean().default(false),
  hostAuthorized: z.boolean().default(false),
  approvalRequired: z.boolean().default(false),
  approved: z.boolean().default(false),
  steps: z.array(z.object({
    id: z.string(),
    tool: z.string(),
    dependsOn: z.array(z.string()).default([]),
    sideEffect: z.boolean().default(false)
  })).default([]),
  skills: z.array(z.object({
    name: z.string(),
    tools: z.array(z.string()).default([]),
    capabilities: z.array(z.string()).default([])
  })).default([]),
  previous: z.record(z.string(), z.unknown()).default({})
});

export type V72SkillInput = z.infer<typeof v72SkillSchema>;

const uniq=(items:string[])=>[...new Set(items)];
const missing=(need:string[], have:string[])=>uniq(need).filter(x=>!new Set(have).has(x));

export function auditSkillToolCoverageV72(input:V72SkillInput){
  const missingTools=missing(input.requiredTools,input.availableTools);
  const undeclaredAvailable=uniq(input.availableTools).filter(x=>!new Set(input.declaredTools).has(x));
  return {release:'v72',skillName:input.skillName,status:missingTools.length?'BLOCKED':'PASS',requiredCount:uniq(input.requiredTools).length,availableCount:uniq(input.availableTools).length,missingTools,undeclaredAvailable,executionClaim:false};
}
export function assessSkillExecutionSafetyV72(input:V72SkillInput){
  const blockers:string[]=[];
  if(input.requiresMutation&&!input.hostAuthorized) blockers.push('HOST_AUTHORIZATION_REQUIRED');
  if(input.approvalRequired&&!input.approved) blockers.push('APPROVAL_REQUIRED');
  const missingEvidence=missing(input.requiredEvidence,input.evidence);
  if(missingEvidence.length) blockers.push('EVIDENCE_GAP');
  return {release:'v72',skillName:input.skillName,status:blockers.length?'BLOCKED':'SAFE',blockers,missingEvidence,hostMutationPerformed:false};
}
export function buildSkillToolChainV72(input:V72SkillInput){
  const ids=new Set(input.steps.map(s=>s.id));
  const invalidDependencies=input.steps.flatMap(s=>s.dependsOn.filter(d=>!ids.has(d)).map(d=>({step:s.id,missing:d})));
  const unauthorizedMutationSteps=input.steps.filter(s=>s.sideEffect&&!input.hostAuthorized).map(s=>s.id);
  return {release:'v72',skillName:input.skillName,status:invalidDependencies.length||unauthorizedMutationSteps.length?'BLOCKED':'READY',steps:input.steps,invalidDependencies,unauthorizedMutationSteps,executionClaim:false};
}
export function compareSkillContractsV72(input:V72SkillInput){
  const previous=(input.previous??{}) as Record<string,unknown>;
  const prevTools=Array.isArray(previous.requiredTools)?previous.requiredTools.filter((x):x is string=>typeof x==='string'):[];
  return {release:'v72',skillName:input.skillName,addedRequiredTools:missing(input.requiredTools,prevTools),removedRequiredTools:missing(prevTools,input.requiredTools),currentRequiredTools:uniq(input.requiredTools)};
}
export function auditSkillCatalogV72(input:V72SkillInput){
  const names=input.skills.map(s=>s.name);
  const duplicateNames=names.filter((n,i)=>names.indexOf(n)!==i);
  const duplicateTools=input.skills.flatMap(s=>s.tools.filter((t,i,a)=>a.indexOf(t)!==i).map(t=>({skill:s.name,tool:t})));
  return {release:'v72',status:duplicateNames.length||duplicateTools.length?'BLOCKED':'PASS',skillCount:input.skills.length,duplicateNames:uniq(duplicateNames),duplicateTools};
}
export function buildSkillAssuranceSnapshotV72(input:V72SkillInput){
  return {release:'v72',skillName:input.skillName,coverage:auditSkillToolCoverageV72(input),safety:assessSkillExecutionSafetyV72(input),chain:buildSkillToolChainV72(input),catalog:auditSkillCatalogV72(input),executionClaim:false};
}
