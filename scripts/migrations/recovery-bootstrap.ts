import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import type { Db, Document } from 'mongodb';
import { readApiEnvironment } from '@almina/config/env';
import { createDatabase } from '../../apps/api/src/database.js';
import { migrateCommerce } from './commerce.js';

const optionsSchema = z.object({
  username: z.string().trim().min(3).max(80).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().trim().min(1).max(200),
  password: z.string().min(12).max(72).refine(value => Buffer.byteLength(value) <= 72),
  orderNumberFloor: z.number().int().min(5000).max(Number.MAX_SAFE_INTEGER - 1),
}).strict();
type RecoveryOptions = z.infer<typeof optionsSchema>;
const markerId = 'empty-database-v1';

// Fresh database only. Never recreate lost customers/orders or invent stock.
export async function bootstrapRecovery(db: Db, raw: RecoveryOptions) {
  const options = optionsSchema.parse(raw);
  const markers = db.collection<Document & { _id: string }>('recovery_bootstrap');
  const prior = await markers.findOne({ _id: markerId });
  function verifyPrior(marker: Document) {
    if (marker.username !== options.username || marker.orderNumberFloor !== options.orderNumberFloor) {
      throw new Error('Bootstrap already applied with different parameters');
    }
    return { created: false, store: 'unchanged' };
  }
  if (prior) return verifyPrior(prior);
  for (const collection of ['users', 'orders', 'products', 'categories', 'stores']) {
    if (await db.collection(collection).findOne({}, { projection: { _id: 1 } })) throw new Error('Fresh empty database required');
  }
  await migrateCommerce(db);
  const password = await hash(options.password, 12);
  const session = db.client.startSession();
  try {
    return await session.withTransaction(async () => {
      const previous = await markers.findOne({ _id: markerId }, { session });
      if (previous) return verifyPrior(previous);
      for (const collection of ['users', 'orders', 'products', 'categories', 'stores']) {
        if (await db.collection(collection).findOne({}, { projection: { _id: 1 }, session })) throw new Error('Fresh empty database required');
      }
      await db.collection('users').insertOne({ username: options.username, name: options.name, role: 'admin', cities: [], password }, { session });
      await db.collection('stores').insertOne({ status: 'closed' }, { session });
      await db.collection<Document & { _id: string }>('commerce_counters').updateOne({ _id: 'orders' },
        { $max: { value: options.orderNumberFloor } }, { session });
      await markers.insertOne({ _id: markerId, username: options.username, orderNumberFloor: options.orderNumberFloor, at: new Date() }, { session });
      return { created: true, store: 'closed' };
    });
  } finally { await session.endSession(); }
}
async function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    process.stdout.write(JSON.stringify({ mode: 'plan', requires: ['empty replica-set database', 'explicit environment', 'paused writers',
      'owner-selected ORDER_NUMBER_FLOOR above lost historical range', 'RECOVERY_ADMIN_USERNAME', 'RECOVERY_ADMIN_NAME', 'private RECOVERY_ADMIN_PASSWORD_FILE'],
      creates: ['one administrator', 'closed store', 'commerce indexes and policy', 'order counter', 'rerun marker'],
      preserves: ['no product/stock guesses', 'no fabricated historical data'], next: 'Import reviewed products while the store remains closed' }) + '\n');
    return;
  }
  if (args.length !== 1 || args[0] !== '--apply' || process.env.RECOVERY_BOOTSTRAP_ALLOWED !== 'true'
    || process.env.COMMERCE_WRITERS_PAUSED !== 'true') throw new Error('Recovery maintenance gate required');
  const config = readApiEnvironment(process.env);
  if (config.database.mode !== 'enabled') throw new Error('Database disabled');
  const file = process.env.RECOVERY_ADMIN_PASSWORD_FILE;
  if (!file) throw new Error('Private password file required');
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  let password: string;
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || (stat.mode & 0o077) !== 0 || stat.size > 74) throw new Error('Password file must be private and bounded');
    password = (await handle.readFile('utf8')).replace(/\r?\n$/, '');
  } finally { await handle.close(); }
  const options = optionsSchema.parse({ username: process.env.RECOVERY_ADMIN_USERNAME, name: process.env.RECOVERY_ADMIN_NAME,
    password, orderNumberFloor: Number(process.env.ORDER_NUMBER_FLOOR) });
  const database = createDatabase(config.database);
  try { process.stdout.write(JSON.stringify({ event: 'recovery_bootstrap', ...await bootstrapRecovery(await database.getDb(), options) }) + '\n'); }
  finally { await database.close(); }
}
if (process.argv[1]?.endsWith('/recovery-bootstrap.ts')) void main().catch(() => {
  process.stderr.write('{"event":"recovery_bootstrap_failed"}\n'); process.exitCode = 1;
});
