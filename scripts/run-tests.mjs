import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const root = process.cwd();
const testsRoot = path.join(root, 'tests');
const testPattern = /\.test\.(?:ts|mts|cts|js|mjs|cjs)$/;

function discover(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? discover(target) : testPattern.test(entry.name) ? [target] : [];
  });
}

const files = discover(testsRoot).sort();
if (!files.length) {
  console.error('FAIL: no test files discovered.');
  process.exit(1);
}

const require = createRequire(import.meta.url);
const tsxCli = require.resolve('tsx/cli');
console.log(`Discovered ${files.length} test file(s).`);
const result = spawnSync(process.execPath, [tsxCli, '--test', ...files], { cwd: root, stdio: 'inherit' });

if (result.error) throw result.error;
process.exit(result.status ?? 1);
