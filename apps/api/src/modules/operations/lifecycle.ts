import type { Db } from 'mongodb';
export async function bounded<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([operation, new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('Operation deadline exceeded')), timeoutMs);
  })]); } finally { if (timer) clearTimeout(timer); }
}
export async function retainedReadiness(getDb: () => Promise<Db> | Db, draining: boolean) {
  if (draining) return false;
  try {
    return await bounded((async () => {
      const db = await getDb();
      await db.command({ ping: 1, maxTimeMS: 1000 });
      const hello = await db.command({ hello: 1, maxTimeMS: 1000 });
      return !!(hello.isWritablePrimary && (hello.setName || hello.msg === 'isdbgrid'));
    })(), 2000);
  } catch { return false; }
}
export async function drainRetainedService(resources: { markDraining: () => void; closeHttp: () => Promise<void>;
  stopWorkers: () => Promise<void>; closeDatabase: () => Promise<void>; forceConnections: () => void }, timeoutMs = 25000) {
  resources.markDraining();
  try { await bounded(Promise.all([resources.closeHttp(), resources.stopWorkers()]).then(() => undefined), timeoutMs); }
  catch { resources.forceConnections(); throw new Error('Retained drain deadline exceeded'); }
  // Never close a pool while an active notification still owns a lease.
  await bounded(resources.closeDatabase(), 3000);
}
