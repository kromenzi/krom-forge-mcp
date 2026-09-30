import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateProductionReadiness, decideRelease } from '../src/release-control-engine';

const readiness = {
  projectId: 'kromenzi/krom-forge-mcp',
  releaseId: 'v65-contract-regression',
  environment: 'production',
  dimensions: [
    { name: 'BUILD' as const, state: 'PASS' as const, evidenceRefs: ['build:1'], critical: true },
    { name: 'TEST' as const, state: 'PASS' as const, evidenceRefs: ['test:1'], critical: true },
    { name: 'SECURITY' as const, state: 'PASS' as const, evidenceRefs: ['security:1'] },
    { name: 'EVIDENCE' as const, state: 'PASS' as const, evidenceRefs: ['evidence:1'] },
    { name: 'RUNTIME' as const, state: 'PASS' as const, evidenceRefs: ['runtime:1'], critical: true },
    { name: 'RECOVERY' as const, state: 'PASS' as const, evidenceRefs: ['recovery:1'] },
    { name: 'QUALITY' as const, state: 'PASS' as const, evidenceRefs: ['quality:1'] },
    { name: 'APPROVAL' as const, state: 'PASS' as const, evidenceRefs: ['approval:1'] },
    { name: 'DEPLOYMENT' as const, state: 'PASS' as const, evidenceRefs: ['deployment:1'], critical: true },
    { name: 'DATA' as const, state: 'PASS' as const, evidenceRefs: ['data:1'] }
  ],
  unsupportedClaims: [],
  openCriticalRisks: [],
  openBlockers: [],
  approvalRequired: false,
  approvalGranted: true,
  rollbackPlanAvailable: true,
  rollbackPlanVerified: true,
  runtimeVerificationPlanned: true,
  changeWindow: 'approved-window',
  owner: 'kromenzi'
};

test('production readiness preserves release policy fields for lossless composition', () => {
  const evaluated = evaluateProductionReadiness(readiness);
  assert.equal(evaluated.approvalRequired, false);
  assert.equal(evaluated.approvalGranted, true);
  assert.equal(evaluated.rollbackPlanAvailable, true);
  assert.equal(evaluated.rollbackPlanVerified, true);
  assert.equal(evaluated.runtimeVerificationPlanned, true);
  assert.equal(evaluated.changeWindow, 'approved-window');
  assert.equal(evaluated.owner, 'kromenzi');
  assert.deepEqual(evaluated.unsupportedClaims, []);
  assert.deepEqual(evaluated.openCriticalRisks, []);
  assert.deepEqual(evaluated.openBlockers, []);
});

test('evaluateProductionReadiness output can feed decideRelease without policy-state loss', () => {
  const evaluated = evaluateProductionReadiness(readiness);
  const decision = decideRelease({
    readiness: evaluated,
    minimumScore: 85,
    allowConditional: true
  });

  assert.equal(decision.decision, 'READY');
  assert.equal(decision.releaseAllowed, true);
  assert.equal(decision.hardStops.length, 0);
  assert.ok(!decision.hardStops.includes('Required release approval is missing.'));
  assert.ok(!decision.hardStops.includes('Rollback/recovery plan is not available.'));
  assert.ok(!decision.hardStops.includes('Post-release runtime verification is not planned.'));
});
