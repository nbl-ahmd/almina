import type { Db, Document } from 'mongodb';
import { branchUsernameSchema, branchLoginAvailabilityQuerySchema, branchLoginAvailabilitySchema, type OrderRouting } from '@almina/contracts';
import { administrator } from '../auth/administration.js';
import { readOrderRouting } from '../orders/routing.js';
import { HttpError } from '../../errors.js';

export function retiredStoreLogin(user: Document, policy: OrderRouting) {
  return user.accountType === 'branch' && user.role === 'user' && user.disabled === true
    && !policy.branches.some(branch => branch.id === user.branchId);
}

export function loginCandidates(username: string) {
  const base = username.replace(/-store(?:-\d+)?$/, '').slice(0, 90);
  return [...new Set([username, `${base}-store`, ...Array.from({ length: 19 }, (_, index) => `${base}-store-${index + 2}`)])];
}

/** Advisory only. Creation still rechecks uniqueness in its serialized transaction. */
export async function branchLoginAvailability(db: Db, raw: unknown, actor: string) {
  const input = branchLoginAvailabilityQuerySchema.safeParse(raw);
  if (!input.success) throw new HttpError(400, 'INVALID_REQUEST');
  await administrator(db, actor);
  const policy = await readOrderRouting(db), candidates = loginCandidates(input.data.username);
  const options = { maxTimeMS: 3000 };
  const rows = await db.collection('users').find({ username: { $in: candidates } },
    { ...options, projection: { _id: 1, username: 1, accountType: 1, role: 1, disabled: 1, branchId: 1 } }).limit(64).toArray();
  if (rows.length === 64) throw new HttpError(503, 'SERVICE_UNAVAILABLE');
  const retiredNames = rows.filter(row => retiredStoreLogin(row, policy)).map(row => 'retired-' + String(row._id));
  const tombstones = retiredNames.length ? await db.collection('users').find({ username: { $in: retiredNames } },
    { ...options, projection: { username: 1 } }).limit(64).toArray() : [];
  const usable = (username: string) => {
    const owners = rows.filter(row => row.username === username);
    return owners.length === 0 || (owners.length === 1 && retiredStoreLogin(owners[0]!, policy)
      && !tombstones.some(row => row.username === 'retired-' + String(owners[0]!._id)));
  };
  const available = usable(input.data.username);
  const suggestion = available ? null : candidates.slice(1).find(candidate => branchUsernameSchema.safeParse(candidate).success && usable(candidate)) ?? null;
  return branchLoginAvailabilitySchema.parse({ username: input.data.username, available, suggestion });
}
