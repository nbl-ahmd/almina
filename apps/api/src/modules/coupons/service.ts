import { couponRecordSchema, couponSaveSchema, couponScopeSchema, publicCouponSchema, type CouponRecord, type Quote } from '@almina/contracts';
import type { ClientSession, Db, Document } from 'mongodb';
import { HttpError } from '../../errors.js';

type StoredCoupon = Omit<CouponRecord, 'code'> & { _id: string; updatedBy: string; updatedAt: Date };
const coupons = (db: Db) => db.collection<StoredCoupon>('checkout_coupons');
const options = { maxTimeMS: 3000 };

function record({ _id, updatedBy: _actor, updatedAt: _time, ...rules }: StoredCoupon) {
  void _actor; void _time;
  return couponRecordSchema.parse({ ...rules, code: _id });
}

export async function listCoupons(db: Db, after?: string) {
  const rows = await coupons(db).find(after ? { _id: { $gt: after } } : {}, options).sort({ _id: 1 }).limit(51).toArray();
  return { items: rows.slice(0, 50).map(record), next: rows.length > 50 ? rows[49]!._id : null };
}

export async function saveCoupon(db: Db, raw: unknown, actor: string) {
  const parsed = couponSaveSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(400, 'INVALID_REQUEST');
  const { code, revision, ...rules } = parsed.data;
  const update = { ...rules, updatedBy: actor, updatedAt: new Date() };
  const collection = coupons(db);
  if (revision === 0) {
    const row = { _id: code, ...update, revision: 1, uses: 0 };
    try { await collection.insertOne(row); }
    catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
      throw error;
    }
    return record(row);
  }
  const saved = await collection.findOneAndUpdate({ _id: code, revision },
    { $set: update, $inc: { revision: 1 } }, { ...options, returnDocument: 'after', includeResultMetadata: false });
  if (!saved) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
  return record(saved);
}

function liveFilter(code: string) {
  const now = new Date().toISOString();
  return {
    _id: code, enabled: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gt: now } }] },
      { $or: [{ maximumUses: null }, { $expr: { $lt: ['$uses', '$maximumUses'] } }] },
    ],
  };
}

/** Product ids a coupon may discount: reviewed general-sale products, narrowed by the coupon's scope.
 *  A stored row without a valid scope (legacy, or hand-edited) is treated as "all". */
export function eligibleProductIds(scopeValue: unknown, products: Document[]) {
  const parsed = couponScopeSchema.safeParse(scopeValue ?? { type: 'all' });
  const scope = parsed.success ? parsed.data : { type: 'all' as const };
  const inScope = (product: Document) => scope.type === 'all' ? true
    : scope.type === 'products' ? scope.productIds.some(id => id.toLowerCase() === String(product._id).toLowerCase())
      : scope.categoryIds.some(id => id.toLowerCase() === String(product.category).toLowerCase());
  return new Set(products.filter(product => product.productType === 'general' && product.contentReviewed === true && inScope(product)).map(product => String(product._id)));
}

export async function couponAllocation(db: Db, code: string, products: Document[], lines: Quote['lines'], session?: ClientSession) {
  const coupon = await coupons(db).findOne(liveFilter(code), { ...options, ...(session ? { session } : {}) });
  if (!coupon) throw new HttpError(409, 'COUPON_UNAVAILABLE');
  const eligible = eligibleProductIds(coupon.scope, products);
  const candidates = lines.filter(line => eligible.has(line.productId));
  const gross = (line: Quote['lines'][number]) => BigInt(line.salePriceMinor ?? line.unitPriceMinor) * BigInt(line.quantity);
  const subtotal = candidates.reduce((sum, line) => sum + gross(line), 0n);
  if (subtotal === 0n) throw new HttpError(409, scopeOf(coupon.scope) === 'all' ? 'COUPON_UNAVAILABLE' : 'COUPON_NOT_APPLICABLE');
  if (subtotal < BigInt(coupon.minimumMinor)) throw new HttpError(422, 'COUPON_MINIMUM');
  const { discount } = coupon;
  let value = discount.type === 'fixed' ? BigInt(discount.amountMinor) : (subtotal * BigInt(discount.basisPoints) + 5000n) / 10000n;
  const cap = discount.type === 'percent' && discount.capMinor !== null ? BigInt(discount.capMinor) : subtotal;
  if (value > cap) value = cap;
  if (value > subtotal) value = subtotal;
  if (value === 0n) throw new HttpError(409, 'COUPON_UNAVAILABLE');
  const allocation = new Map<string, number>();
  // Distribute rounding in stable SKU order. Each share stays within the line price.
  let accumulated = 0n;
  let distributed = 0n;
  for (const line of candidates) {
    accumulated += gross(line);
    const share = (value * accumulated) / subtotal;
    allocation.set(line.productId, Number(share - distributed));
    distributed = share;
  }
  return { allocation, discountMinor: Number(value) };
}

function scopeOf(value: unknown) {
  const parsed = couponScopeSchema.safeParse(value ?? { type: 'all' });
  return parsed.success ? parsed.data.type : 'all';
}

/** Live coupons staff chose to list, newest end date first; at most 20. */
export async function listPublicCoupons(db: Db) {
  const now = new Date().toISOString();
  const rows = await coupons(db).find({
    listed: true, enabled: true,
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gt: now } }] },
      { $or: [{ maximumUses: null }, { $expr: { $lt: ['$uses', '$maximumUses'] } }] },
    ],
  }, options).sort({ endsAt: 1, _id: 1 }).limit(20).toArray();
  return { items: rows.flatMap(row => {
    const parsed = publicCouponSchema.safeParse({ code: row._id, title: row.title ?? '', description: row.description ?? '', discount: row.discount,
      minimumMinor: row.minimumMinor, endsAt: row.endsAt, scope: scopeOf(row.scope) });
    return parsed.success ? [parsed.data] : [];
  }) };
}

export async function consumeCoupon(db: Db, session: ClientSession, code: string) {
  const result = await coupons(db).updateOne(liveFilter(code), { $inc: { uses: 1 } }, { ...options, session });
  if (result.modifiedCount !== 1) throw new HttpError(409, 'COUPON_UNAVAILABLE');
}

export async function releaseCoupon(db: Db, session: ClientSession, order: Document) {
  const code: unknown = order.totals?.coupon?.code;
  if (typeof code === 'string') {
    await coupons(db).updateOne({ _id: code, uses: { $gt: 0 } }, { $inc: { uses: -1 } }, { ...options, session });
  }
}
