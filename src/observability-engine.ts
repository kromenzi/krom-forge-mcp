import type { z } from 'zod';
import { observabilitySnapshotSchema, serviceHealthInputSchema, anomalyInputSchema, incidentCorrelationSchema, sloInputSchema } from './observability-schema';

type Snapshot = z.infer<typeof observabilitySnapshotSchema>;
type ServiceHealthInput = z.infer<typeof serviceHealthInputSchema>;
type AnomalyInput = z.infer<typeof anomalyInputSchema>;
type CorrelationInput = z.infer<typeof incidentCorrelationSchema>;
type SloInput = z.infer<typeof sloInputSchema>;

const sev = { INFO:0, WARN:1, ERROR:2, CRITICAL:3 } as const;

export function normalizeRuntimeSignals(snapshot: Snapshot) {
  const parsed = observabilitySnapshotSchema.parse(snapshot);
  const sorted = [...parsed.signals].sort((a,b)=>(a.timestamp||'').localeCompare(b.timestamp||''));
  return {
    ...parsed,
    signals: sorted,
    verifiedSignals: sorted.filter(s=>s.verified).length,
    unverifiedSignals: sorted.filter(s=>!s.verified).length,
    evidenceCoverage: sorted.length ? Math.round((sorted.filter(s=>s.verified).length/sorted.length)*100) : 0,
    limitation: 'Runtime conclusions are based only on host-supplied telemetry/evidence; KROM does not claim direct log or metric access.'
  };
}

export function evaluateServiceHealth(input: ServiceHealthInput) {
  const { snapshot, requiredChecks, criticalServices } = serviceHealthInputSchema.parse(input);
  const verified = snapshot.signals.filter(s=>s.verified);
  const bad = verified.filter(s=>sev[s.severity] >= sev.ERROR);
  const critical = bad.filter(s=>s.severity==='CRITICAL' || criticalServices.some(c=>s.source.toLowerCase().includes(c.toLowerCase())));
  const matchedChecks = requiredChecks.filter(c=>verified.some(s=>s.message.toLowerCase().includes(c.toLowerCase()) || s.source.toLowerCase().includes(c.toLowerCase())));
  const missingChecks = requiredChecks.filter(c=>!matchedChecks.includes(c));
  let status: 'HEALTHY'|'DEGRADED'|'UNHEALTHY'|'INSUFFICIENT_EVIDENCE' = 'HEALTHY';
  if (!verified.length) status='INSUFFICIENT_EVIDENCE';
  else if (critical.length) status='UNHEALTHY';
  else if (bad.length || missingChecks.length) status='DEGRADED';
  return { projectId:snapshot.projectId, environment:snapshot.environment, status, verifiedSignals:verified.length, errorSignals:bad, criticalSignals:critical, matchedChecks, missingChecks, releaseGate: status==='HEALTHY' ? 'PASS' : 'HOLD' };
}

export function detectRuntimeAnomalies(input: AnomalyInput) {
  const { snapshot, baseline, thresholds } = anomalyInputSchema.parse(input);
  const anomalies: any[] = [];
  for (const s of snapshot.signals) {
    if (!s.verified) continue;
    if (s.severity==='ERROR' || s.severity==='CRITICAL') anomalies.push({signalId:s.id,kind:'SEVERITY',severity:s.severity,reason:s.message});
    if (typeof s.value==='number' && thresholds[s.source] !== undefined && s.value > thresholds[s.source]) anomalies.push({signalId:s.id,kind:'THRESHOLD',severity:'WARN',reason:`${s.source}=${s.value}${s.unit||''} exceeded ${thresholds[s.source]}`});
  }
  if (baseline) {
    const bySource = new Map(baseline.signals.filter(s=>s.verified && typeof s.value==='number').map(s=>[s.source,s.value as number]));
    for (const s of snapshot.signals.filter(s=>s.verified && typeof s.value==='number')) {
      const b=bySource.get(s.source); if (b===undefined || b===0) continue;
      const pct=((s.value!-b)/Math.abs(b))*100;
      if (Math.abs(pct)>=50) anomalies.push({signalId:s.id,kind:'BASELINE_DEVIATION',severity:Math.abs(pct)>=100?'ERROR':'WARN',reason:`${s.source} changed ${pct.toFixed(1)}% from baseline`});
    }
  }
  return { projectId:snapshot.projectId, anomalyCount:anomalies.length, anomalies, status:anomalies.some(a=>a.severity==='ERROR'||a.severity==='CRITICAL')?'ACTION_REQUIRED':anomalies.length?'REVIEW':'NO_VERIFIED_ANOMALY' };
}

export function correlateRuntimeIncident(input: CorrelationInput) {
  const { snapshot, deploymentIds, changeRefs, debugSessionRefs } = incidentCorrelationSchema.parse(input);
  const verified = snapshot.signals.filter(s=>s.verified);
  const incidentSignals = verified.filter(s=>s.severity==='ERROR'||s.severity==='CRITICAL');
  return {
    projectId:snapshot.projectId,
    environment:snapshot.environment,
    incidentSignals,
    deploymentIds,
    changeRefs,
    debugSessionRefs,
    confidence: incidentSignals.length && (deploymentIds.length||changeRefs.length||debugSessionRefs.length) ? 'CORRELATION_CANDIDATE' : 'INSUFFICIENT_CORRELATION_EVIDENCE',
    rule:'Temporal or textual correlation is not root-cause proof; confirm through debugging evidence before asserting causation.'
  };
}

export function evaluateSlo(input: SloInput) {
  const x=sloInputSchema.parse(input); const observed=(x.goodEvents/x.totalEvents)*100; const budget=Math.max(0,100-x.targetPercent); const consumed=Math.max(0,100-observed);
  return {name:x.name,window:x.window,targetPercent:x.targetPercent,observedPercent:Number(observed.toFixed(4)),met:observed>=x.targetPercent,errorBudgetPercent:budget,errorBudgetConsumedPercent:Number(consumed.toFixed(4)),status:observed>=x.targetPercent?'SLO_MET':'SLO_BREACHED'};
}

export function buildRuntimeEvidence(snapshot: Snapshot) {
  const normalized=normalizeRuntimeSignals(snapshot);
  return normalized.signals.map(s=>({artifactType:'RUNTIME',source:s.source,signalId:s.id,verified:s.verified,severity:s.severity,message:s.message,evidenceRef:s.evidenceRef||null,timestamp:s.timestamp||null}));
}

export function recommendRuntimeAction(snapshot: Snapshot) {
  const n=normalizeRuntimeSignals(snapshot); const verified=n.signals.filter(s=>s.verified); const critical=verified.filter(s=>s.severity==='CRITICAL'); const errors=verified.filter(s=>s.severity==='ERROR');
  if (!verified.length) return {action:'COLLECT_EVIDENCE',reason:'No verified runtime evidence supplied.',next:['Fetch health/log/metric evidence through host-authorized tools','Attach evidence references']};
  if (critical.length) return {action:'INCIDENT_RECOVERY_REVIEW',reason:'Critical verified runtime signals exist.',next:['Correlate with recent changes','Open/continue debug session','Evaluate rollback/recovery plan under approval policy']};
  if (errors.length) return {action:'DEBUG_AND_VERIFY',reason:'Verified error signals exist.',next:['Create falsifiable hypothesis','Run smallest diagnostic','Do not release until regression evidence passes']};
  return {action:'CONTINUE_MONITORING',reason:'No verified ERROR/CRITICAL runtime signals in supplied snapshot.',next:['Maintain proportional runtime checks','Feed evidence into quality/release gate']};
}

export function compareObservabilitySnapshots(before: Snapshot, after: Snapshot) {
  const b=normalizeRuntimeSignals(before), a=normalizeRuntimeSignals(after);
  const count=(x:any[],level:string)=>x.filter(s=>s.verified&&s.severity===level).length;
  return {projectId:after.projectId,before:{signals:b.signals.length,verified:b.verifiedSignals,errors:count(b.signals,'ERROR'),critical:count(b.signals,'CRITICAL')},after:{signals:a.signals.length,verified:a.verifiedSignals,errors:count(a.signals,'ERROR'),critical:count(a.signals,'CRITICAL')},delta:{verified:a.verifiedSignals-b.verifiedSignals,errors:count(a.signals,'ERROR')-count(b.signals,'ERROR'),critical:count(a.signals,'CRITICAL')-count(b.signals,'CRITICAL')}};
}
