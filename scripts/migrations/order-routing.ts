import type { Db } from 'mongodb';
import { resolveDeliveryArea } from '@almina/contracts';
import { readApiEnvironment } from '@almina/config/env';
import { createDatabase } from '../../apps/api/src/database.js';
/** Additive and repeatable. No stock, totals, customer text or existing/manual routing is changed. */
export async function backfillOrderAreas(db: Db) {
  let scanned = 0, matched = 0, review = 0, changed = 0;
  const cursor = db.collection('orders').find({ routing: { $exists: false } }, { projection: { 'customer.city': 1, 'customer.emirate': 1 }, batchSize: 100, maxTimeMS: 60000 });
  for await (const order of cursor) {
    scanned++; const areaId = resolveDeliveryArea(order.customer ?? {});
    if (areaId) matched++; else review++;
    const result = await db.collection('orders').updateOne({ _id: order._id, routing: { $exists: false } }, { $set: { routing: { version: 1, areaId, revision: 0, backfilledAt: new Date() } } }, { maxTimeMS: 3000 });
    changed += result.modifiedCount;
  }
  return { scanned, matched, review, changed };
}
async function main() {
  const args = process.argv.slice(2);
  if (!args.length) { process.stdout.write('Plan: add versioned canonical delivery area metadata only to orders with no routing; preserve original address and commerce fields. Apply API indexes separately.\n'); return; }
  if (args.length !== 1 || args[0] !== '--apply') throw new Error('Invalid arguments');
  const env = readApiEnvironment(process.env);
  if (env.database.mode !== 'enabled') throw new Error('Database disabled');
  const database = createDatabase(env.database);
  try { process.stdout.write(JSON.stringify(await backfillOrderAreas(await database.getDb())) + '\n'); } finally { await database.close(); }
}
if (process.argv[1]?.endsWith('/order-routing.ts')) void main().catch(() => { process.stderr.write('Order routing migration failed; no customer details logged.\n'); process.exitCode = 1; });
