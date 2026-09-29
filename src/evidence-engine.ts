import type { z } from 'zod';
import {
  createEvidenceBundleSchema,
  evidenceBundleSchema,
  evidenceClaimSchema,
  evidenceArtifactSchema
} from './evidence-schema';

type Bundle = z.infer<typeof evidenceBundleSchema>;
type Claim = z.infer<typeof evidenceClaimSchema>;
type Artifact = z.infer<typeof evidenceArtifactSchema>;

const now = () => new Date().toISOString();

export function createEvidenceBundle(input: z.infer<typeof createEvidenceBundleSchema>): Bundle {
  const t = now();
  return { projectId: input.projectId, scopeKey: input.scopeKey, version: '33.0.0', createdAt: t, updatedAt: t, claims: [], artifacts: [] };
}

function sameScope(bundle: Bundle) {
  if (!bundle.projectId || !bundle.scopeKey) throw new Error('Evidence bundle requires projectId and scopeKey.');
}

export function recordClaim(bundle: Bundle, claim: Claim): Bundle {
  sameScope(bundle);
  const claims = [...bundle.claims.filter(c => c.id !== claim.id), { ...claim, status: claim.status ?? 'UNSUPPORTED' }];
  return { ...bundle, version: '33.0.0', claims, updatedAt: now() };
}

export function recordArtifact(bundle: Bundle, artifact: Artifact): Bundle {
  sameScope(bundle);
  const artifacts = [...bundle.artifacts.filter(a => a.id !== artifact.id), artifact];
  return { ...bundle, version: '33.0.0', artifacts, updatedAt: now() };
}

export function linkClaimEvidence(bundle: Bundle, claimId: string, evidenceRefs: string[]): Bundle {
  sameScope(bundle);
  const known = new Set(bundle.artifacts.map(a => a.id));
  const missing = evidenceRefs.filter(id => !known.has(id));
  if (missing.length) throw new Error(`Unknown evidence refs: ${missing.join(', ')}`);
  const claims = bundle.claims.map(c => c.id === claimId ? { ...c, evidenceRefs: [...new Set([...c.evidenceRefs, ...evidenceRefs])] } : c);
  if (!claims.some(c => c.id === claimId)) throw new Error(`Unknown claim: ${claimId}`);
  return { ...bundle, claims, updatedAt: now() };
}

const defaultRequiredKinds: Record<Claim['type'], Artifact['kind'][]> = {
  BUILD_PASSED: ['BUILD'],
  TYPECHECK_PASSED: ['TYPECHECK'],
  TESTS_PASSED: ['TEST'],
  FIXED: ['DIFF','TEST'],
  DEPLOYED: ['DEPLOYMENT'],
  SECURITY_VERIFIED: ['SECURITY'],
  DATABASE_VERIFIED: ['DATABASE'],
  UI_VERIFIED: ['BROWSER'],
  RELEASE_READY: ['BUILD','TEST','DEPLOYMENT'],
  CUSTOM: []
};

export function verifyClaim(bundle: Bundle, claimId: string) {
  sameScope(bundle);
  const claim = bundle.claims.find(c => c.id === claimId);
  if (!claim) throw new Error(`Unknown claim: ${claimId}`);
  const linked = bundle.artifacts.filter(a => claim.evidenceRefs.includes(a.id));
  const verified = linked.filter(a => a.verified);
  const requiredKinds = claim.requiredKinds.length ? claim.requiredKinds : defaultRequiredKinds[claim.type];
  const presentKinds = new Set(verified.map(a => a.kind));
  const missingKinds = requiredKinds.filter(k => !presentKinds.has(k));
  const contradiction = linked.some(a => /fail|error|blocked|not ready|reverted/i.test(a.summary) && a.verified);
  const status: Claim['status'] = contradiction ? 'CONTRADICTED' : verified.length === 0 ? 'UNSUPPORTED' : missingKinds.length ? 'PARTIAL' : 'SUPPORTED';
  const updatedClaim = { ...claim, status, notes: [...claim.notes.filter(n => !n.startsWith('Evidence verification:')), `Evidence verification: ${status}; verified=${verified.length}; missingKinds=${missingKinds.join(',') || 'none'}`] };
  return {
    bundle: { ...bundle, claims: bundle.claims.map(c => c.id === claimId ? updatedClaim : c), updatedAt: now() },
    claim: updatedClaim,
    verifiedEvidence: verified.map(a => ({ id: a.id, kind: a.kind, source: a.source, summary: a.summary })),
    missingKinds,
    status
  };
}

export function auditEvidenceGraph(bundle: Bundle) {
  sameScope(bundle);
  const artifactIds = new Set(bundle.artifacts.map(a => a.id));
  const dangling = bundle.claims.flatMap(c => c.evidenceRefs.filter(id => !artifactIds.has(id)).map(id => ({ claimId: c.id, evidenceRef: id })));
  const unsupported = bundle.claims.filter(c => c.status === 'UNSUPPORTED').map(c => c.id);
  const partial = bundle.claims.filter(c => c.status === 'PARTIAL').map(c => c.id);
  const contradicted = bundle.claims.filter(c => c.status === 'CONTRADICTED').map(c => c.id);
  const unverifiedArtifacts = bundle.artifacts.filter(a => !a.verified).map(a => a.id);
  return {
    overall: dangling.length || contradicted.length ? 'FAIL' : unsupported.length || partial.length || unverifiedArtifacts.length ? 'PASS_WITH_GAPS' : 'PASS',
    dangling,
    unsupported,
    partial,
    contradicted,
    unverifiedArtifacts,
    counts: { claims: bundle.claims.length, artifacts: bundle.artifacts.length, verifiedArtifacts: bundle.artifacts.filter(a => a.verified).length }
  };
}

export function buildReleaseEvidence(bundle: Bundle) {
  sameScope(bundle);
  const required = ['BUILD_PASSED','TESTS_PASSED','DEPLOYED'] as Claim['type'][];
  const gates = required.map(type => {
    const claim = bundle.claims.find(c => c.type === type);
    return claim ? { name: type, status: claim.status === 'SUPPORTED' ? 'PASS' : claim.status === 'CONTRADICTED' ? 'FAIL' : 'PASS_WITH_GAPS', evidence: claim.evidenceRefs.join(', ') } : { name: type, status: 'NOT_AVAILABLE', evidence: '' };
  });
  const failures = gates.filter(g => g.status === 'FAIL');
  const gaps = gates.filter(g => g.status !== 'PASS');
  return { overall: failures.length ? 'FAIL' : gaps.length ? 'PASS_WITH_GAPS' : 'PASS', gates, note: 'Release status is derived only from recorded claim/evidence state.' };
}

export function compareEvidenceBundles(before: Bundle, after: Bundle) {
  if (before.projectId !== after.projectId || before.scopeKey !== after.scopeKey) throw new Error('Cannot compare evidence bundles from different project scopes.');
  const beforeMap = new Map(before.claims.map(c => [c.id, c.status]));
  const afterMap = new Map(after.claims.map(c => [c.id, c.status]));
  const changedClaims = [...afterMap.entries()].filter(([id,status]) => beforeMap.get(id) !== status).map(([id,status]) => ({ id, before: beforeMap.get(id) ?? 'MISSING', after: status }));
  const newArtifacts = after.artifacts.filter(a => !before.artifacts.some(b => b.id === a.id)).map(a => a.id);
  return { changedClaims, newArtifacts, beforeUpdatedAt: before.updatedAt, afterUpdatedAt: after.updatedAt };
}
