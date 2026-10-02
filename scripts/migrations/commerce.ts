import type { Db } from 'mongodb';
import { commercePolicySchema } from '@almina/contracts';
import { readApiEnvironment } from '@almina/config/env';
import { createDatabase } from '../../apps/api/src/database.js';
import { applyIndexes } from '../../apps/api/src/database/indexes.js';
import { historicalStatus } from '../../apps/api/src/modules/orders/status.js';

// Approved by owner, 2026-10-03. Prices include VAT; delivery follows the current emirate rule.
export const approvedPolicy = commercePolicySchema.parse({ active: true, version: '2026-10-03-owner-approved-v1',
  currency: 'AED', vatMode: 'inclusive', vatRateBps: 500, minimumOrderMinor: 1000, cancellationRestocks: true,
  delivery: ['Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm al-Quwain', 'Ras al-Khaimah', 'Fujairah', 'Abu Dhabi Emirate', 'Sharjah Emirate', 'Ajman Emirate', 'Fujairah Emirate']
    .map(emirate => ({ emirate, feeMinor: emirate === 'Ras al-Khaimah' ? 0 : 2100 })) });
export async function migrateCommerce(db: Db) {
  // Operator must stop all order/status writers before applying. No stock/totals/items are rewritten.
  const topology = await db.command({ hello: 1 });
  if (!topology.setName && topology.msg !== 'isdbgrid') throw new Error('Transactions require a replica set or mongos');
  await applyIndexes(db);
  let highWater = 5000;
  let scanned = 0;
  let conflicts = 0;
  let unknownNumbers = 0;
  const cursor = db.collection('orders').find({}, { projection: { orderId: 1, status: 1, dispatched: 1, canceled: 1 }, batchSize: 100, maxTimeMS: 60000 });
  for await (const order of cursor) {
    scanned++;
    if (/^OD\d+$/.test(order.orderId)) {
      const value = Number(order.orderId.slice(2));
      if (!Number.isSafeInteger(value)) throw new Error('Unrepresentable order number');
      highWater = Math.max(highWater, value);
    } else unknownNumbers++;
    if (order.status === undefined) {
      const status = historicalStatus(order);
      if (status === 'legacy_conflict') conflicts++;
      await db.collection('orders').updateOne({ _id: order._id, status: { $exists: false },
        dispatched: order.dispatched ?? { $exists: false }, canceled: order.canceled ?? { $exists: false } },
      { $set: { status, commerceMigration: { version: 1, snapshotProvenance: 'unavailable',
        note: 'Original cartItems and customer totals preserved; no live-product snapshot backfill', at: new Date() } } });
    }
  }
  await db.collection<{ _id: string; value: number; ready: boolean }>('commerce_counters').updateOne({ _id: 'orders' },
    { $max: { value: highWater }, $set: { ready: true } }, { upsert: true });
  // Never replace an existing operator policy on a rerun.
  await db.collection<{ _id: string }>('commerce_policies').updateOne({ _id: 'checkout' },
    { $setOnInsert: approvedPolicy }, { upsert: true });
  return { scanned, conflicts, unknownNumbers, highWater };
}
async function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    process.stdout.write(JSON.stringify({ mode: 'plan', policy: approvedPolicy,
      requires: ['writer maintenance window', 'replica set/Atlas', 'backup', 'local integration tests'],
      preserves: ['stock', 'customer totals', 'cartItems', 'all identifiers', 'legacy fields'],
      backfill: 'status only; never invent historical snapshots', counter: 'one-time numeric high-water scan; $max on reruns' }) + '\n');
    return;
  }
  if (args.length !== 1 || args[0] !== '--apply' || process.env.COMMERCE_WRITERS_PAUSED !== 'true') throw new Error('Maintenance gate required');
  const config = readApiEnvironment(process.env);
  if (config.database.mode !== 'enabled') throw new Error('Database disabled');
  const database = createDatabase(config.database);
  try { process.stdout.write(JSON.stringify({ event: 'commerce_migrated', ...await migrateCommerce(await database.getDb()) }) + '\n'); }
  finally { await database.close(); }
}
// Importable for isolated regression tests; CLI default never connects.
if (process.argv[1]?.endsWith('/commerce.ts')) void main().catch(() => {
  process.stderr.write('{"event":"commerce_migration_failed"}\n'); process.exitCode = 1;
});
