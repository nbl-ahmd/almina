import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
// Compiled static chunks only: no environment, DB, provider or source map secrets.
const directory = resolve('apps/web', process.env.AL_MINA_ISOLATED_BUILD === '1' ? '.next-verification' : '.next', 'static');
const chunks = [];
async function visit(path, prefix = '') {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) await visit(resolve(path, entry.name), `${relative}/`);
    else if (entry.isFile() && /\.(js|css|woff2)$/.test(entry.name)) {
      const contents = await readFile(resolve(path, entry.name));
      chunks.push({ path: relative, bytes: contents.length, gzipBytes: gzipSync(contents).length });
    }
  }
}
await visit(directory);
chunks.sort((a, b) => b.bytes - a.bytes);
await mkdir('.verification-results', { recursive: true });
await writeFile('.verification-results/web-bundle.json', JSON.stringify({
  scope: 'All compiled static chunks; not initial route transfer, latency or Core Web Vitals.', chunks,
}, null, 2) + '\n');
console.log(`Measured ${chunks.length} Next static artifacts; see .verification-results/web-bundle.json`);
