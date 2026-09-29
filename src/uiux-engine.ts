import type { z } from 'zod';
import { uiAuditInputSchema, designSystemInputSchema, compareUiStatesSchema, uiFixPlanSchema } from './uiux-schema';

type UiAuditInput = z.infer<typeof uiAuditInputSchema>;
type DesignSystemInput = z.infer<typeof designSystemInputSchema>;
type CompareUiStates = z.infer<typeof compareUiStatesSchema>;
type UiFixPlanInput = z.infer<typeof uiFixPlanSchema>;

const rank = { CRITICAL:5, HIGH:4, MEDIUM:3, LOW:2, INFO:1 } as const;

function evidenceCoverage(input: UiAuditInput) {
  const sources = new Set(input.observations.map(o => o.source));
  const viewports = new Set(input.observations.filter(o=>o.viewport).map(o=>`${o.viewport!.width}x${o.viewport!.height}`));
  const directions = new Set(input.observations.map(o=>o.direction).filter(Boolean));
  return {
    routesObserved: new Set(input.observations.map(o=>o.route)).size,
    evidenceSources: [...sources],
    viewports: [...viewports],
    directions: [...directions],
    browserEvidencePresent: sources.has('BROWSER') || sources.has('DOM') || sources.has('ACCESSIBILITY_TREE'),
    screenshotEvidencePresent: sources.has('SCREENSHOT')
  };
}

export function auditUi(input: UiAuditInput) {
  const sorted=[...input.observations].sort((a,b)=>rank[b.severity]-rank[a.severity]);
  const byCategory:Record<string,number>={};
  sorted.forEach(o=>byCategory[o.category]=(byCategory[o.category]??0)+1);
  const critical=sorted.filter(o=>o.severity==='CRITICAL'||o.severity==='HIGH');
  const coverage=evidenceCoverage(input);
  const gaps:string[]=[];
  if(input.routes.length && coverage.routesObserved < input.routes.length) gaps.push('Not all declared routes have UI evidence.');
  if(input.requireMobile && !input.observations.some(o=>o.viewport && o.viewport.width<=480)) gaps.push('No narrow mobile evidence supplied.');
  if(input.requireRtl && !input.observations.some(o=>o.direction==='RTL')) gaps.push('No RTL evidence supplied.');
  if(input.requireAccessibility && !input.observations.some(o=>o.source==='ACCESSIBILITY_TREE')) gaps.push('No accessibility-tree evidence supplied.');
  return {
    status: critical.length ? 'FAIL' : gaps.length ? 'PASS_WITH_GAPS' : 'PASS',
    product: input.product,
    summary: { totalFindings:sorted.length, criticalHigh:critical.length, byCategory },
    highestPriority: sorted.slice(0,12),
    evidenceCoverage: coverage,
    evidenceGaps:gaps,
    rule:'This audit only evaluates host-supplied observations/evidence. It does not claim KROM Forge opened a browser or inspected a screenshot unless such evidence was supplied by the host.'
  };
}

export function auditResponsive(input: UiAuditInput) {
  const relevant=input.observations.filter(o=>['RESPONSIVE','MOBILE','TABLE','NAVIGATION','DIALOG','DRAWER'].includes(o.category));
  const widths=[...new Set(input.observations.filter(o=>o.viewport).map(o=>o.viewport!.width))].sort((a,b)=>a-b);
  const mobile=input.observations.filter(o=>o.viewport && o.viewport.width<=480);
  const desktop=input.observations.filter(o=>o.viewport && o.viewport.width>=1024);
  const gaps=[] as string[];
  if(!mobile.length) gaps.push('No <=480px evidence.');
  if(!desktop.length) gaps.push('No >=1024px evidence.');
  return {status:relevant.some(o=>o.severity==='CRITICAL'||o.severity==='HIGH')?'FAIL':gaps.length?'PASS_WITH_GAPS':'PASS',testedWidths:widths,findings:relevant.sort((a,b)=>rank[b.severity]-rank[a.severity]),gaps,reflowChecklist:['navigation transforms rather than only shrinks','wide tables use cards/scroll/priority columns intentionally','primary action remains discoverable','dialogs/drawers fit viewport','no horizontal overflow','text zoom/localization do not break layout']};
}

export function auditRtl(input: UiAuditInput) {
  const rtl=input.observations.filter(o=>o.direction==='RTL'||o.category==='RTL');
  const findings=rtl.filter(o=>['RTL','NAVIGATION','TABLE','FORM','DIALOG','DRAWER','CONSISTENCY'].includes(o.category));
  return {status:!rtl.length?'NOT_AVAILABLE':findings.some(o=>o.severity==='CRITICAL'||o.severity==='HIGH')?'FAIL':'PASS',findings,checklist:['logical CSS properties','breadcrumbs and navigation direction','direction-sensitive icons only','mixed Arabic/English text','numbers/dates remain semantically correct','tables/forms/dialogs/drawers align correctly','charts do not mirror data semantics incorrectly'],rule:'RTL PASS requires supplied RTL evidence; absence returns NOT_AVAILABLE.'};
}

export function auditAccessibility(input: UiAuditInput) {
  const findings=input.observations.filter(o=>o.category==='ACCESSIBILITY'||o.source==='ACCESSIBILITY_TREE');
  const hasTree=input.observations.some(o=>o.source==='ACCESSIBILITY_TREE');
  return {status:!hasTree?'PASS_WITH_GAPS':findings.some(o=>o.severity==='CRITICAL'||o.severity==='HIGH')?'FAIL':'PASS',findings,checks:['semantic structure','keyboard operation','visible focus','labels/names','contrast','non-color status','dialog focus management','reduced motion','text zoom resilience','error announcement'],evidenceGap:hasTree?null:'Accessibility tree/keyboard evidence not supplied; visual review alone is insufficient.'};
}

export function buildDesignSystem(input: DesignSystemInput) {
  return {
    product:input.product,
    styleDirection:input.styleDirection??'Professional task-first product UI with restrained visual effects and strong information hierarchy.',
    tokens:{color:['surface','surface-subtle','text','text-muted','border','primary','success','warning','danger','info','focus'],typography:['display','heading','title','body','label','caption','mono'],spacing:['2','4','6','8','12','16','20','24','32','40','48'],radius:['sm','md','lg'],elevation:['flat','raised','overlay'],motion:['fast','normal','slow','reduced-motion'],layout:['container','sidebar','content','grid','breakpoints','z-index']},
    componentContracts:['Button','Input','Select','Textarea','Checkbox','Radio','Switch','Card','Table','DataGrid','Dialog','Drawer','Sheet','Toast','Alert','Tabs','Breadcrumb','Pagination','Skeleton','EmptyState','ErrorState'],
    bilingualRules:input.bilingualArabicEnglish?['logical CSS properties','RTL/LTR icon policy','mixed text handling','locale-aware numbers/dates','test every dense data component in both directions']:[],
    requirements:input.requirements,
    existingTokens:input.existingTokens??null,
    rule:'This is a design-system contract, not evidence that the product already implements these tokens/components.'
  };
}

export function reviewUiEvidence(input: UiAuditInput) {
  const coverage=evidenceCoverage(input);
  const unsupportedClaims=[] as string[];
  if(!coverage.browserEvidencePresent) unsupportedClaims.push('Interactive/browser behavior cannot be verified from current evidence.');
  if(input.requireMobile && !input.observations.some(o=>o.viewport&&o.viewport.width<=480)) unsupportedClaims.push('Mobile quality cannot be verified.');
  if(input.requireRtl && !input.observations.some(o=>o.direction==='RTL')) unsupportedClaims.push('RTL quality cannot be verified.');
  return {status:unsupportedClaims.length?'PASS_WITH_GAPS':'PASS',coverage,unsupportedClaims,verifiedObservationIds:input.observations.filter(o=>o.evidenceRef||['BROWSER','DOM','ACCESSIBILITY_TREE','SCREENSHOT','CONSOLE'].includes(o.source)).map(o=>o.id),rule:'An observation is treated as stronger when linked to host evidence; KROM Forge never invents rendered-state evidence.'};
}

export function compareUiStates(input: CompareUiStates) {
  const key=(o:any)=>o.id;
  const before=new Map(input.before.observations.map(o=>[key(o),o]));
  const after=new Map(input.after.observations.map(o=>[key(o),o]));
  const resolved=[...before.keys()].filter(k=>!after.has(k));
  const introduced=[...after.keys()].filter(k=>!before.has(k));
  const persistent=[...after.keys()].filter(k=>before.has(k));
  const regression= input.after.observations.filter(o=>introduced.includes(o.id)&&(o.severity==='CRITICAL'||o.severity==='HIGH'));
  return {status:regression.length?'FAIL':introduced.length?'PASS_WITH_GAPS':'PASS',before:input.before.label,after:input.after.label,resolved,introduced,persistent,regressions:regression,rule:'Comparison is identifier-based over supplied snapshots; it does not infer visual equivalence beyond recorded observations.'};
}

export function generateUiFixPlan(input: UiFixPlanInput) {
  const findings=[...input.audit.observations].sort((a,b)=>rank[b.severity]-rank[a.severity]);
  const grouped:Record<string,typeof findings>={};
  findings.forEach(f=>(grouped[f.route]??=[]).push(f));
  return {
    objective:`Resolve evidence-backed UI/UX findings for ${input.audit.product}`,
    allowedPaths:input.allowedPaths,
    constraints:input.constraints,
    phases:Object.entries(grouped).map(([route,items],i)=>({order:i+1,route,priority:items.some(x=>x.severity==='CRITICAL'||x.severity==='HIGH')?'P0/P1':'P2/P3',findingIds:items.map(x=>x.id),actions:items.map(x=>({category:x.category,issue:x.issue,expected:x.expected??'Define expected behavior before implementation'})),verification:['render target route','verify desktop and mobile where relevant','verify RTL/LTR where relevant','check keyboard/accessibility where relevant','check console/runtime errors']})),
    globalVerification:['no critical/high finding remains unresolved','no new horizontal overflow','no inaccessible primary action','no RTL regression','no new console/runtime error'],
    rule:'Host must apply code changes and return diff/browser/test evidence before any fix is marked verified.'
  };
}
