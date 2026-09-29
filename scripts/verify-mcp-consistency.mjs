import fs from 'node:fs';
import path from 'node:path';
import { buildMcpManifest, validateMcpManifest, writeMcpManifest } from './mcp-manifest-lib.mjs';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const fail = (message) => failures.push(message);
const argument = (name) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
};

const route = read('app/mcp/route.ts');
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const health = read('app/health/route.ts');
const home = read('app/page.tsx');
const manifest = buildMcpManifest({ root });
const manifestValidation = validateMcpManifest(manifest);

for (const failure of manifestValidation.failures) fail(failure);

if (lock.version !== pkg.version) fail(`package-lock root version ${lock.version} does not match package ${pkg.version}`);
if (lock.packages?.['']?.version !== pkg.version) {
  fail(`package-lock package version ${lock.packages?.['']?.version} does not match package ${pkg.version}`);
}

if (!route.includes("serverInfo: { name: 'krom-forge', version: pkg.version }")) {
  fail('MCP serverInfo version must derive from package.json.');
}
if (!route.includes('version: pkg.version')) fail('MCP capabilities version must derive from package.json.');
if (!health.includes('version: pkg.version')) fail('/health version must derive from package.json.');
if (!home.includes('Version {pkg.version}')) fail('Homepage version must derive from package.json.');

const requiredModules = ['mega-v48', 'mega-v49', 'v50-schema', 'v50-engine', 'v51-schema', 'v51-engine'];
const missingModules = requiredModules.filter((module) => !manifest.sourceModules.includes(module));
if (missingModules.length) fail(`Required source modules missing from route: ${missingModules.join(', ')}`);

const requiredLayerTools = [
  'krom_build_assurance_verification_contract',
  'krom_build_release_provenance',
  'krom_compile_policy_set',
  'krom_build_evidence_lineage',
  'krom_optimize_verification_portfolio',
  'krom_calculate_release_confidence',
  'krom_build_incident_command_plan',
  'krom_detect_breaking_compatibility_changes',
  'krom_evaluate_agent_reliability',
  'krom_build_continuous_improvement_backlog',
  'krom_create_mission_runtime',
  'krom_build_causal_decision_graph',
  'krom_simulate_delivery_scenarios',
  'krom_allocate_change_risk_capital',
  'krom_match_capability_demand',
  'krom_consolidate_project_knowledge',
  'krom_build_engineering_safety_case',
  'krom_build_release_digital_twin',
  'krom_build_tool_ecosystem_graph',
  'krom_forecast_engineering_drift',
  'krom_audit_human_approval_chain',
  'krom_build_learning_feedback_loop'
];
const registeredNames = new Set(manifest.tools.map((tool) => tool.name));
const missingLayers = requiredLayerTools.filter((tool) => !registeredNames.has(tool));
if (missingLayers.length) fail(`Required control layers are not registered: ${missingLayers.join(', ')}`);

const report = {
  status: failures.length ? 'FAIL' : 'PASS',
  version: pkg.version,
  registeredTools: manifest.counts.registered,
  capabilityTools: manifest.counts.capabilities,
  sourceModules: manifest.counts.sourceModules,
  duplicates: manifest.integrity.duplicateRegistrations.length + manifest.integrity.duplicateCapabilities.length,
  missingCapabilities: manifest.integrity.missingCapabilities.length,
  extraCapabilities: manifest.integrity.extraCapabilities.length,
  metadataGaps: manifest.integrity.metadataGaps.length,
  v50Systems: 8,
  v51Systems: 12,
  manifestFingerprint: manifest.fingerprint,
  failures
};

const manifestOutput = argument('--manifest-output');
if (manifestOutput) writeMcpManifest(manifest, manifestOutput, root);

const output = argument('--output');
if (output) {
  const absolute = path.resolve(root, output);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`);
}

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);

