import { couponRecordSchema, couponSaveSchema, type CouponRecord, type Quote } from '@almina/contracts';
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

export async function couponAllocation(db: Db, code: string, products: Document[], lines: Quote['lines'], session?: ClientSession) {
  const coupon = await coupons(db).findOne(liveFilter(code), { ...options, ...(session ? { session } : {}) });
  if (!coupon) throw new HttpError(409, 'COUPON_UNAVAILABLE');
  const eligible = new Set(products.filter(product => product.productType === 'general' && product.contentReviewed === true).map(product => String(product._id)));
  const candidates = lines.filter(line => eligible.has(line.productId));
  const gross = (line: Quote['lines'][number]) => BigInt(line.salePriceMinor ?? line.unitPriceMinor) * BigInt(line.quantity);
  const subtotal = candidates.reduce((sum, line) => sum + gross(line), 0n);
  if (subtotal === 0n) throw new HttpError(409, 'COUPON_UNAVAILABLE');
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
