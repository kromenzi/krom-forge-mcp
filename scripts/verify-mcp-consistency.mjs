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

const requiredModules = ['mega-v48', 'mega-v49', 'v50-schema', 'v50-engine', 'v51-schema', 'v51-engine', 'v52-schema', 'v52-engine', 'v53-registry', 'v54-registry', 'v55-schema', 'v55-engine', 'v56-schema', 'v56-engine', 'v57-schema', 'v57-engine', 'v58-schema', 'v58-engine', 'v59-schema', 'v59-engine'];
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
  'krom_build_learning_feedback_loop',
  'krom_compile_engineering_constitution',
  'krom_solve_engineering_constraints',
  'krom_build_engineering_trust_graph',
  'krom_simulate_change_blast_radius',
  'krom_score_recovery_strategies',
  'krom_optimize_verification_spend',
  'krom_build_program_dependency_network',
  'krom_build_operator_decision_cockpit',
  'krom_v55_route_adaptive_intent',
  'krom_v55_build_on_demand_tool_set',
  'krom_v55_simulate_execution_dry_run',
  'krom_v55_build_mission_console_snapshot',
  'krom_v56_build_self_healing_replan',
  'krom_v56_detect_retry_loop',
  'krom_v56_select_failover_provider',
  'krom_v56_build_self_healing_command_snapshot',
  'krom_v57_retrieve_project_memory',
  'krom_v57_schedule_missions',
  'krom_v57_rank_adaptive_tool_portfolio',
  'krom_v57_build_autonomous_brain_snapshot',
  'krom_v58_build_idempotent_mission_schedule',
  'krom_v58_match_tool_marketplace',
  'krom_v58_run_predictive_premortem',
  'krom_v58_build_engineering_os_snapshot',
  'krom_v59_build_idempotent_event_plan',
  'krom_v59_coordinate_distributed_missions',
  'krom_v59_select_resilient_provider',
  'krom_v59_build_control_fabric_snapshot'
];
const registeredNames = new Set(manifest.tools.map((tool) => tool.name));
const missingLayers = requiredLayerTools.filter((tool) => !registeredNames.has(tool));
if (missingLayers.length) fail(`Required control layers are not registered: ${missingLayers.join(', ')}`);

const v53GeneratedTools = manifest.tools.filter((tool) => tool.name.startsWith('krom_v53_'));
if (v53GeneratedTools.length !== 2000) fail(`v53 must register exactly 2000 generated tools; found ${v53GeneratedTools.length}`);
if (new Set(v53GeneratedTools.map((tool) => tool.name)).size !== 2000) fail('v53 generated tool names must be unique.');
if (manifest.counts.registered < 2515) fail(`Expected at least 2515 total registered tools after v53; found ${manifest.counts.registered}`);
if (!route.includes('for (const spec of V53_TOOL_SPECS)')) fail('v53 runtime generated registration loop is missing.');
if (!route.includes('...V53_TOOL_NAMES')) fail('v53 capability expansion is missing.');

const v54GeneratedTools = manifest.tools.filter((tool) => tool.name.startsWith('krom_v54_'));
if (v54GeneratedTools.length !== 2485) fail(`v54 must register exactly 2485 generated tools; found ${v54GeneratedTools.length}`);
if (new Set(v54GeneratedTools.map((tool) => tool.name)).size !== 2485) fail('v54 generated tool names must be unique.');
const generatedOverlap = v54GeneratedTools.filter((tool) => v53GeneratedTools.some((prior) => prior.name === tool.name));
if (generatedOverlap.length) fail(`v53/v54 generated tool overlap detected: ${generatedOverlap.slice(0,5).map((tool)=>tool.name).join(', ')}`);
if (manifest.counts.registered !== 5116) fail(`Expected exactly 5116 total registered tools after v59; found ${manifest.counts.registered}`);
if (manifest.counts.capabilities !== 5116) fail(`Expected exactly 5116 capability tools after v59; found ${manifest.counts.capabilities}`);
if (!route.includes('for (const spec of V54_TOOL_SPECS)')) fail('v54 runtime generated registration loop is missing.');
if (!route.includes('...V54_TOOL_NAMES')) fail('v54 capability expansion is missing.');

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
  v52Systems: 8,
  v53Domains: 40,
  v53OperationsPerDomain: 50,
  v53GeneratedTools: v53GeneratedTools.length,
  v54Domains: 35,
  v54OperationsPerDomain: 71,
  v54GeneratedTools: v54GeneratedTools.length,
  targetTotalTools: 5116,
  v55RuntimeTools: 28,
  v56RuntimeTools: 24,
  v57BrainTools: 20,
  v58OsTools: 21,
  v59FabricTools: 23,
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

