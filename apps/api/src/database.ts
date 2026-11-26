import { MongoClient, type Db } from 'mongodb';
import type { ApiEnvironment } from '@almina/config/env';

type Connection = { connect: () => Promise<Db>; close: () => Promise<void> };
export type DatabaseProbe = { checkReadiness: () => Promise<boolean>; mode: 'disabled' | 'enabled' };
export type GetDb = () => Promise<Db>;
export const queryOptions = { maxTimeMS: 3000, timeoutMS: 5000 };

export function createDatabase(config: ApiEnvironment['database'],
  factory: (uri: string, name: string) => Connection = (uri, name) => {
    const client = new MongoClient(uri, {
      appName: 'almina-api-v1', compressors: ['zlib'], maxPoolSize: 10, minPoolSize: 0, maxIdleTimeMS: 60000, waitQueueTimeoutMS: 3000,
      serverSelectionTimeoutMS: 3000, connectTimeoutMS: 3000, socketTimeoutMS: 5000,
      ...(uri.startsWith('mongodb+srv://') ? { tls: true, tlsAllowInvalidCertificates: false, tlsAllowInvalidHostnames: false } : {}),
    });
    return { connect: async () => { await client.connect(); return client.db(name); }, close: () => client.close() };
  }) {
  let connection: Connection | undefined;
  let pending: Promise<Db> | undefined;
  let closed = false;

  function getDb(): Promise<Db> {
    if (closed) return Promise.reject(new Error('Database is closed'));
    if (config.mode === 'disabled') return Promise.reject(new Error('Database access is disabled'));
    if (!pending) {
      try { connection = factory(config.uri, config.name); }
      catch { return Promise.reject(new Error('Database connection unavailable')); }
      const active = connection;
      pending = active.connect().catch(async () => {
        await active.close().catch(() => undefined);
        pending = undefined;
        connection = undefined;
        throw new Error('Database connection unavailable');
      });
    }
    return pending;
  }

  return {
    mode: config.mode,
    getDb,
    async checkReadiness() {
      if (closed) return false;
      if (config.mode === 'disabled') return true;
      try {
        const db = await getDb();
        await db.command({ ping: 1 }, { timeoutMS: 3000 });
        return true;
      } catch { return false; }
    },
    async close() {
      if (closed) return;
      closed = true;
      await pending?.catch(() => undefined);
      await connection?.close();
      connection = undefined;
      pending = undefined;
    },
  };
}
