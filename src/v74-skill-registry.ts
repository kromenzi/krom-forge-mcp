import { z } from 'zod';

export const v74SkillRegistrySchema=z.object({
  packageName:z.string().default('unnamed-skill-package'),
  version:z.string().default('0.0.0'),
  registryTools:z.array(z.string()).default([]),
  capabilityTools:z.array(z.string()).default([]),
  requiredTools:z.array(z.string()).default([]),
  packageFiles:z.array(z.string()).default([]),
  dependencies:z.array(z.object({name:z.string(),version:z.string().default('unknown'),source:z.string().default('registry'),integrity:z.string().optional()})).default([]),
  behaviors:z.array(z.object({name:z.string(),expected:z.string().default('PASS'),actual:z.string().default('NOT_RUN'),evidence:z.string().default('')})).default([]),
  lifecycle:z.enum(['DRAFT','REVIEW','VALIDATED','PUBLISHED','DEPRECATED']).default('DRAFT'),
  previousLifecycle:z.enum(['DRAFT','REVIEW','VALIDATED','PUBLISHED','DEPRECATED']).optional(),
  findings:z.array(z.object({severity:z.enum(['INFO','LOW','MEDIUM','HIGH','CRITICAL']).default('INFO'),message:z.string()})).default([]),
  redactedSamples:z.array(z.string()).default([]),
  metadata:z.record(z.string(),z.unknown()).default({})
});
export type V74Input=z.infer<typeof v74SkillRegistrySchema>;
const uniq=(x:string[])=>[...new Set(x)];
const diff=(a:string[],b:string[])=>uniq(a).filter(x=>!new Set(b).has(x));

export function auditSkillRegistryV74(input:V74Input){
  const missingCapabilities=diff(input.registryTools,input.capabilityTools);
  const extraCapabilities=diff(input.capabilityTools,input.registryTools);
  const duplicateRegistry=input.registryTools.filter((x,i,a)=>a.indexOf(x)!==i);
  const duplicateCapabilities=input.capabilityTools.filter((x,i,a)=>a.indexOf(x)!==i);
  const status=missingCapabilities.length||extraCapabilities.length||duplicateRegistry.length||duplicateCapabilities.length?'BLOCKED':'PASS';
  return {release:'v74',packageName:input.packageName,status,registeredCount:uniq(input.registryTools).length,capabilityCount:uniq(input.capabilityTools).length,missingCapabilities,extraCapabilities,duplicateRegistry:uniq(duplicateRegistry),duplicateCapabilities:uniq(duplicateCapabilities),executionClaim:false};
}
export function validateSkillPackageV74(input:V74Input){
  const errors:string[]=[];
  if(!input.packageName.trim()) errors.push('PACKAGE_NAME_REQUIRED');
  if(!/^\d+\.\d+\.\d+/.test(input.version)) errors.push('SEMVER_REQUIRED');
  if(!input.packageFiles.length) errors.push('PACKAGE_FILES_REQUIRED');
  if(!input.requiredTools.length) errors.push('REQUIRED_TOOLS_REQUIRED');
  return {release:'v74',packageName:input.packageName,version:input.version,status:errors.length?'BLOCKED':'PASS',errors,files:uniq(input.packageFiles),requiredTools:uniq(input.requiredTools)};
}
export function reviewSkillSupplyChainV74(input:V74Input){
  const missingIntegrity=input.dependencies.filter(d=>!d.integrity).map(d=>d.name);
  const untrustedSource=input.dependencies.filter(d=>!['registry','workspace','vendored'].includes(d.source)).map(d=>({name:d.name,source:d.source}));
  return {release:'v74',packageName:input.packageName,status:missingIntegrity.length||untrustedSource.length?'PASS_WITH_GAPS':'PASS',dependencyCount:input.dependencies.length,missingIntegrity,untrustedSource,executionClaim:false};
}
export function draftSkillPackageV74(input:V74Input){
  return {release:'v74',packageName:input.packageName,version:input.version,lifecycle:'DRAFT',manifest:{requiredTools:uniq(input.requiredTools),files:uniq(input.packageFiles),dependencies:input.dependencies.map(d=>({name:d.name,version:d.version}))},hostWriteRequired:true,executionClaim:false};
}
export function analyzeSkillCapabilityGapsV74(input:V74Input){
  return {release:'v74',packageName:input.packageName,missingRequiredTools:diff(input.requiredTools,input.registryTools),unadvertisedRegisteredTools:diff(input.registryTools,input.capabilityTools),advertisedButUnavailable:diff(input.capabilityTools,input.registryTools)};
}
export function evaluateSkillBehavioralSuiteV74(input:V74Input){
  const failed=input.behaviors.filter(b=>b.actual==='FAIL'||(b.expected==='PASS'&&b.actual!=='PASS'));
  const unverifiable=input.behaviors.filter(b=>!b.evidence.trim()||b.actual==='NOT_RUN');
  return {release:'v74',packageName:input.packageName,status:failed.length?'FAIL':unverifiable.length?'PASS_WITH_GAPS':'PASS',total:input.behaviors.length,failed:failed.map(b=>b.name),unverifiable:unverifiable.map(b=>b.name),executionClaim:false};
}
export function compareSkillLifecycleV74(input:V74Input){
  const order=['DRAFT','REVIEW','VALIDATED','PUBLISHED','DEPRECATED'];
  const before=input.previousLifecycle??input.lifecycle;
  return {release:'v74',packageName:input.packageName,before,after:input.lifecycle,direction:Math.sign(order.indexOf(input.lifecycle)-order.indexOf(before)),changed:before!==input.lifecycle};
}
export function normalizeAuditOutcomeV74(input:V74Input){
  const rank={INFO:0,LOW:1,MEDIUM:2,HIGH:3,CRITICAL:4} as const;
  const highest=input.findings.reduce((m,f)=>rank[f.severity]>rank[m]?f.severity:m,'INFO' as keyof typeof rank);
  const status=highest==='CRITICAL'||highest==='HIGH'?'BLOCKED':highest==='MEDIUM'?'PASS_WITH_GAPS':'PASS';
  return {release:'v74',packageName:input.packageName,status,highestSeverity:highest,findings:input.findings};
}
export function buildDependencySbomV74(input:V74Input){
  return {release:'v74',packageName:input.packageName,format:'KROM-SBOM-1',components:input.dependencies.map(d=>({name:d.name,version:d.version,source:d.source,integrityPresent:Boolean(d.integrity)})),generatedFromSuppliedMetadata:true};
}
export function scanRedactedSecretsV74(input:V74Input){
  const patterns=[/AKIA[0-9A-Z]{8,}/g,/sk-[A-Za-z0-9_-]{8,}/g,/-----BEGIN [A-Z ]*PRIVATE KEY-----/g,/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g];
  const matches=input.redactedSamples.map((sample,index)=>({index,hits:patterns.reduce((n,p)=>n+(sample.match(p)?.length??0),0),redacted:sample.replace(/[A-Za-z0-9]/g,'*')})).filter(x=>x.hits>0);
  return {release:'v74',packageName:input.packageName,status:matches.length?'BLOCKED':'PASS',suspectedSecretSamples:matches,rawSecretValuesReturned:false,executionClaim:false};
}
