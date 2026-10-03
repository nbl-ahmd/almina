import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { MongoClient, ObjectId } from 'mongodb';
import { createCatalogRepository } from '../../apps/api/src/modules/catalog/repository';
import { applyIndexes } from '../../apps/api/src/database/indexes';

async function main() {
  // A new disposable process/directory every run. Never reads an application URI.
  const [mongod, output] = process.argv.slice(2);
  assert.ok(mongod && output, 'Usage: tsx scripts/tooling/measure-database.ts MONGOD OUTPUT');
  const directory = await mkdtemp(join(tmpdir(), 'almina-performance-db-'));
  const probe = createServer();
  await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>(resolve => probe.close(() => resolve()));
  const child = spawn(mongod, ['--dbpath', directory, '--bind_ip', '127.0.0.1', '--port', String(port), '--logpath', join(directory, 'mongod.log')], { stdio: 'ignore' });
  let startupError: Error | undefined;
  child.on('error', error => { startupError = error; });
  const client = new MongoClient(`mongodb://127.0.0.1:${port}/?directConnection=true`, { serverSelectionTimeoutMS: 500 });
  const db = client.db('synthetic_performance');
  const rows: { query: string; indexed: boolean; samplesMs: number[]; keysExamined: number; docsExamined: number }[] = [];
  try {
    for (let attempt = 0; ; attempt++) {
      if (startupError || child.exitCode !== null) throw new Error('Disposable mongod did not start');
      try { await client.connect(); await db.command({ ping: 1 }); break; }
      catch { if (attempt > 50) throw new Error('Disposable mongod not ready'); await delay(100); }
    }
    const categories = Array.from({ length: 50 }, (_, i) => ({ _id: new ObjectId(), name: `Synthetic category ${i}` }));
    await db.collection('categories').insertMany(categories);
    const products = Array.from({ length: 50000 }, (_, i) => ({ _id: new ObjectId(), product_id: `PERF${i}`, name: `Synthetic care ${i}`, category: categories[i % 50]!._id, price: 25, stock: 4, featured: i % 1000 === 0, sale: i % 10 === 0 }));
    await db.collection('products').insertMany(products);
    const repo = createCatalogRepository(async () => db);
    for (const indexed of [false, true]) {
      if (indexed) await applyIndexes(db); // Only our new synthetic database, never production.
      for (const [name, filters] of [['featured', { featured: true }], ['category', { categoryId: categories[0]!._id.toHexString() }]] as const) {
        await repo.products({ limit: 30, ...filters });
        const samples = [];
        for (let run = 0; run < 20; run++) {
          const start = performance.now();
          const page = await repo.products({ limit: 30, ...filters });
          assert.equal(page.items.length, 30);
          samples.push(performance.now() - start);
        }
        const match = name === 'featured' ? { featured: true, disabled: { $ne: true } } : { category: categories[0]!._id, disabled: { $ne: true } };
        const explain = await db.collection('products').find(match).sort({ _id: -1 }).limit(31).explain('executionStats');
        rows.push({ query: name, indexed, samplesMs: samples, keysExamined: explain.executionStats.totalKeysExamined, docsExamined: explain.executionStats.totalDocsExamined });
      }
    }
    for (const cursor of [false, true]) {
      const samples = [];
      const filter = cursor ? { _id: { $lt: products[5000]!._id } } : {};
      for (let run = 0; run < 20; run++) {
        const start = performance.now();
        await db.collection('products').find(filter).sort({ _id: -1 }).skip(cursor ? 0 : 45000).limit(30).toArray();
        samples.push(performance.now() - start);
      }
      const explain = await db.collection('products').find(filter).sort({ _id: -1 }).skip(cursor ? 0 : 45000).limit(30).explain('executionStats');
      rows.push({ query: cursor ? 'deep-cursor' : 'deep-offset', indexed: true, samplesMs: samples, keysExamined: explain.executionStats.totalKeysExamined, docsExamined: explain.executionStats.totalDocsExamined });
    }
    await writeFile(output, JSON.stringify({ capturedAt: new Date().toISOString(), dataset: '50000 synthetic products, 50 categories; warm local standalone MongoDB; 20 sequential samples; repository latency includes Mongo round trip, public visibility join and DTO normalization; explain counts are the matching/sorting scan only', rows }, null, 2) + '\n');
    console.log('Disposable database measurements saved; no application database contacted.');
  } finally {
    await client.close(); child.kill('SIGTERM');
    if (child.exitCode === null && !startupError) await new Promise(resolve => child.once('exit', resolve));
    await rm(directory, { recursive: true, force: true });
  }

}
main().catch(error => { console.error(error instanceof Error ? error.message : "Database measurement failed"); process.exitCode = 1; });
