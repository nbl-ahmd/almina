import { readApiEnvironment } from '@almina/config/env';
import { createDatabase } from '../../apps/api/src/database.js';
import { applyIndexes, indexPlan } from '../../apps/api/src/database/indexes.js';

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    process.stdout.write(`${JSON.stringify(indexPlan, null, 2)}\n`);
    return; // Default plan never reads a URI or constructs a connection.
  }
  if (args.length !== 1 || args[0] !== '--apply') throw new Error('Invalid arguments');
  const env = readApiEnvironment(process.env);
  if (env.database.mode !== 'enabled') throw new Error('Database disabled');
  const database = createDatabase(env.database);
  try {
    await applyIndexes(await database.getDb());
    process.stdout.write('{"event":"api_indexes_applied"}\n');
  } finally { await database.close(); }
}
void main().catch(() => {
  // Native index errors can include documents, URIs and other sensitive values.
  process.stderr.write('{"event":"api_index_migration_failed"}\n');
  process.exitCode = 1;
});
