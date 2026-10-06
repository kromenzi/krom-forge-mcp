import fs from 'node:fs';
import path from 'node:path';
import {
  buildCapabilityMetadataV79,
  isCapabilityAllowedV79,
  resolveCapabilityProfileV79,
  summarizeInputSchemaV79
} from '../src/v79-capability-governance';

const fail = (message: string): never => {
  console.error(`FAIL: ${message}`);
  process.exit(1);
};

const root = process.cwd();
const route = fs.readFileSync(path.resolve(root, 'app/mcp/route.ts'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.resolve(root, 'package.json'), 'utf8'));

if (packageJson.version !== '79.0.0') fail(`Expected package version 79.0.0, got ${packageJson.version}`);
if (!route.includes('KROM_CORE_PUBLIC_TOOL_NAMES')) fail('Core public tool surface is missing.');
if (!route.includes('KROM_LEGACY_PUBLIC_TOOL_NAMES')) fail('Legacy public tool surface is missing.');
if (!route.includes('krom_describe_capability')) fail('Capability describe gateway is missing.');
if (!route.includes('KROM_MCP_PROFILE')) fail('Trusted server profile configuration is missing.');
if (!route.includes('KROM_MCP_REQUIRE_AUTH')) fail('Configurable MCP auth guard is missing.');
if (!route.includes('KROM_CONTROL_TOOL_DIRECTORY')) fail('Control-plane directory is missing.');

const coreBlock = route.match(/const KROM_CORE_PUBLIC_TOOL_NAMES = new Set\(\[([\s\S]*?)\]\);/);
if (!coreBlock) fail('Could not parse core public tool list.');
const coreBlockText = coreBlock?.[1] ?? '';
const coreTools = [...coreBlockText.matchAll(/['"]([^'"]+)['"]/g)].map((match) => match[1]);
if (coreTools.length < 10 || coreTools.length > 15) fail(`Core public tool surface must contain 10-15 tools; got ${coreTools.length}`);
if (new Set(coreTools).size !== coreTools.length) fail('Core public tool surface contains duplicates.');

for (const required of [
  'krom_route_workflow',
  'krom_inspect_project',
  'krom_plan_code_change',
  'krom_verify_evidence',
  'krom_evaluate_security_assessment',
  'krom_evaluate_production_readiness',
  'krom_decide_release',
  'krom_v77_build_native_mission_plan',
  'krom_v77_mission_control',
  'krom_v78_autonomous_governance',
  'krom_get_capabilities',
  'krom_search_capabilities',
  'krom_describe_capability',
  'krom_dispatch_capability'
]) {
  if (!coreTools.includes(required)) fail(`Required v79 core tool missing: ${required}`);
}

if (resolveCapabilityProfileV79('FULL-LEGACY') !== 'full-legacy') fail('Profile normalization failed.');
if (resolveCapabilityProfileV79('model-supplied-unknown') !== 'core') fail('Unknown profile must fail closed to core.');

const admin = buildCapabilityMetadataV79('krom_v74_audit_skill_registry', 'Audit skill registry', '', false, false);
if (isCapabilityAllowedV79(admin, 'core')) fail('Admin capability must not be dispatchable from core.');
if (!isCapabilityAllowedV79(admin, 'skills-admin')) fail('Admin capability must be dispatchable from skills-admin.');

const normal = buildCapabilityMetadataV79('krom_v66_build_capability_discovery', 'Build capability discovery', '', false, false);
if (!isCapabilityAllowedV79(normal, 'core')) fail('Ordinary analysis capability should remain available to core routing.');
if (normal.lifecycle !== 'stable') fail('Current capability lifecycle should default to stable.');
if (!normal.requiredEvidence.length) fail('Capability metadata must declare evidence expectations.');

const schema = summarizeInputSchemaV79({ safeParse() {}, shape: { query: {}, limit: {} } });
if (!schema.validatesWithSafeParse || schema.fields.join(',') !== 'limit,query') fail('Schema summary contract failed.');

console.log(JSON.stringify({
  status: 'PASS',
  version: packageJson.version,
  corePublicTools: coreTools.length,
  defaultProfile: resolveCapabilityProfileV79(undefined),
  legacyProfile: resolveCapabilityProfileV79('full-legacy'),
  adminCoreDenied: true,
  internalCapabilityTarget: 5333
}, null, 2));
