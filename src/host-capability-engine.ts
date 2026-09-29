import type { z } from 'zod';
import { hostCapabilitySnapshotSchema, assessCapabilityRequirementsSchema } from './host-capability-schema';

type Snapshot = z.infer<typeof hostCapabilitySnapshotSchema>;
type Requirement = z.infer<typeof assessCapabilityRequirementsSchema>['requirements'][number];

type LoopLike = {
  steps?: Array<{id:string;phase:string;title:string;requiredTools?:string[];requiredEvidence?:string[];status?:string;blockers?:string[];notes?:string[]}>;
  blockers?: string[];
  decisions?: string[];
  status?: string;
  updatedAt?: string;
};

const alias: Record<string,string[]> = {
  web:['web'], files:['files'], github:['github'], vercel:['vercel','deployment'], supabase:['supabase','database'], figma:['figma','design'], browser:['browser'], execution:['execution']
};

function usable(snapshot:Snapshot) {
  return snapshot.capabilities.filter(c=>c.connected && c.authenticated);
}

export function summarizeHostCapabilities(snapshot:Snapshot) {
  const ok = usable(snapshot);
  const categories = Array.from(new Set(ok.map(c=>c.category)));
  return {
    hostId:snapshot.hostId,
    hostType:snapshot.hostType,
    capturedAt:snapshot.capturedAt,
    totalCapabilities:snapshot.capabilities.length,
    usableCapabilities:ok.length,
    categories,
    writable:ok.filter(c=>c.operations.includes('write')).map(c=>c.name),
    executable:ok.filter(c=>c.operations.includes('execute')).map(c=>c.name),
    deployers:ok.filter(c=>c.operations.includes('deploy')).map(c=>c.name),
    verifiers:ok.filter(c=>c.operations.includes('verify')).map(c=>c.name),
    evidenceKinds:Array.from(new Set(ok.flatMap(c=>c.evidenceKinds))),
    disconnected:snapshot.capabilities.filter(c=>!c.connected || !c.authenticated).map(c=>({id:c.id,name:c.name,connected:c.connected,authenticated:c.authenticated})),
    limitations:[...snapshot.globalLimitations,...ok.flatMap(c=>c.limitations)]
  };
}

function matchRequirement(snapshot:Snapshot, r:Requirement) {
  const candidates = usable(snapshot).filter(c=>c.category===r.category);
  const matched = candidates.filter(c=>(!r.operation || c.operations.includes(r.operation)) && (!r.evidenceKind || c.evidenceKinds.includes(r.evidenceKind)));
  return {requirement:r, matched:matched.map(c=>({id:c.id,name:c.name,operations:c.operations,evidenceKinds:c.evidenceKinds})), satisfied:matched.length>0};
}

export function assessCapabilityRequirements(input:z.infer<typeof assessCapabilityRequirementsSchema>) {
  const checks = input.requirements.map(r=>matchRequirement(input.snapshot,r));
  const requiredMissing = checks.filter(x=>x.requirement.required && !x.satisfied);
  const optionalMissing = checks.filter(x=>!x.requirement.required && !x.satisfied);
  return {
    status: requiredMissing.length ? 'BLOCKED' : optionalMissing.length ? 'DEGRADED' : 'EXECUTABLE',
    checks,
    requiredMissing:requiredMissing.map(x=>x.requirement),
    optionalMissing:optionalMissing.map(x=>x.requirement),
    rule:'KROM may only request operations and evidence that the supplied host capability snapshot can actually produce.'
  };
}

function toolCategoryCandidates(tool:string) {
  return alias[tool] ?? [tool];
}

function findForTool(snapshot:Snapshot, tool:string) {
  const cats = toolCategoryCandidates(tool);
  return usable(snapshot).filter(c=>cats.includes(c.category));
}

export function adaptLoopToHost(snapshot:Snapshot, loop:LoopLike) {
  const cloned:LoopLike = JSON.parse(JSON.stringify(loop));
  const steps = cloned.steps ?? [];
  const stepAssessments = steps.map(step=>{
    const toolChecks = (step.requiredTools ?? []).map(tool=>{
      const matches = findForTool(snapshot,tool);
      return {tool,available:matches.length>0,capabilities:matches.map(m=>m.name)};
    });
    const missing = toolChecks.filter(x=>!x.available).map(x=>x.tool);
    if (missing.length) {
      step.status = 'BLOCKED';
      step.blockers = Array.from(new Set([...(step.blockers??[]),`Host capability missing: ${missing.join(', ')}`]));
      step.notes = [...(step.notes??[]),'v35 host bridge blocked this step because the host snapshot does not expose the required capability.'];
    } else if ((step.requiredTools??[]).length) {
      step.notes = [...(step.notes??[]),`v35 mapped required host tools to: ${toolChecks.flatMap(x=>x.capabilities).join(', ')}`];
    }
    return {stepId:step.id,phase:step.phase,status:missing.length?'BLOCKED':'EXECUTABLE',toolChecks,missing};
  });
  const missingAll = Array.from(new Set(stepAssessments.flatMap(s=>s.missing)));
  if (missingAll.length) {
    cloned.blockers = Array.from(new Set([...(cloned.blockers??[]),`Missing host capabilities: ${missingAll.join(', ')}`]));
    cloned.status = 'BLOCKED';
  }
  cloned.decisions = [...(cloned.decisions??[]),`Host capability snapshot ${snapshot.hostId} (${snapshot.hostType}) evaluated by v35.`];
  cloned.updatedAt = new Date().toISOString();
  return {loop:cloned,stepAssessments,hostSummary:summarizeHostCapabilities(snapshot),missingCapabilities:missingAll,executionMode:missingAll.length?'BLOCKED_OR_PARTIAL':'FULLY_MAPPED'};
}

export function recommendHostStrategy(snapshot:Snapshot, objective:string) {
  const text = objective.toLowerCase();
  const desired:string[] = [];
  if (/research|latest|current|بحث|ابحث/.test(text)) desired.push('web');
  if (/project|code|file|repo|مشروع|كود|ملف/.test(text)) desired.push('files');
  if (/github|pull request|commit|repo/.test(text)) desired.push('github');
  if (/vercel|deploy|production|نشر/.test(text)) desired.push('vercel');
  if (/supabase|database|rls|postgres|قاعدة/.test(text)) desired.push('supabase');
  if (/ui|ux|responsive|rtl|browser|واجهة/.test(text)) desired.push('browser');
  if (/build|test|run|typescript|lint|اختبار|بناء/.test(text)) desired.push('execution');
  const unique = Array.from(new Set(desired));
  const mapping = unique.map(tool=>({tool,matches:findForTool(snapshot,tool).map(c=>c.name)}));
  const missing = mapping.filter(m=>m.matches.length===0).map(m=>m.tool);
  return {objective,desiredCapabilities:unique,mapping,missing,strategy:missing.length?'Use supported capabilities and explicitly surface gaps; do not simulate unavailable actions.':'Host can support the requested evidence path.',host:summarizeHostCapabilities(snapshot)};
}

export function compareHostSnapshots(before:Snapshot, after:Snapshot) {
  const key=(s:Snapshot)=>new Map(s.capabilities.map(c=>[c.id,c]));
  const b=key(before), a=key(after);
  const added=[...a.keys()].filter(k=>!b.has(k)).map(k=>a.get(k));
  const removed=[...b.keys()].filter(k=>!a.has(k)).map(k=>b.get(k));
  const changed=[...a.keys()].filter(k=>b.has(k) && JSON.stringify(a.get(k))!==JSON.stringify(b.get(k))).map(k=>({before:b.get(k),after:a.get(k)}));
  return {beforeHost:before.hostId,afterHost:after.hostId,added,removed,changed,beforeSummary:summarizeHostCapabilities(before),afterSummary:summarizeHostCapabilities(after)};
}

export function validateHostEvidence(snapshot:Snapshot, requestedEvidenceKinds:string[]) {
  const kinds = new Set(usable(snapshot).flatMap(c=>c.evidenceKinds));
  const supported=requestedEvidenceKinds.filter(k=>kinds.has(k));
  const unsupported=requestedEvidenceKinds.filter(k=>!kinds.has(k));
  return {supported,unsupported,status:unsupported.length?'PARTIAL':'SUPPORTED',rule:'Unsupported evidence must remain an evidence gap; it may not be fabricated or inferred from unrelated host capabilities.'};
}
