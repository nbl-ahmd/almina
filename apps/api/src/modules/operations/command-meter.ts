import { BSON, type Db, type MongoClient } from 'mongodb';

/** Says which database commands move the most data, so heavy queries and bursts can be traced to a collection.
 *
 *  Sizes come from the driver's own command events (no extra traffic) and are measured before wire compression, so they rank
 *  commands rather than match the network bill. Only command names, collection names, counts and byte totals are kept: never a
 *  filter, a document or any other value. */
export type CommandTraffic = { command: string; collection: string; count: number; sentMB: number; receivedMB: number };
type Row = { command: string; collection: string; count: number; sent: number; received: number };

export function createCommandMeter(limit = 8) {
  let rows = new Map<string, Row>();
  const pending = new Map<number, string>();
  const size = (value: unknown) => {
    try { return value && typeof value === 'object' ? BSON.calculateObjectSize(value as BSON.Document) : 0; } catch { return 0; }
  };
  const rowFor = (key: string) => {
    let row = rows.get(key);
    if (!row) { const [command, collection] = key.split(' ') as [string, string]; row = { command, collection, count: 0, sent: 0, received: 0 }; rows.set(key, row); }
    return row;
  };
  return {
    attach(client: Pick<MongoClient, 'on'>) {
      const listen = client.on.bind(client) as (event: string, handler: (event: Record<string, unknown>) => void) => void;
      listen('commandStarted', event => {
        const name = String(event.commandName ?? ''), command = event.command as Record<string, unknown> | undefined;
        const target = name === 'getMore' ? command?.collection : command?.[name];
        const collection = typeof target === 'string' && /^[A-Za-z0-9_.-]{1,80}$/.test(target) ? target : '-';
        const key = `${/^[A-Za-z]{1,40}$/.test(name) ? name : 'other'} ${collection}`;
        const row = rowFor(key); row.count++; row.sent += size(command);
        pending.set(event.requestId as number, key);
      });
      listen('commandSucceeded', event => {
        const key = pending.get(event.requestId as number);
        if (key === undefined) return;
        pending.delete(event.requestId as number);
        rowFor(key).received += size(event.reply);
      });
      listen('commandFailed', event => { pending.delete(event.requestId as number); });
    },
    /** The busiest commands since the last call, then starts counting again. */
    drain(): CommandTraffic[] {
      const list = [...rows.values()]; rows = new Map();
      const mb = (value: number) => Math.round(value / 1048576 * 100) / 100;
      return list.sort((a, b) => b.sent + b.received - (a.sent + a.received)).slice(0, limit)
        .map(row => ({ command: row.command, collection: row.collection, count: row.count, sentMB: mb(row.sent), receivedMB: mb(row.received) }));
    },
  };
}
export type CommandMeter = ReturnType<typeof createCommandMeter>;

/** The compression the server agreed to for this connection. Asking for compression is not enough: the driver sends plain
 *  traffic, without any error, when the server does not agree, so the outcome is reported once at startup. */
export async function databaseCompression(db: Db): Promise<string[]> {
  const agreed: unknown = (await db.admin().command({ hello: 1 })).compression;
  return Array.isArray(agreed) ? agreed.filter((name): name is string => typeof name === 'string' && /^[a-z]{1,20}$/.test(name)) : [];
}
