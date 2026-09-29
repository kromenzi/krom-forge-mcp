import type { z } from 'zod';
import { complianceAssessmentSchema, complianceExceptionSchema, governanceDecisionSchema } from './compliance-governance-schema';

type Assessment = z.infer<typeof complianceAssessmentSchema>;
type Obligation = Assessment['obligations'][number];

const authoritative = new Set(['STATUTORY','REGULATORY','CONTRACTUAL','INTERNAL_POLICY','STANDARD']);

function verifiedEvidenceIds(a: Assessment) {
  return new Set(a.evidenceCatalog.filter(e => e.verified).map(e => e.id));
}

export function evaluateComplianceAssessment(input: Assessment) {
  const a = complianceAssessmentSchema.parse(input);
  const verified = verifiedEvidenceIds(a);
  const evaluated = a.obligations.map(o => {
    const linkedVerified = o.evidenceRefs.filter(r => verified.has(r));
    const sourceAuthorityGap = o.mandatory && !authoritative.has(o.authority);
    const missingSource = o.mandatory && !o.sourceRef;
    const evidenceGap = o.status === 'COMPLIANT' && linkedVerified.length === 0;
    const effectiveStatus = evidenceGap ? 'UNKNOWN' : o.status;
    return { ...o, effectiveStatus, verifiedEvidenceRefs: linkedVerified, sourceAuthorityGap, missingSource, evidenceGap };
  });
  const mandatory = evaluated.filter(o => o.applies && o.mandatory);
  const hardStops = mandatory.flatMap(o => [
    ...(o.effectiveStatus === 'NON_COMPLIANT' ? [`MANDATORY_NON_COMPLIANT:${o.id}`] : []),
    ...(o.effectiveStatus === 'UNKNOWN' ? [`MANDATORY_UNKNOWN:${o.id}`] : []),
    ...(o.sourceAuthorityGap ? [`MANDATORY_SOURCE_NOT_AUTHORITATIVE:${o.id}`] : []),
    ...(o.missingSource ? [`MANDATORY_SOURCE_MISSING:${o.id}`] : [])
  ]);
  const gaps = evaluated.filter(o => o.applies && (o.effectiveStatus === 'PARTIAL' || o.effectiveStatus === 'UNKNOWN' || o.evidenceGap || o.sourceAuthorityGap || o.missingSource));
  const gate = hardStops.length ? 'BLOCKED' : gaps.length ? 'CONDITIONAL' : 'PASS';
  return { assessmentId:a.assessmentId, gate, hardStops, gapCount:gaps.length, mandatoryCount:mandatory.length, obligations:evaluated, rule:'Mandatory obligations require authoritative source traceability and verified evidence. Guidance, benchmark or assumption cannot be promoted to mandatory requirement without authoritative support.' };
}

export function mapComplianceEvidence(input: Assessment) {
  const a = complianceAssessmentSchema.parse(input);
  const verified = verifiedEvidenceIds(a);
  return a.obligations.map(o => ({ requirementId:o.id, status:o.status, linked:o.evidenceRefs, verified:o.evidenceRefs.filter(r=>verified.has(r)), missing:o.evidenceRefs.filter(r=>!verified.has(r)), coverage:o.evidenceRefs.length ? Math.round((o.evidenceRefs.filter(r=>verified.has(r)).length/o.evidenceRefs.length)*100) : 0 }));
}

export function buildControlCoverage(input: Assessment) {
  const a = complianceAssessmentSchema.parse(input);
  const rows = a.obligations.flatMap(o => o.controls.map(c => ({control:c, requirementId:o.id, mandatory:o.mandatory, status:o.status, evidenceRefs:o.evidenceRefs})));
  const controls = [...new Set(rows.map(r=>r.control))];
  return controls.map(control => { const rs=rows.filter(r=>r.control===control); return {control,requirements:rs.map(r=>r.requirementId),mandatory:rs.some(r=>r.mandatory),covered:rs.every(r=>['COMPLIANT','NOT_APPLICABLE'].includes(r.status)),evidenceRefs:[...new Set(rs.flatMap(r=>r.evidenceRefs))]}; });
}

export function evaluateComplianceException(input: unknown) {
  const e = complianceExceptionSchema.parse(input);
  const now = Date.now();
  const expiry = Date.parse(e.expiresAt);
  const expired = Number.isFinite(expiry) && expiry <= now;
  const valid = e.status === 'APPROVED' && !expired && e.compensatingControls.length > 0 && e.evidenceRefs.length > 0;
  return { exceptionId:e.exceptionId, valid, effectiveStatus:expired?'EXPIRED':e.status, requirementId:e.requirementId, rule:'An exception never changes a requirement to COMPLIANT; it only records time-bounded governance acceptance with compensating controls and evidence.' };
}

export function decideGovernance(input: unknown) {
  const p = governanceDecisionSchema.parse(input);
  const assessment = evaluateComplianceAssessment(p.assessment);
  const validExceptions = new Set(p.exceptions.filter(e=>evaluateComplianceException(e).valid).map(e=>e.requirementId));
  const unresolvedStops = assessment.hardStops.filter(stop => {
    const id = stop.split(':').slice(1).join(':');
    return !validExceptions.has(id);
  });
  const decision = unresolvedStops.length ? 'BLOCKED' : assessment.gate === 'PASS' ? 'APPROVED' : 'CONDITIONAL';
  return { decision, unresolvedStops, validExceptionRequirements:[...validExceptions], assessmentGate:assessment.gate, policy:p.policy, note:'Exceptions may permit a conditional governance decision, but do not rewrite underlying compliance status.' };
}

export function recommendComplianceRemediation(input: Assessment) {
  const a = complianceAssessmentSchema.parse(input);
  const e = evaluateComplianceAssessment(a);
  const order: Record<string,number> = {NON_COMPLIANT:4,UNKNOWN:3,PARTIAL:2,COMPLIANT:1,NOT_APPLICABLE:0};
  return { actions:e.obligations.filter(o=>o.applies && (o.effectiveStatus!=='COMPLIANT' && o.effectiveStatus!=='NOT_APPLICABLE' || o.sourceAuthorityGap || o.missingSource)).sort((x,y)=>(y.mandatory?10:0)+order[y.effectiveStatus]-(x.mandatory?10:0)-order[x.effectiveStatus]).map((o,i)=>({order:i+1,requirementId:o.id,mandatory:o.mandatory,status:o.effectiveStatus,actions:[...(o.missingSource?['Attach authoritative source reference']:[]),...(o.sourceAuthorityGap?['Validate requirement against authoritative source']:[]),...(o.verifiedEvidenceRefs.length===0?['Collect and verify evidence']:[]),...(o.effectiveStatus==='NON_COMPLIANT'?['Implement required controls and retest']:[]),...(o.effectiveStatus==='PARTIAL'?['Close partial control/evidence gaps']:[])]})) };
}

export function compareComplianceAssessments(before: Assessment, after: Assessment) {
  const b = complianceAssessmentSchema.parse(before), a = complianceAssessmentSchema.parse(after);
  const bm = new Map(b.obligations.map(o=>[o.id,o.status]));
  const am = new Map(a.obligations.map(o=>[o.id,o.status]));
  const ids = [...new Set([...bm.keys(),...am.keys()])];
  return { beforeGate:evaluateComplianceAssessment(b).gate, afterGate:evaluateComplianceAssessment(a).gate, changed:ids.filter(id=>bm.get(id)!==am.get(id)).map(id=>({requirementId:id,before:bm.get(id)??'MISSING',after:am.get(id)??'MISSING'})), introduced:ids.filter(id=>!bm.has(id)&&am.has(id)), removed:ids.filter(id=>bm.has(id)&&!am.has(id)) };
}
