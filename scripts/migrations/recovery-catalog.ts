import { readFile, stat } from 'node:fs/promises';
import { readApiEnvironment } from '@almina/config/env';
import { createDatabase } from '../../apps/api/src/database.js';
import { importRecoveryCatalog, parseRecoveryCatalog } from '../../apps/api/src/modules/recovery/catalog.js';
export { importRecoveryCatalog, parseRecoveryCatalog } from '../../apps/api/src/modules/recovery/catalog.js';
async function main() {
  const [file, apply, ...extra] = process.argv.slice(2);
  if (!file || extra.length || apply && apply !== '--apply') throw new Error('Expected reviewed JSON file and optional --apply');
  if ((await stat(file)).size > 4 * 1024 * 1024) throw new Error('Input too large');
  const raw: unknown = JSON.parse(await readFile(file, 'utf8'));
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? '';
  const rows = parseRecoveryCatalog(raw, cloudName);
  if (!apply) {
    process.stdout.write(JSON.stringify({ mode: 'plan', count: rows.length, categories: new Set(rows.map(value => value.category)).size,
      writes: 'disabled, unpublished products with zero stock; no updates or image deletion',
      review: 'Check product identity, image match, price, VAT, barcode and physical stock before publishing' }) + '\n');
    return;
  }
  if (process.env.RECOVERY_CATALOG_ALLOWED !== 'true' || process.env.COMMERCE_WRITERS_PAUSED !== 'true') throw new Error('Recovery maintenance gate required');
  const config = readApiEnvironment(process.env);
  if (config.database.mode !== 'enabled') throw new Error('Database disabled');
  const database = createDatabase(config.database);
  try { process.stdout.write(JSON.stringify({ event: 'recovery_catalog', ...await importRecoveryCatalog(await database.getDb(), raw, cloudName) }) + '\n'); }
  finally { await database.close(); }
}
if (process.argv[1]?.endsWith('/recovery-catalog.ts')) void main().catch(() => {
  process.stderr.write('{"event":"recovery_catalog_failed"}\n'); process.exitCode = 1;
});
