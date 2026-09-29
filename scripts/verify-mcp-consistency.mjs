import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
};

const route = read('app/mcp/route.ts');
const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const health = read('app/health/route.ts');
const home = read('app/page.tsx');

const registeredTools = [...route.matchAll(/server\.registerTool\(\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
const capabilitiesMatch = route.match(/tools:\s*\[([\s\S]*?)\]\s*,\s*boundary:/);
if (!capabilitiesMatch) fail('Could not find krom_get_capabilities tools array.');

const capabilityTools = capabilitiesMatch
  ? [...capabilitiesMatch[1].matchAll(/'([^']+)'/g)].map((match) => match[1])
  : [];

const unique = (items) => [...new Set(items)];
const duplicates = (items) => unique(items.filter((item, index) => items.indexOf(item) !== index));

const duplicateRegistrations = duplicates(registeredTools);
const duplicateCapabilities = duplicates(capabilityTools);
const missingCapabilities = unique(registeredTools).filter((tool) => !capabilityTools.includes(tool));
const extraCapabilities = unique(capabilityTools).filter((tool) => !registeredTools.includes(tool));
const invalidNames = unique(registeredTools).filter((tool) => !tool.startsWith('krom_'));

if (duplicateRegistrations.length) fail(`Duplicate registered tools: ${duplicateRegistrations.join(', ')}`);
if (duplicateCapabilities.length) fail(`Duplicate capability tools: ${duplicateCapabilities.join(', ')}`);
if (missingCapabilities.length) fail(`Registered tools missing from capabilities: ${missingCapabilities.join(', ')}`);
if (extraCapabilities.length) fail(`Capabilities missing registered tools: ${extraCapabilities.join(', ')}`);
if (invalidNames.length) fail(`Unexpected tool names: ${invalidNames.join(', ')}`);

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

if (!route.includes("from '../../src/mega-v48'")) fail('v48 module is not imported by the MCP route.');
if (!registeredTools.includes('krom_build_assurance_verification_contract')) fail('v48 assurance tools are not registered.');

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(JSON.stringify({
  status: 'PASS',
  version: pkg.version,
  registeredTools: unique(registeredTools).length,
  capabilityTools: unique(capabilityTools).length,
  duplicates: 0,
  missingCapabilities: 0,
  extraCapabilities: 0
}, null, 2));

