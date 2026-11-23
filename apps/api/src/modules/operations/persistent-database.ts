import { MongoClient, type Db, type MongoClientOptions } from 'mongodb';
import { HttpError } from '../../errors.js';
import type { LocalWriteSignal } from '../notifications/wake.js';
import type { retainedRuntimeConfiguration } from './runtime.js';
type Connection = { connect: () => Promise<unknown>; db: () => Db; close: () => Promise<void> };
// Explicit startup owns one pool. Request handlers can neither construct a client nor reopen a closed service.
export function createPersistentDatabase(config: Pick<ReturnType<typeof retainedRuntimeConfiguration>, 'mongoUri' | 'mongoOptions'>,
  factory: (uri: string, options: MongoClientOptions) => Connection = (uri, options) => new MongoClient(uri, options),
  hooks: { localWrites?: LocalWriteSignal } = {}) {
  let client: Connection | undefined, db: Db | undefined, pending: Promise<Db> | undefined, closed = false, closing: Promise<void> | undefined;
  function unavailable() { return new HttpError(503, 'SERVICE_UNAVAILABLE'); }
  async function connect(): Promise<Db> {
    if (closed) throw unavailable();
    if (!pending) {
      try { client = factory(config.mongoUri, { ...config.mongoOptions, appName: 'almina-persistent-api' }); }
      catch { throw unavailable(); }
      const connection = client;
      if (hooks.localWrites && 'on' in connection && typeof connection.on === 'function') hooks.localWrites.attach(connection as unknown as MongoClient);
      pending = Promise.resolve().then(() => {
        if (closed) throw unavailable();
        return connection.connect();
      }).then(async () => {
        if (closed) { await connection.close(); throw unavailable(); }
        // Preserve the connection URI's database (including its driver default); never silently select a new database.
        db = connection.db(); return db;
      }).catch(async () => { db = undefined; await connection.close().catch(() => undefined); throw unavailable(); });
    }
    return pending;
  }
  return { connect, getDb(): Db { if (!db || closed) throw unavailable(); return db; },
    close(): Promise<void> { closed = true; db = undefined; closing ??= client?.close() ?? Promise.resolve(); return closing; } };
}
