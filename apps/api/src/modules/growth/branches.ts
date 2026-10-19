import { ObjectId, type Db, type Document } from 'mongodb';
import { branchDirectorySchema, serviceabilityPolicySchema, isServiceable, type BranchDirectory, type ServiceabilityPolicy } from '@almina/contracts';
import { HttpError } from '../../errors.js';
const query = { maxTimeMS: 3000 };
type Shape = Record<string, unknown>;

function storedKeys(shape: Shape, row: Document | undefined) {
  return Object.fromEntries(Object.keys(shape).flatMap(name => row?.[name] === undefined ? [] : [[name, row[name]]]));
}
function save(db: Db, id: string, value: Record<string, unknown> & { revision: number }, actor: string) {
  return db.collection<Document & { _id: string }>('growth_settings').updateOne({ _id: id, revision: value.revision },
    { $set: { ...value, revision: value.revision + 1, updatedAt: new Date(), updatedBy: actor } }, { upsert: value.revision === 0 });
}
function conflict(error: unknown): never {
  if (error instanceof Error && 'code' in error && error.code === 11000) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
  throw error;
}

/** Verified directory data only reaches the public site; unverified drafts stay admin-only. */
export async function branchDirectory(db: Db, admin = false): Promise<BranchDirectory> {
  const row = await db.collection<Document & { _id: string }>('growth_settings').findOne({ _id: 'branches' }, query);
  const value = branchDirectorySchema.parse(storedKeys(branchDirectorySchema.shape, row ?? undefined));
  return admin || value.verified ? value : branchDirectorySchema.parse({});
}
export async function saveBranchDirectory(db: Db, raw: unknown, actor: string): Promise<BranchDirectory> {
  if (!ObjectId.isValid(actor)) throw new HttpError(400, 'INVALID_REQUEST');
  const parsed = branchDirectorySchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
  const value = parsed.data;
  // Staff cannot publish a directory that contains a branch they have not individually verified.
  if (value.verified && (!value.items.length || value.items.some(item => !item.verified || !item.name || !item.phone))) throw new HttpError(400, 'INVALID_REQUEST');
  try {
    const result = await save(db, 'branches', value, actor);
    if (!result.matchedCount && !result.upsertedCount) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
  } catch (error) { conflict(error); }
  return { ...value, revision: value.revision + 1 };
}

export async function readServiceability(db: Db): Promise<ServiceabilityPolicy> {
  const row = await db.collection<Document & { _id: string }>('growth_settings').findOne({ _id: 'serviceability' }, query);
  return serviceabilityPolicySchema.parse(storedKeys(serviceabilityPolicySchema.shape, row ?? undefined));
}
export async function saveServiceability(db: Db, raw: unknown, actor: string): Promise<ServiceabilityPolicy> {
  if (!ObjectId.isValid(actor)) throw new HttpError(400, 'INVALID_REQUEST');
  const parsed = serviceabilityPolicySchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
  const value = parsed.data;
  // An active rule must describe a real, explainable coverage area before the server will enforce it.
  if (value.active && (!value.emirates.length || value.notes.trim().length < 20)) throw new HttpError(400, 'INVALID_REQUEST');
  try {
    const result = await save(db, 'serviceability', value, actor);
    if (!result.matchedCount && !result.upsertedCount) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
  } catch (error) { conflict(error); }
  return { ...value, revision: value.revision + 1 };
}

/** The API, not the browser, decides whether an address can be served. Inactive policy means unchanged behaviour. */
export async function assertServiceable(db: Db, customer: { emirate: string; city: string }) {
  if (!isServiceable(customer, await readServiceability(db))) throw new HttpError(422, 'ADDRESS_NOT_SERVICEABLE');
}
