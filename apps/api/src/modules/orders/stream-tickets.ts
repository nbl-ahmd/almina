import { createHash, randomBytes } from 'node:crypto';
import type { Collection, Db, Document } from 'mongodb';

/** One-time, short-lived tickets that let a signed-in staff browser open the live order stream directly on the API.
 *
 *  The staff session cookie belongs to the web origin and is never sent to the API origin, so the web gateway (which does
 *  hold the session) asks the API for a ticket and hands it to the page. The ticket is random, stored only as a SHA-256
 *  hash, valid for seconds and consumable once. It proves "this user was allowed to follow orders a moment ago"; the stream
 *  itself carries no order data and is closed after a fixed lifetime, so access is re-checked by minting a new ticket. */
export const TICKET_TTL_MS = 30000;
export const STREAM_MAX_LIFETIME_MS = 5 * 60000;
const COLLECTION = 'stream_tickets';
type TicketDocument = Document & { _id: string; userId: string; expiresAt: Date };

let indexed: WeakSet<Db> = new WeakSet();
async function collectionFor(db: Db): Promise<Collection<TicketDocument>> {
  const tickets = db.collection<TicketDocument>(COLLECTION);
  if (!indexed.has(db)) {
    // Expired tickets are removed by the database; consumption never depends on the cleanup having run.
    await tickets.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'stream_ticket_expiry' });
    indexed.add(db);
  }
  return tickets;
}
export function resetTicketIndexCache() { indexed = new WeakSet(); }
const digest = (ticket: string) => createHash('sha256').update(ticket).digest('hex');
export const ticketShape = /^[A-Za-z0-9_-]{43}$/;

export async function issueStreamTicket(db: Db, userId: string, now = new Date()): Promise<{ ticket: string; expiresInSeconds: number }> {
  const ticket = randomBytes(32).toString('base64url');
  const tickets = await collectionFor(db);
  await tickets.insertOne({ _id: digest(ticket), userId, expiresAt: new Date(now.getTime() + TICKET_TTL_MS) }, { writeConcern: { w: 1 } });
  return { ticket, expiresInSeconds: TICKET_TTL_MS / 1000 };
}

/** Returns the user the ticket was issued to, or undefined when it is unknown, expired or already used. */
export async function consumeStreamTicket(db: Db, ticket: unknown, now = new Date()): Promise<string | undefined> {
  if (typeof ticket !== 'string' || !ticketShape.test(ticket)) return undefined;
  const tickets = await collectionFor(db);
  const found = await tickets.findOneAndDelete({ _id: digest(ticket), expiresAt: { $gt: now } });
  return found?.userId;
}
