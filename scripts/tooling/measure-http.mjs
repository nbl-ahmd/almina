import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
const [origin, output] = process.argv.slice(2);
assert.ok(origin && output, 'Usage: node scripts/tooling/measure-http.mjs LOOPBACK_ORIGIN OUTPUT');
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'HTTP repetition is restricted to loopback.');
const rows = [];
for (const path of ['/', '/products', '/categories', '/products/daily-care--PD0001']) {
  await fetch(origin + path); // Warm server separately from samples.
  const samples = [];
  for (let run = 0; run < 20; run++) {
    const start = performance.now();
    const response = await fetch(origin + path);
    const ttfbMs = performance.now() - start;
    await response.arrayBuffer();
    samples.push({ ttfbMs, totalMs: performance.now() - start, status: response.status });
  }
  rows.push({ path, samples });
}
await writeFile(output, JSON.stringify({ profile: 'Warm compiled Next.js on loopback, synthetic upstream 80ms, 20 sequential requests per path. End-to-end server-response proxy; excludes WAN, includes HTTP overhead.', rows }, null, 2) + '\n');
