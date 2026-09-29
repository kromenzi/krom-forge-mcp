import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMcpManifest, validateMcpManifest } from '../scripts/mcp-manifest-lib.mjs';

test('AST manifest discovers every registered tool and capability', () => {
  const manifest = buildMcpManifest();
  assert.equal(manifest.counts.registered, manifest.counts.capabilities);
  assert.equal(manifest.tools.length, manifest.counts.registered);
  assert.equal(validateMcpManifest(manifest).status, 'PASS');
});

test('AST manifest requires complete tool metadata', () => {
  const manifest = buildMcpManifest();
  assert.deepEqual(manifest.integrity.metadataGaps, []);
  assert.ok(manifest.tools.every((tool) => tool.title && tool.description && tool.inputSchemaExpression));
});

test('AST manifest fingerprint is deterministic', () => {
  assert.equal(buildMcpManifest().fingerprint, buildMcpManifest().fingerprint);
});

test('AST manifest tracks source modules and source locations', () => {
  const manifest = buildMcpManifest();
  assert.ok(manifest.sourceModules.includes('mega-v49'));
  assert.ok(manifest.tools.every((tool) => Number.isInteger(tool.line) && tool.line > 0));
});
