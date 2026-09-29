import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';

const root = process.cwd();
const partsDir = path.join(root, 'runtime', 'parts');
const parts = fs.readdirSync(partsDir)
  .filter((f) => /^part-\d+\.b64$/.test(f))
  .sort();

if (parts.length !== 7) {
  throw new Error(`Expected 7 runtime bundle parts, found ${parts.length}`);
}

const base64 = parts
  .map((f) => fs.readFileSync(path.join(partsDir, f), 'utf8').trim())
  .join('');

const archive = Buffer.from(base64, 'base64');
const sha = crypto.createHash('sha256').update(archive).digest('hex');
const expected = '63842ded4303653476efc3d132fff125c2e051ba04bab60d98ff8c1d3cf59ef1';

if (sha !== expected) {
  throw new Error(`Runtime bundle SHA256 mismatch: ${sha}`);
}

const archivePath = path.join(root, '.krom-v45-source.tar.gz');
fs.writeFileSync(archivePath, archive);
execFileSync('tar', ['-xzf', archivePath, '-C', root], { stdio: 'inherit' });
fs.unlinkSync(archivePath);

const health = fs.readFileSync(path.join(root, 'app', 'health', 'route.ts'), 'utf8');
if (!health.includes('45.0.0')) {
  throw new Error('Runtime source does not identify as v45.0.0');
}

console.log(`KROM Forge v45 source restored (${archive.length} bytes, sha256 verified).`);
