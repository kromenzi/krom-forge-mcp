import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const archivePath = path.join(root, 'runtime', 'krom-v45-source.tar.gz');

if (!fs.existsSync(archivePath)) {
  throw new Error('Missing runtime/krom-v45-source.tar.gz');
}

execFileSync('tar', ['-xzf', archivePath, '-C', root], { stdio: 'inherit' });

const health = fs.readFileSync(path.join(root, 'app', 'health', 'route.ts'), 'utf8');
if (!health.includes("45.0.0")) {
  throw new Error('Runtime source does not identify as v45.0.0');
}

const pagePath = path.join(root, 'app', 'page.tsx');
if (fs.existsSync(pagePath)) {
  let page = fs.readFileSync(pagePath, 'utf8');
  page = page.replace(/Version\s+35\.0\.0/g, 'Version 45.0.0');
  fs.writeFileSync(pagePath, page);
}

console.log('KROM Forge v45 runtime source restored.');
