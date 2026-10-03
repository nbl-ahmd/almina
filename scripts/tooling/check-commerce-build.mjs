import { createHash } from 'node:crypto';
import { readFile, access } from 'node:fs/promises';
try {
  await access('backend/commerce/dist/service.cjs');
  const hashes = JSON.parse(await readFile('backend/commerce/dist/build.json', 'utf8'));
  for (const [file, expected] of Object.entries(hashes)) {
    if (createHash('sha256').update(await readFile(file)).digest('hex') !== expected) throw new Error('Stale adapter');
  }
} catch {
  process.stderr.write('Commerce adapter missing or stale. Run npm run build:commerce during deployment build before starting the legacy API.\n');
  process.exitCode = 1;
}
