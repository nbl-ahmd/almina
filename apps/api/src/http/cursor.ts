import { createHash } from 'node:crypto';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { HttpError } from '../errors.js';

const cursorSchema = z.object({ v: z.literal(1), scope: z.string().length(64), id: z.string().regex(/^[a-f0-9]{24}$/) }).strict();
export function cursorScope(route: string, query: object, identity = 'public') {
  // The scope binds pagination to validated filters and trusted authorization scope.
  return createHash('sha256').update(JSON.stringify([route, query, identity])).digest('hex');
}
export function decodeCursor(value: string | undefined, scope: string): ObjectId | undefined {
  if (!value) return undefined;
  try {
    const cursor = cursorSchema.parse(JSON.parse(Buffer.from(value, 'base64url').toString('utf8')));
    if (cursor.scope !== scope) throw new Error('scope');
    return new ObjectId(cursor.id);
  } catch { throw new HttpError(400, 'INVALID_REQUEST'); }
}
export function encodeCursor(id: ObjectId, scope: string) {
  return Buffer.from(JSON.stringify({ v: 1, scope, id: id.toHexString() })).toString('base64url');
}
