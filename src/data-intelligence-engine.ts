import type { z } from 'zod';
import { databaseSnapshotSchema, schemaDriftSchema, migrationSafetySchema, queryAnalysisSchema, dataIntegritySchema } from './data-intelligence-schema';

type Snapshot = z.infer<typeof databaseSnapshotSchema>;
type Drift = z.infer<typeof schemaDriftSchema>;
type Migration = z.infer<typeof migrationSafetySchema>;
type QueryInput = z.infer<typeof queryAnalysisSchema>;
type Integrity = z.infer<typeof dataIntegritySchema>;

export function auditDatabaseArchitecture(input: Snapshot) {
  const findings: Array<{severity:string;entity?:string;issue:string}> = [];
  for (const e of input.entities) {
    if (!e.primaryKey) findings.push({ severity:'HIGH', entity:e.name, issue:'No primary key evidence supplied.' });
    if (e.tenantScoped && input.rlsEvidence.length === 0) findings.push({ severity:'HIGH', entity:e.name, issue:'Tenant-scoped entity has no RLS evidence.' });
    if (e.sensitiveFields.length && input.rlsEvidence.length === 0) findings.push({ severity:'HIGH', entity:e.name, issue:'Sensitive fields exist without supplied row-access evidence.' });
    if ((e.rowsEstimate ?? 0) > 100000 && e.indexes.length === 0) findings.push({ severity:'MEDIUM', entity:e.name, issue:'Large entity has no index evidence.' });
  }
  return { project:input.project, status: findings.some(f=>f.severity==='HIGH')?'FAIL':findings.length?'PASS_WITH_GAPS':'PASS', findings, evidenceBoundary:'Evaluates host-supplied schema/data evidence only.' };
}

export function detectSchemaDrift(input: Drift) {
  const exp = new Map(input.expected.entities.map(e=>[e.name,e]));
  const act = new Map(input.actual.entities.map(e=>[e.name,e]));
  const missing = [...exp.keys()].filter(k=>!act.has(k));
  const unexpected = [...act.keys()].filter(k=>!exp.has(k));
  const changed = [...exp.keys()].filter(k=>act.has(k)).filter(k=>JSON.stringify(exp.get(k))!==JSON.stringify(act.get(k)));
  return { missingEntities:missing, unexpectedEntities:unexpected, changedEntities:changed, driftDetected:Boolean(missing.length||unexpected.length||changed.length) };
}

export function assessMigrationSafety(input: Migration) {
  const blockers:string[] = [];
  const warnings:string[] = [];
  if (input.destructive && !input.backupVerified) blockers.push('Destructive migration without verified backup.');
  if (input.destructive && !input.rollbackTested && !input.reversible) blockers.push('Destructive migration has neither tested rollback nor reversibility evidence.');
  if (!input.evidenceRefs.length) warnings.push('No migration evidence references supplied.');
  if ((input.expectedDowntimeSeconds ?? 0) > 60) warnings.push('Expected downtime exceeds 60 seconds; release coordination required.');
  return { migrationId:input.migrationId, decision:blockers.length?'BLOCKED':warnings.length?'CONDITIONAL':'READY', blockers, warnings, affectedEntities:input.affectedEntities };
}

export function analyzeQueryPerformance(input: QueryInput) {
  const findings = input.queries.map(q=>({
    id:q.id,
    status: q.latencyMs == null ? 'UNKNOWN' : q.latencyMs > input.latencyBudgetMs ? 'FAIL' : 'PASS',
    issues:[
      q.latencyMs != null && q.latencyMs > input.latencyBudgetMs ? `Latency ${q.latencyMs}ms exceeds ${input.latencyBudgetMs}ms budget.` : '',
      q.rowsScanned != null && q.rowsScanned > input.maxRowsScanned ? `Rows scanned ${q.rowsScanned} exceed threshold ${input.maxRowsScanned}.` : '',
      q.usesIndex === false ? 'Query evidence indicates no index use.' : ''
    ].filter(Boolean), evidenceRef:q.evidenceRef
  }));
  return { findings, failures:findings.filter(f=>f.status==='FAIL').map(f=>f.id), unknown:findings.filter(f=>f.status==='UNKNOWN').map(f=>f.id) };
}

export function evaluateDataIntegrity(input: Integrity) {
  const failed = input.checks.filter(c=>c.status==='FAIL');
  const unknown = input.checks.filter(c=>c.status==='UNKNOWN'||!c.evidenceRef);
  return { status:failed.length?'FAIL':unknown.length?'PASS_WITH_GAPS':'PASS', failed:failed.map(c=>c.id), gaps:unknown.map(c=>c.id), checks:input.checks };
}

export function verifyBackupReadiness(input: Snapshot) {
  return { status: input.backupEvidence.length ? 'EVIDENCED' : 'NOT_EVIDENCED', evidenceRefs:input.backupEvidence, warning: input.backupEvidence.length ? undefined : 'Backup readiness cannot be claimed without host-supplied evidence.' };
}

export function compareDatabaseSnapshots(before: Snapshot, after: Snapshot) {
  return detectSchemaDrift({ expected:before, actual:after });
}
