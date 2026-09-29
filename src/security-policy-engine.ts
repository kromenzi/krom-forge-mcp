import type { z } from 'zod';
import { securityAssessmentSchema, rlsAuditSchema, authzAuditSchema, secretsAuditSchema, dependencyAuditSchema } from './security-policy-schema';

type Assessment = z.infer<typeof securityAssessmentSchema>;
type Finding = Assessment['findings'][number];
const rank: Record<Finding['severity'], number> = {CRITICAL:5,HIGH:4,MEDIUM:3,LOW:2,INFO:1};

export function evaluateSecurityAssessment(input: Assessment) {
  const parsed = securityAssessmentSchema.parse(input);
  const open = parsed.findings.filter(f => f.status === 'OPEN' || f.status === 'UNKNOWN');
  const critical = open.filter(f => f.severity === 'CRITICAL');
  const high = open.filter(f => f.severity === 'HIGH');
  const unsupported = open.filter(f => f.evidenceRefs.length === 0);
  const failedControls = parsed.controlEvidence.filter(c => c.status === 'MISSING');
  const partialControls = parsed.controlEvidence.filter(c => c.status === 'PARTIAL');
  const gate = critical.length || failedControls.length ? 'BLOCKED' : high.length || unsupported.length || partialControls.length ? 'CONDITIONAL' : 'PASS';
  return {
    assessmentId: parsed.assessmentId,
    gate,
    counts: {critical:critical.length,high:high.length,open:open.length,unsupported:unsupported.length,missingControls:failedControls.length,partialControls:partialControls.length},
    hardStops: [
      ...critical.map(f => `CRITICAL:${f.id}`),
      ...failedControls.map(c => `CONTROL_MISSING:${c.control}`)
    ],
    findings: [...parsed.findings].sort((a,b)=>rank[b.severity]-rank[a.severity]),
    rule: 'PASS requires no open critical/high findings, no missing required controls, and evidence for consequential security claims.'
  };
}

export function auditRls(input: unknown) {
  const parsed = rlsAuditSchema.parse(input);
  const findings: any[] = [];
  for (const t of parsed.tables) {
    if (t.rlsEnabled !== true) findings.push({table:t.name,severity:'CRITICAL',issue:'RLS_NOT_VERIFIED',evidence:'Host did not verify RLS enabled.'});
    if (!t.policies.length) findings.push({table:t.name,severity:'HIGH',issue:'NO_POLICIES_EVIDENCED'});
    const failed = t.negativeTests.filter(x=>x.status==='FAIL');
    const notRun = t.negativeTests.filter(x=>x.status==='NOT_RUN');
    if (failed.length) findings.push({table:t.name,severity:'CRITICAL',issue:'NEGATIVE_ACCESS_TEST_FAILED',tests:failed.map(x=>x.name)});
    if (!t.negativeTests.length || notRun.length) findings.push({table:t.name,severity:'HIGH',issue:'NEGATIVE_ACCESS_TEST_GAP',tests:notRun.map(x=>x.name)});
  }
  return {status:findings.some(f=>f.severity==='CRITICAL')?'FAIL':findings.length?'PASS_WITH_GAPS':'PASS',findings,tables:parsed.tables.length};
}

export function auditAuthorization(input: unknown) {
  const parsed = authzAuditSchema.parse(input);
  const findings:any[]=[];
  for (const r of parsed.resources) {
    if (r.serverEnforced !== true) findings.push({resource:r.resource,severity:'CRITICAL',issue:'SERVER_AUTHORIZATION_NOT_VERIFIED'});
    const failed=r.negativeTests.filter(t=>t.status==='FAIL');
    const missing=r.negativeTests.filter(t=>t.status==='NOT_RUN');
    if (failed.length) findings.push({resource:r.resource,severity:'CRITICAL',issue:'NEGATIVE_AUTHZ_TEST_FAILED',scenarios:failed.map(t=>t.scenario)});
    if (!r.negativeTests.length || missing.length) findings.push({resource:r.resource,severity:'HIGH',issue:'NEGATIVE_AUTHZ_TEST_GAP',scenarios:missing.map(t=>t.scenario)});
  }
  return {status:findings.some(f=>f.severity==='CRITICAL')?'FAIL':findings.length?'PASS_WITH_GAPS':'PASS',findings};
}

export function auditSecrets(input: unknown) {
  const parsed = secretsAuditSchema.parse(input);
  const exposed=parsed.observations.filter(o=>o.secretLikeValuePresent && ['SOURCE','LOG','CLIENT_BUNDLE'].includes(o.kind));
  const unevidenced=parsed.observations.filter(o=>!o.evidenceRef);
  return {status:exposed.length?'FAIL':unevidenced.length?'PASS_WITH_GAPS':'PASS',exposed:exposed.map(o=>({location:o.location,kind:o.kind})),evidenceGaps:unevidenced.map(o=>o.location),rule:'Never return or reproduce secret values; only report location/type and evidence reference.'};
}

export function auditDependencies(input: unknown) {
  const parsed = dependencyAuditSchema.parse(input);
  const critical=parsed.packages.filter(p=>p.advisorySeverity==='CRITICAL');
  const high=parsed.packages.filter(p=>p.advisorySeverity==='HIGH');
  const unknown=parsed.packages.filter(p=>p.advisorySeverity==='UNKNOWN');
  return {status:critical.length?'FAIL':high.length||unknown.length?'PASS_WITH_GAPS':'PASS',critical,high,unknownCount:unknown.length};
}

export function buildSecurityControlMatrix(input: Assessment) {
  const parsed=securityAssessmentSchema.parse(input);
  return parsed.controlEvidence.map(c=>({control:c.control,status:c.status,evidenceCount:c.evidenceRefs.length,ready:c.status==='VERIFIED'&&c.evidenceRefs.length>0}));
}

export function recommendSecurityRemediation(input: Assessment) {
  const parsed=securityAssessmentSchema.parse(input);
  const open=parsed.findings.filter(f=>f.status==='OPEN'||f.status==='UNKNOWN').sort((a,b)=>rank[b.severity]-rank[a.severity]);
  return {priority:open.map((f,i)=>({order:i+1,findingId:f.id,severity:f.severity,action:f.remediation??`Implement/verify controls: ${f.requiredControls.join(', ')||'define remediation and validation'}`,verifyWith:f.requiredControls.length?f.requiredControls:['targeted negative test','evidence artifact']}))};
}

export function compareSecurityAssessments(before: Assessment, after: Assessment) {
  const b=securityAssessmentSchema.parse(before), a=securityAssessmentSchema.parse(after);
  const bOpen=new Set(b.findings.filter(f=>f.status==='OPEN'||f.status==='UNKNOWN').map(f=>f.id));
  const aOpen=new Set(a.findings.filter(f=>f.status==='OPEN'||f.status==='UNKNOWN').map(f=>f.id));
  return {resolved:[...bOpen].filter(x=>!aOpen.has(x)),introduced:[...aOpen].filter(x=>!bOpen.has(x)),persistent:[...aOpen].filter(x=>bOpen.has(x)),before:evaluateSecurityAssessment(b).gate,after:evaluateSecurityAssessment(a).gate};
}
