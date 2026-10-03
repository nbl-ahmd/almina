import { createRequire } from 'node:module';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import { Buffer } from 'node:buffer';

const require = createRequire(new URL('../../frontend/package.json', import.meta.url));
const { SourceMapConsumer } = require('source-map');
const directory = resolve('frontend/build');
const manifest = JSON.parse(await readFile(resolve(directory, '.vite/manifest.json'), 'utf8'));
const initial = new Set();
function visit(key) {
  const entry = manifest[key];
  if (!entry || initial.has(entry.file)) return;
  initial.add(entry.file);
  for (const imported of entry.imports ?? []) visit(imported);
}
for (const [key, entry] of Object.entries(manifest)) if (entry.isEntry) visit(key);
const chunks = [];
for (const name of (await readdir(resolve(directory, 'assets'))).filter(name => name.endsWith('.js'))) {
  const relative = `assets/${name}`;
  const code = await readFile(resolve(directory, relative), 'utf8');
  const sourceMap = JSON.parse(await readFile(resolve(directory, relative + '.map'), 'utf8'));
  const consumer = await new SourceMapConsumer(sourceMap);
  const offsets = [0];
  for (let i = 0; i < code.length; i++) if (code[i] === '\n') offsets.push(i + 1);
  const mappings = [];
  consumer.eachMapping(mapping => mappings.push({ offset: offsets[mapping.generatedLine - 1] + mapping.generatedColumn, source: mapping.source }));
  const packages = {};
  for (let i = 0; i < mappings.length; i++) {
    const { offset, source } = mappings[i];
    const length = (mappings[i + 1]?.offset ?? code.length) - offset;
    const match = source?.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/);
    const group = match?.[1] ?? 'application';
    packages[group] = (packages[group] ?? 0) + length;
  }
  consumer.destroy?.();
  chunks.push({ file: relative, initial: initial.has(relative), bytes: Buffer.byteLength(code), gzipBytes: gzipSync(code).length,
    // Minified span estimates, not additive gzip attribution.
    mappedCodeUnits: Object.fromEntries(Object.entries(packages).sort((a,b)=>b[1]-a[1])) });
}
const report = { capturedAt: new Date().toISOString(), initialGzipBytes: chunks.filter(c=>c.initial).reduce((s,c)=>s+c.gzipBytes,0), totalGzipBytes: chunks.reduce((s,c)=>s+c.gzipBytes,0), chunks };
if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ initialGzipBytes: report.initialGzipBytes, totalGzipBytes: report.totalGzipBytes, chunks: chunks.length }));
