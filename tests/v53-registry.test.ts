import assert from 'node:assert/strict';
import test from 'node:test';
import { V53_TOOL_NAMES, V53_TOOL_SPECS, executeV53Tool, v53UniversalSchema } from '../src/v53-registry';

test('v53 generates exactly 2000 MCP tools', () => {
  assert.equal(V53_TOOL_SPECS.length, 2000);
  assert.equal(V53_TOOL_NAMES.length, 2000);
  assert.equal(new Set(V53_TOOL_NAMES).size, 2000);
});

test('v53 covers 40 domains and 50 operations', () => {
  assert.equal(new Set(V53_TOOL_SPECS.map((tool) => tool.domainId)).size, 40);
  assert.equal(new Set(V53_TOOL_SPECS.map((tool) => tool.operationId)).size, 50);
});

test('every v53 tool has strong metadata and KROM prefix', () => {
  for (const tool of V53_TOOL_SPECS) {
    assert.ok(tool.name.startsWith('krom_v53_'));
    assert.ok(tool.title.length > 8);
    assert.ok(tool.description.length > 40);
    assert.ok(tool.focus.length >= 4);
    assert.ok(tool.evidenceKinds.length >= 3);
  }
});

test('evidence-strict v53 tools refuse unsupported verification', () => {
  const spec = V53_TOOL_SPECS.find((tool) => tool.domainId === 'security' && tool.operationId === 'verify')!;
  const input = v53UniversalSchema.parse({ objective: 'Verify release security' });
  const result = executeV53Tool(spec, input);
  assert.equal(result.status, 'NOT_AVAILABLE');
  assert.equal(result.executionClaim, false);
});

test('planning v53 tools never claim host mutation', () => {
  const spec = V53_TOOL_SPECS.find((tool) => tool.domainId === 'database' && tool.operationId === 'migrate')!;
  const input = v53UniversalSchema.parse({ objective: 'Migrate schema safely', constraints: ['zero data loss'] });
  const result = executeV53Tool(spec, input) as any;
  assert.equal(result.executionClaim, false);
  assert.equal(result.hostAuthorizationRequiredForMutation, true);
  assert.equal(result.rollbackRequired, true);
});

test('model tools mark scenarios as hypotheses, not observations', () => {
  const spec = V53_TOOL_SPECS.find((tool) => tool.domainId === 'sre' && tool.operationId === 'simulate')!;
  const input = v53UniversalSchema.parse({ objective: 'Simulate outage propagation' });
  const result = executeV53Tool(spec, input) as any;
  assert.ok(result.scenarios.every((scenario: any) => scenario.observed === false));
});

test('verified evidence enables strict evaluation without fabricating coverage', () => {
  const spec = V53_TOOL_SPECS.find((tool) => tool.domainId === 'api' && tool.operationId === 'validate')!;
  const input = v53UniversalSchema.parse({
    objective: 'Validate API change',
    evidence: [{ id: 'openapi', kind: 'OPENAPI', verified: true, source: 'test' }]
  });
  const result = executeV53Tool(spec, input);
  assert.equal(result.status, 'READY');
  assert.equal(result.evidence.verifiedCount, 1);
});
