import { z } from 'zod';
import catalog from './v54-catalog.json';

type Domain=(typeof catalog.domains)[number];
type Operation=(typeof catalog.operations)[number];

export const v54EvidenceSchema=z.object({
 id:z.string().min(1),
 kind:z.string().min(1),
 verified:z.boolean().default(false),
 source:z.string().default('host'),
 observedAt:z.string().optional(),
 fingerprint:z.string().optional()
});

export const v54AutomationSchema=z.object({
 objective:z.string().min(1),
 context:z.string().default(''),
 artifacts:z.array(z.object({id:z.string().min(1),kind:z.string().default('GENERIC'),summary:z.string().default(''),dependsOn:z.array(z.string()).default([])})).default([]),
 constraints:z.array(z.string()).default([]),
 evidence:z.array(v54EvidenceSchema).default([]),
 signals:z.array(z.object({id:z.string().min(1),value:z.number().optional(),state:z.string().default('UNKNOWN'),verified:z.boolean().default(false)})).default([]),
 actions:z.array(z.object({id:z.string().min(1),reversible:z.boolean().default(true),requiresApproval:z.boolean().default(false),approved:z.boolean().default(false),preconditions:z.array(z.string()).default([])})).default([]),
 options:z.array(z.object({id:z.string().min(1),value:z.number().default(0),risk:z.number().min(0).max(100).default(0),cost:z.number().nonnegative().default(0)})).default([]),
 previousState:z.record(z.string(),z.unknown()).default({}),
 environment:z.string().default('unspecified'),
 automationMode:z.enum(['ADVISORY','GUARDED','HOST_EXECUTABLE']).default('ADVISORY'),
 requestedDepth:z.enum(['FAST','STANDARD','DEEP']).default('STANDARD')
});

export type V54Input=z.infer<typeof v54AutomationSchema>;
export type V54ToolSpec={
 name:string;title:string;description:string;domainId:string;domainTitle:string;operationId:string;
 operationTitle:string;family:string;focus:string[];evidenceKinds:string[];intent:string;
};

const slug=(value:string)=>value.toLowerCase().replace(/[^a-z0-9_]+/g,'_').replace(/^_+|_+$/g,'');

export const V54_TOOL_SPECS:V54ToolSpec[]=catalog.domains.flatMap((domain:Domain)=>
 catalog.operations.map((operation:Operation)=>({
  name:`krom_v54_${slug(domain.id)}_${slug(operation.id)}`,
  title:`${operation.title} — ${domain.title}`,
  description:`${operation.intent} Domain focus: ${domain.focus.join(', ')}. Automation remains evidence-bound, deterministic and host-authorized.`,
  domainId:domain.id,domainTitle:domain.title,operationId:operation.id,operationTitle:operation.title,
  family:operation.family,focus:[...domain.focus],evidenceKinds:[...domain.evidenceKinds],intent:operation.intent
 }))
);
export const V54_TOOL_NAMES=V54_TOOL_SPECS.map(spec=>spec.name);

if(V54_TOOL_SPECS.length!==2485) throw new Error(`v54 registry expected 2485 tools, got ${V54_TOOL_SPECS.length}`);
if(new Set(V54_TOOL_NAMES).size!==2485) throw new Error('v54 registry contains duplicate tool names');

const verified=(input:V54Input)=>input.evidence.filter(e=>e.verified);
const coverage=(spec:V54ToolSpec,input:V54Input)=>{
 const kinds=new Set(verified(input).map(e=>e.kind.toUpperCase()));
 const matched=spec.evidenceKinds.filter(k=>kinds.has(k.toUpperCase()));
 return {verifiedCount:verified(input).length,expectedKinds:spec.evidenceKinds,matchedKinds:matched,coverage:Math.round((matched.length/Math.max(spec.evidenceKinds.length,1))*100)};
};
const orderedActions=(spec:V54ToolSpec,input:V54Input)=>spec.focus.map((focus,index)=>({
 order:index+1,focus,action:`${spec.operationTitle} ${focus} for ${input.objective}`,
 evidenceRequired:spec.evidenceKinds[index%spec.evidenceKinds.length]??'HOST_EVIDENCE',
 hostMutation:false
}));
const rankedOptions=(input:V54Input)=>[...input.options].map(o=>({...o,score:o.value-o.risk-o.cost})).sort((a,b)=>b.score-a.score);
const actionReadiness=(input:V54Input)=>input.actions.map(a=>({
 id:a.id,
 ready:a.preconditions.length===0&&(!a.requiresApproval||a.approved),
 blockers:[...a.preconditions,...(a.requiresApproval&&!a.approved?['APPROVAL_REQUIRED']:[])],
 reversible:a.reversible
}));

export function executeV54Tool(spec:V54ToolSpec,input:V54Input){
 const evidence=coverage(spec,input);
 const strict=['EVALUATE','VERIFY','CONTROL'].includes(spec.family);
 const unavailable=strict&&evidence.verifiedCount===0;
 const base={
  tool:spec.name,release:'v54',domain:{id:spec.domainId,title:spec.domainTitle,focus:spec.focus},
  operation:{id:spec.operationId,title:spec.operationTitle,family:spec.family},objective:input.objective,
  environment:input.environment,automationMode:input.automationMode,constraints:input.constraints,evidence,
  status:unavailable?'NOT_AVAILABLE':'READY',executionClaim:false,
  hostAuthorizationRequired:input.automationMode!=='ADVISORY',
  evidenceBoundary:unavailable?'Verified host evidence is required for this conclusion.':'Output is derived only from supplied context/evidence.'
 } as const;

 if(spec.family==='OBSERVE') return {...base,observations:input.artifacts.map(a=>({artifactId:a.id,kind:a.kind,summary:a.summary,dependsOn:a.dependsOn})),checks:orderedActions(spec,input)};
 if(spec.family==='EVALUATE'||spec.family==='VERIFY'||spec.family==='CONTROL') return {...base,decision:unavailable?'NOT_AVAILABLE':'PASS_WITH_SUPPLIED_EVIDENCE',checks:orderedActions(spec,input),rankedOptions:rankedOptions(input),unsupportedClaimsProhibited:true};
 if(spec.family==='MODEL') return {...base,assumptions:input.constraints,scenarios:spec.focus.map(f=>({focus:f,hypothesis:`${spec.operationTitle} scenario for ${f}`,observed:false})),warning:'Modeled outputs require independent verification.'};
 if(spec.family==='DECIDE') return {...base,priorities:orderedActions(spec,input),rankedOptions:rankedOptions(input),decisionSupportOnly:true};
 if(spec.family==='AUTOMATE') return {...base,automation:{trigger:spec.operationId,steps:orderedActions(spec,input),idempotencyRequired:true,concurrencyGuardRequired:true,retryPolicyRequired:true,evidenceCaptureRequired:true},actionReadiness:actionReadiness(input),executionClaim:false};
 if(spec.family==='RESILIENCE') return {...base,recoveryPlan:orderedActions(spec,input),rollbackOrFallbackRequired:true,blastRadiusControlRequired:true,executionClaim:false};
 return {...base,plan:orderedActions(spec,input),rankedOptions:rankedOptions(input),hostMutation:false};
}
