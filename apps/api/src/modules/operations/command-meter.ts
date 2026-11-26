import { BSON, type Db, type MongoClient } from 'mongodb';
import { backgroundTraffic, trafficContext } from './traffic-context.js';

/** Says which database commands move the most data, and which routes cause them, so heavy queries and bursts can be traced.
 *
 *  Sizes come from the driver's own command events (no extra traffic) and are measured before wire compression, so they rank
 *  commands rather than match the network bill. Only command names, collection names, counts and byte totals are kept: never a
 *  filter, a document or any other value. */
export type CommandTraffic = { command: string; collection: string; count: number; sentMB: number; receivedMB: number };
export type RouteTraffic = { route: string; count: number; sentMB: number; receivedMB: number };
type Totals = { count: number; sent: number; received: number };
type Row = Totals & { command: string; collection: string };

export function createCommandMeter(limit = 8) {
  let rows = new Map<string, Row>(), routes = new Map<string, Totals>();
  const pending = new Map<number, { key: string; route: string }>();
  const size = (value: unknown) => {
    try { return value && typeof value === 'object' ? BSON.calculateObjectSize(value as BSON.Document) : 0; } catch { return 0; }
  };
  const rowFor = (key: string) => {
    let row = rows.get(key);
    if (!row) { const [command, collection] = key.split(' ') as [string, string]; row = { command, collection, count: 0, sent: 0, received: 0 }; rows.set(key, row); }
    return row;
  };
  const routeFor = (route: string) => {
    let row = routes.get(route);
    if (!row) { row = { count: 0, sent: 0, received: 0 }; routes.set(route, row); }
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
        const sent = size(command), route = trafficContext.getStore() ?? backgroundTraffic;
        const row = rowFor(key); row.count++; row.sent += sent;
        const caller = routeFor(route); caller.count++; caller.sent += sent;
        pending.set(event.requestId as number, { key, route });
      });
      listen('commandSucceeded', event => {
        const started = pending.get(event.requestId as number);
        if (!started) return;
        pending.delete(event.requestId as number);
        const received = size(event.reply);
        rowFor(started.key).received += received; routeFor(started.route).received += received;
      });
      listen('commandFailed', event => { pending.delete(event.requestId as number); });
    },
    /** The busiest commands and routes since the last call, then starts counting again. */
    drain(): { db: CommandTraffic[]; routes: RouteTraffic[] } {
      const commands = [...rows.values()], callers = [...routes.entries()]; rows = new Map(); routes = new Map();
      const mb = (value: number) => Math.round(value / 1048576 * 100) / 100;
      const busiest = <T extends Totals>(list: T[]) => list.sort((a, b) => b.sent + b.received - (a.sent + a.received)).slice(0, limit);
      return {
        db: busiest(commands).map(row => ({ command: row.command, collection: row.collection, count: row.count, sentMB: mb(row.sent), receivedMB: mb(row.received) })),
        routes: busiest(callers.map(([route, totals]) => ({ route, ...totals }))).map(row => ({ route: row.route, count: row.count, sentMB: mb(row.sent), receivedMB: mb(row.received) })),
      };
    },
  };
}
export type CommandMeter = ReturnType<typeof createCommandMeter>;

const algorithms = (value: unknown) => Array.isArray(value) ? value.filter((name): name is string => typeof name === 'string' && /^[a-z]{1,20}$/.test(name)) : [];
/** Why database traffic is or is not compressed. Asking is not enough: the driver sends plain traffic, without any error,
 *  when the server does not agree. `requested` is what this client asks for, `agreed` what this connection uses, and
 *  `offered` which of the standard algorithms the server answers with when asked about all of them. */
export async function databaseCompression(db: Db, requested: unknown) {
  const agreed = algorithms((await db.admin().command({ hello: 1 })).compression);
  const offered = algorithms((await db.admin().command({ hello: 1, compression: ['zstd', 'snappy', 'zlib'] })).compression);
  return { requested: algorithms(requested), agreed, offered };
}
