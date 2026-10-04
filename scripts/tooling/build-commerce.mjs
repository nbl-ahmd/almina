import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
// Both HTTP stacks execute the same TypeScript domain. Deployment builds the legacy adapter once.
const result = await build({ entryPoints: ['apps/api/src/legacy.ts'], outfile: 'backend/commerce/dist/service.cjs',
  bundle: true, platform: 'node', target: 'node24', format: 'cjs', external: ['mongodb'], metafile: true });
const sources = [...Object.keys(result.metafile.inputs).filter(file => !file.includes('node_modules/')),
  'scripts/tooling/build-commerce.mjs', 'package-lock.json'];
const hashes = {};
for (const file of sources) hashes[file] = createHash('sha256').update(await readFile(file)).digest('hex');
await writeFile('backend/commerce/dist/build.json', JSON.stringify(hashes));
