import { buildMcpManifest, validateMcpManifest, writeMcpManifest } from './mcp-manifest-lib.mjs';

const flag = process.argv.indexOf('--output');
const outputPath = flag === -1 ? '.artifacts/mcp-manifest.json' : process.argv[flag + 1];
if (!outputPath) {
  console.error('FAIL: --output requires a file path.');
  process.exit(1);
}

const manifest = buildMcpManifest();
const validation = validateMcpManifest(manifest);
if (validation.status !== 'PASS') {
  console.error(JSON.stringify({ validation, integrity: manifest.integrity }, null, 2));
  process.exit(1);
}

const written = writeMcpManifest(manifest, outputPath);
console.log(JSON.stringify({
  status: validation.status,
  version: manifest.version,
  registeredTools: manifest.counts.registered,
  capabilityTools: manifest.counts.capabilities,
  sourceModules: manifest.counts.sourceModules,
  fingerprint: manifest.fingerprint,
  output: written
}, null, 2));
