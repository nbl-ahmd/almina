import {verifiedSearchAttribution} from '../search/analytics.js';
import {readSearchEnvironment} from '../search/config.js';
import { visibleToRetail, wholesaleBusinessFields } from '@almina/contracts';
import { prepareWholesaleProducts, wholesaleIdentity } from '../wholesale/repository.js';
type WholesaleCustomer={id:string;email:string};
import { voucherAllocation,consumeVoucher,reverseOrderRewards } from '../growth/rewards.js';
import { assertServiceable } from '../growth/branches.js';
import { familyProfile, familyFieldNames, variantLabel } from '@almina/contracts';
import { createHash } from 'node:crypto';
import { ObjectId, type Db, type Document, type ClientSession } from 'mongodb';
import { checkoutInputSchema, quoteInputSchema, commercePolicySchema, statusInputSchema, type CheckoutInput,
  type QuoteInput, type CommercePolicy, type Quote, type OrderStatus, type Staff, quoteDtoSchema } from '@almina/contracts';
import { HttpError } from '../../errors.js';
import { historicalStatus } from './status.js';
export { historicalStatus } from './status.js';
import { orderFilter } from './repository.js';

const options = { maxTimeMS: 3000 };
export function quoteHash(quote: Quote) {
  return createHash('sha256').update(JSON.stringify(quoteDtoSchema.parse(quote))).digest('hex');
}
const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'], confirmed: ['packed', 'cancelled'], packed: ['dispatched', 'cancelled'],
  dispatched: ['refunded'], cancelled: [], refunded: [],
};
export function moneyMinor(value: unknown): number {
  // Decimal conversion of legacy Number prices: reject fractions of a fils rather than silently rounding.
  const valueText = String(value);
  if ((typeof value !== 'number' && typeof value !== 'string') || !/^\d+(\.\d{1,2})?$/.test(valueText)) {
    throw new HttpError(503, 'COMMERCE_UNAVAILABLE');
  }
  const [whole, fraction = ''] = valueText.split('.');
  const minor = BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, '0'));
  return safe(minor);
}
function safe(value: bigint): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) throw new HttpError(503, 'COMMERCE_UNAVAILABLE');
  return Number(value);
}
function roundedRatio(value: bigint, numerator: number, denominator: number): bigint {
  return (value * BigInt(numerator) + BigInt(Math.floor(denominator / 2))) / BigInt(denominator);
}
export function normalizeItems(input: QuoteInput['items']): QuoteInput['items'] {
  const quantities = new Map<string, number>();
  for (const item of input) {
    const quantity = (quantities.get(item.productId) ?? 0) + item.quantity;
    if (quantity > 1000) throw new HttpError(400, 'INVALID_REQUEST');
    quantities.set(item.productId, quantity);
  }
  return [...quantities].sort(([a], [b]) => a.localeCompare(b)).map(([productId, quantity]) => ({ productId, quantity }));
}
export function calculateQuote(input: QuoteInput, products: Document[], policy: CommercePolicy, voucher?:{code:string;allocation:Map<string,number>}): Quote {
  const fee = policy.delivery.find(rule => rule.emirate === input.customer.emirate);
  if (!fee) throw new HttpError(400, 'INVALID_REQUEST');
  const byId = new Map(products.map(product => [String(product._id), product]));
  const lines = normalizeItems(input.items).map(item => {
    const product = byId.get(item.productId);
    if (!product || product.disabled === true || product.active === false || product.published === false || product.archivedAt !== undefined) {
      throw new HttpError(409, 'PRODUCT_UNAVAILABLE');
    }
    if (!Number.isSafeInteger(product.stock) || product.stock < item.quantity) throw new HttpError(409, 'INSUFFICIENT_STOCK');
    if (['disabled', 'active', 'published'].some(field => product[field] !== undefined && typeof product[field] !== 'boolean')) {
      throw new HttpError(503, 'COMMERCE_UNAVAILABLE');
    }
    if (typeof product.name !== 'string' || !product.name || typeof product.product_id !== 'string' || !product.product_id
      || (product.vat !== undefined && typeof product.vat !== 'boolean')
      || (product.sale !== undefined && typeof product.sale !== 'boolean')) throw new HttpError(503, 'COMMERCE_UNAVAILABLE');
    const unitPriceMinor = moneyMinor(product.price);
    const salePriceMinor = product.sale === true ? moneyMinor(product.salePrice) : null;
    if (salePriceMinor !== null && salePriceMinor > unitPriceMinor) throw new HttpError(503, 'COMMERCE_UNAVAILABLE');
    const voucherDiscountMinor=voucher?.allocation.get(item.productId)??0;
    const original = BigInt(salePriceMinor ?? unitPriceMinor) * BigInt(item.quantity);
    if(!Number.isSafeInteger(voucherDiscountMinor)||voucherDiscountMinor<0||BigInt(voucherDiscountMinor)>original)throw new HttpError(503,'COMMERCE_UNAVAILABLE');
    const charged = original-BigInt(voucherDiscountMinor);
    const taxRateBps = product.vat === true ? policy.vatRateBps : 0;
    // Round VAT once per line, half up; inclusive tax is embedded and never added again.
    const tax = roundedRatio(charged, taxRateBps, policy.vatMode === 'inclusive' ? 10000 + taxRateBps : 10000);
    const family = familyProfile(product);
    return { ...item, ...(family?{familyKey:family.familyKey!,variantLabel:variantLabel(family)}:{}), sku: product.product_id, barcode: typeof product.barcode === 'string' ? product.barcode : null,
      name: product.name, unitPriceMinor, salePriceMinor, ...(voucher?{voucherDiscountMinor}:{}), taxRateBps, taxMinor: safe(tax),
      discountMinor: safe(BigInt(unitPriceMinor) * BigInt(item.quantity) - charged),
      lineTotalMinor: safe(charged + (policy.vatMode === 'exclusive' ? tax : 0n)) };
  });
  const sum = (field: 'taxMinor' | 'discountMinor' | 'lineTotalMinor') => safe(lines.reduce((total, line) => total + BigInt(line[field]), 0n));
  const taxMinor = sum('taxMinor');
  const subtotalMinor = safe(lines.reduce((total, line) => total + BigInt(line.salePriceMinor ?? line.unitPriceMinor) * BigInt(line.quantity), 0n));
  if (subtotalMinor < policy.minimumOrderMinor) throw new HttpError(422, 'MINIMUM_ORDER');
  const deliveryFeeMinor = fee.freeAboveMinor !== undefined && subtotalMinor >= fee.freeAboveMinor ? 0 : fee.feeMinor;
  return { ...(voucher?{voucher:{code:voucher.code,discountMinor:lines.reduce((sum,line)=>sum+(line.voucherDiscountMinor??0),0)}}:{}), currency: 'AED', policyVersion: policy.version, vatMode: policy.vatMode, lines, subtotalMinor,
    discountMinor: sum('discountMinor'), taxMinor, deliveryFeeMinor, minimumOrderMinor: policy.minimumOrderMinor,
    totalMinor: safe(BigInt(sum('lineTotalMinor')) + BigInt(deliveryFeeMinor)) };
}
function parse<T>(schema: { safeParse: (input: unknown) => { success: true; data: T } | { success: false } }, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new HttpError(400, 'INVALID_REQUEST');
  return result.data;
}
async function policyFrom(db: Db, session?: ClientSession): Promise<CommercePolicy> {
  const doc = await db.collection<Document & { _id: string }>('commerce_policies').findOne({ _id: 'checkout' }, { ...options, ...(session ? { session } : {}) });
  if (!doc) throw new HttpError(503, 'COMMERCE_UNAVAILABLE');
  const { _id, ...policy } = doc; void _id;
  const parsed = commercePolicySchema.safeParse(policy);
  if (!parsed.success) throw new HttpError(503, 'COMMERCE_UNAVAILABLE');
  return parsed.data;
}
async function quoteFrom(db: Db, input: QuoteInput, session?: ClientSession, customerId?:string, wholesale?:WholesaleCustomer) {
  const queryOptions = { ...options, ...(session ? { session } : {}) };
  const store = await db.collection('stores').findOne({}, queryOptions);
  if (store?.status !== 'open') throw new HttpError(503, 'COMMERCE_UNAVAILABLE');
  await assertServiceable(db, input.customer);
  let products:Document[] = await db.collection('products').find({ _id: { $in: input.items.map(item => new ObjectId(item.productId)) } },
    { ...queryOptions, projection: { ...Object.fromEntries(familyFieldNames.map(key=>[key,1])), product_id: 1, barcode: 1, name: 1, price: 1, sale: 1, salePrice: 1, vat: 1,
      stock: 1, disabled: 1, active: 1, published: 1, audience: 1, wholesaleAudience: 1, wholesaleTypeIds: 1, category: 1, productType:1, contentReviewed:1, archivedAt:1 } }).toArray();
  const categories = await db.collection('categories').find({ _id: { $in: products.map(product => product.category) }, disabled: { $ne: true } }, queryOptions).toArray();
  const visible = new Set(categories.map(category => String(category._id)));
  if (products.some(product => !visible.has(String(product.category)))) throw new HttpError(409, 'PRODUCT_UNAVAILABLE');
  if(wholesale){if(input.voucherCode||input.customer.email.trim().toLowerCase()!==wholesale.email.toLowerCase())throw new HttpError(403,'FORBIDDEN');products=(await prepareWholesaleProducts(db,wholesale,products,normalizeItems(input.items),session)).products;}
  if (!wholesale && products.some(product => !visibleToRetail(product))) throw new HttpError(409, 'PRODUCT_UNAVAILABLE');
  const policy=await policyFrom(db,session),base=calculateQuote(input,products,policy);
  if(!input.voucherCode)return base;
  const {allocation}=await voucherAllocation(db,input.voucherCode,customerId,products,base.lines,session);
  return calculateQuote(input,products,policy,{code:input.voucherCode,allocation});
}
function checkoutResult(doc: Document, replayed: boolean) {
  // Public response has no PII or idempotency secret, even on a retry.
  return { id: String(doc._id), orderId: doc.orderId as string, status: doc.status as OrderStatus, ...(doc.createdAt instanceof Date ? { createdAt: doc.createdAt.toISOString() } : {}), totals: doc.totals as Quote, replayed };
}
function requestHash(input: CheckoutInput,customerId?:string,wholesale?:WholesaleCustomer) {
  return createHash('sha256').update(JSON.stringify({ customer: input.customer, items: normalizeItems(input.items), ...(wholesale?{channel:'wholesale',owner:wholesale.id}:{}), ...(input.voucherCode?{voucherCode:input.voucherCode,customerId}:{} ) })).digest('hex');
}
export function createCommerceService(getDb: () => Promise<Db>, paymentGuard?:{beforeTransition:(id:string,input:{status:OrderStatus},staff:Staff)=>Promise<void>}) {
  return {
    async quote(raw: unknown,customerId?:string,wholesale?:WholesaleCustomer) {
      const input = parse(quoteInputSchema, raw);
      return quoteFrom(await getDb(), input,undefined,customerId,wholesale);
    },
    async checkout(raw: unknown,customerId?:string,wholesale?:WholesaleCustomer, stripeReservation?: {sessionId:string; attemptId:string; expiresAt:Date; testMode?:boolean}) {
      const input = parse(checkoutInputSchema, raw);
      if (input.customer.payment === 'stripe' && (!stripeReservation || wholesale || input.voucherCode)) throw new HttpError(400, 'INVALID_REQUEST');
      if (input.customer.payment !== 'stripe' && stripeReservation) throw new HttpError(400, 'INVALID_REQUEST');
      input.items = normalizeItems(input.items);
      const fingerprint = requestHash(input,customerId,wholesale);
      const key = createHash('sha256').update(input.idempotencyKey).digest('hex');
      const db = await getDb();
      const session = db.client.startSession();
      async function prior(session?: ClientSession) {
        const receipt = await db.collection<Document & { _id: string }>('checkout_requests').findOne({ _id: key }, { ...options, ...(session ? { session } : {}) });
        if (!receipt) return null;
        if (receipt.fingerprint !== fingerprint) throw new HttpError(409, 'IDEMPOTENCY_CONFLICT');
        const order = await db.collection('orders').findOne({ _id: receipt.orderId }, { ...options, ...(session ? { session } : {}) });
        if (!order) throw new HttpError(503, 'COMMERCE_UNAVAILABLE');
        return checkoutResult(order, true);
      }
      let outcome: ReturnType<typeof checkoutResult> | undefined;
      try {
        // Driver 5 (legacy) returns commit metadata; driver 7 returns the callback value. Capture only after commit.
        await session.withTransaction(async () => {
          outcome = undefined;
          const wholesaleAccess=wholesale?await wholesaleIdentity(db,wholesale.id,wholesale.email,session):null;
          const previous = await prior(session);
          if (previous) { outcome = previous; return; }
          if (stripeReservation && stripeReservation.expiresAt.getTime() <= Date.now()) throw new HttpError(409, 'INVALID_TRANSITION');
          const totals = await quoteFrom(db, input, session,customerId,wholesale);
          if (input.acceptedQuoteHash && input.acceptedQuoteHash !== quoteHash(totals)) {
            throw new HttpError(409, 'PRICE_CHANGED');
          }
          const _id = new ObjectId();
          const now = new Date();
          if(input.voucherCode)await consumeVoucher(db,session,input.voucherCode,customerId!,_id);
          // Claim key before stock changes. _id has a built-in unique index; receipt and order commit together.
          await db.collection<Document & { _id: string }>('checkout_requests').insertOne({ _id: key, fingerprint, orderId: _id, createdAt: now }, { session });
          for (const item of input.items) {
            const result = await db.collection('products').updateOne({ _id: new ObjectId(item.productId), stock: { $gte: item.quantity },
              disabled: { $ne: true }, active: { $ne: false }, published: { $ne: false }, archivedAt:{$exists:false} },
            { $inc: { stock: -item.quantity } }, { ...options, session });
            if (result.modifiedCount !== 1) throw new HttpError(409, 'INSUFFICIENT_STOCK');
          }
          const counter = db.collection<Document & { _id: string }>('commerce_counters');
          const allocated = await counter.updateOne({ _id: 'orders', ready: true, value: { $lt: Number.MAX_SAFE_INTEGER } },
            { $inc: { value: 1 } }, { ...options, session });
          if (allocated.modifiedCount !== 1) throw new HttpError(503, 'COMMERCE_UNAVAILABLE');
          const sequence = await counter.findOne({ _id: 'orders' }, { ...options, session });
          if (!Number.isSafeInteger(sequence?.value)) throw new HttpError(503, 'COMMERCE_UNAVAILABLE');
          const orderId = `OD${sequence!.value}`;
          if (await db.collection('orders').findOne({ orderId }, { ...options, session, projection: { _id: 1 } })) {
            throw new HttpError(503, 'COMMERCE_UNAVAILABLE'); // Never advance past an unreviewed counter collision.
          }
          const order = { _id, ...(stripeReservation ? {payment: {provider:'stripe', testMode:stripeReservation.testMode??true, state:'awaiting_payment', ...stripeReservation}} : {}), ...(wholesaleAccess?{channel:'wholesale',wholesale:{...Object.fromEntries(Object.keys(wholesaleBusinessFields).filter(key=>wholesaleAccess.account[key]!==undefined).map(key=>[key,wholesaleAccess.account[key]])),accountId:wholesaleAccess.account._id,typeId:wholesaleAccess.type._id,businessName:wholesaleAccess.account.businessName,accountRevision:wholesaleAccess.account.revision}}:{}), customerEmailKey:input.customer.email.trim().toLowerCase(), ...(customerId?{customerId}:{}), schemaVersion: 2, orderId, status: 'pending', statusHistory: [{ status: 'pending', at: now }],
            createdAt: now, lines: totals.lines, totals, inventory: { deducted: true, restored: false },
            cancellationRestocks: (await policyFrom(db, session)).cancellationRestocks,
            // Compatibility values are derived only here, never from the browser.
            dispatched: false, canceled: false,
            customer: { ...input.customer, totalprice: (totals.subtotalMinor + totals.discountMinor - (totals.voucher?.discountMinor??0)) / 100 + '',
              totalSalePrice: totals.subtotalMinor / 100, totalVat: totals.taxMinor / 100,
              deliveryFee: totals.deliveryFeeMinor / 100, totalAmount: totals.totalMinor / 100 },
            cartItems: input.items.map(item => ({ _id: new ObjectId(item.productId), quantity: item.quantity })) };
          await db.collection('orders').insertOne(order, { session });
          // Anonymous attribution participates in the same commit; no query/customer/order identity is copied into analytics.
          // It cannot alter the commerce fingerprint, price, stock, totals or replay behavior.
          if(!stripeReservation&&!wholesale&&input.searchAttribution?.length&&readSearchEnvironment(process.env).SEARCH_ANALYTICS_ENABLED){
            const attribution=await verifiedSearchAttribution(db,input.searchAttribution,input.items.map(item=>item.productId),session);
            for(const row of attribution){const line=totals.lines.find(item=>item.productId===row.productId)!;
              const receipt=createHash('sha256').update(`${_id}:${row.searchId}:${row.productId}`).digest('hex');
              await db.collection<Document&{_id:string}>('search_events').insertOne({_id:receipt,event:'search_purchase',searchId:row.searchId,productId:row.productId,position:row.position,revenueMinor:line.lineTotalMinor,createdAt:now,expiresAt:new Date(now.getTime()+30*86400000)}, {session});
              await db.collection<Document&{_id:string}>('search_sessions').updateOne({_id:row.searchId},{$addToSet:{events:'search_purchase'},$inc:{revenueMinor:line.lineTotalMinor}},{session});
            }
          }

          if (!stripeReservation) await db.collection<Document & { _id: string }>('order_outbox').insertOne({ _id: `confirmation:${_id}`, orderId: _id, type: 'confirmation',
            state: 'pending', attempts: 0, createdAt: now }, { session });
          outcome = checkoutResult(order, false);
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, readPreference: 'primary', maxCommitTimeMS: 5000 });
        if (!outcome) throw new HttpError(503, 'COMMERCE_UNAVAILABLE');
        return outcome;
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
          if(wholesale)await wholesaleIdentity(db,wholesale.id,wholesale.email);
          const previous = await prior();
          if (previous) return previous;
        }
        throw error;
      } finally { await session.endSession(); }
    },
    async transition(id: string, raw: unknown, staff: Staff, legacyDispatch = false) {
      if (!/^[a-f0-9]{24}$/i.test(id)) throw new HttpError(400, 'INVALID_REQUEST');
      const input = parse(statusInputSchema, raw);
      if(input.status!=='dispatched'&&(input.billno!==undefined||input.billamount!==undefined))throw new HttpError(400,'INVALID_REQUEST');
      if (input.status === 'refunded' && staff.role !== 'admin') throw new HttpError(403, 'FORBIDDEN');
      await paymentGuard?.beforeTransition(id,input,staff);
      const db = await getDb();
      const session = db.client.startSession();
      let outcome: { status: OrderStatus } | undefined;
      try {
        // Driver 5 (legacy) returns commit metadata; driver 7 returns the callback value. Capture only after commit.
        await session.withTransaction(async () => {
          outcome = undefined;
          const order = await db.collection('orders').findOne({ ...orderFilter({ limit: 1 }, staff), _id: new ObjectId(id) }, { ...options, session });
          if (!order) throw new HttpError(404, 'NOT_FOUND');
          const current = historicalStatus(order);
          if(order.payment?.provider==='stripe'){
            if(order.payment.testMode!==false||!paymentGuard)throw new HttpError(409,'INVALID_TRANSITION');
            if(current===input.status){outcome={status:input.status};return;}
            if(['cancelled','refunded'].includes(input.status)){
              if(order.payment.refundRequested&&order.payment.state==='refund_pending'&&current!=='legacy_conflict'){outcome={status:current};return;}
              throw new HttpError(409,'INVALID_TRANSITION');
            }
            if(order.payment.state!=='paid'||order.payment.refundRequested)throw new HttpError(409,'INVALID_TRANSITION');
          }
          if (current === 'legacy_conflict') throw new HttpError(409, 'INVALID_TRANSITION');
          // Replay of a status is a no-op and cannot mutate commercial snapshots or billing.
          if (current === input.status) { outcome = { status: current }; return; }
          const path: OrderStatus[] = legacyDispatch && input.status === 'dispatched' && ['pending', 'confirmed', 'packed'].includes(current)
            ? (['confirmed', 'packed', 'dispatched'] as OrderStatus[]).slice(['pending', 'confirmed', 'packed'].indexOf(current)) : [input.status];
          let from = current;
          for (const next of path) {
            if (!transitions[from].includes(next)) throw new HttpError(409, 'INVALID_TRANSITION');
            from = next;
          }
          const fields: Document = { status: input.status, dispatched: ['dispatched', 'refunded'].includes(input.status), canceled: input.status === 'cancelled' };
          if (input.status === 'dispatched') {
            if (!input.billno || input.billamount === undefined) throw new HttpError(400, 'INVALID_REQUEST');
            const recorded = order.totals?.totalMinor ?? moneyMinor(order.customer?.totalAmount);
            if (moneyMinor(input.billamount) !== recorded) throw new HttpError(400, 'INVALID_REQUEST');
            fields.billno = input.billno; fields.billamount = recorded / 100;
          } else if (input.billno !== undefined || input.billamount !== undefined) throw new HttpError(400, 'INVALID_REQUEST');
          if (input.status === 'cancelled' && order.schemaVersion === 2 && order.cancellationRestocks === true && order.inventory?.deducted === true && order.inventory?.restored !== true) {
            for (const item of order.lines) {
              if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) throw new HttpError(503, 'COMMERCE_UNAVAILABLE');
              const restored = await db.collection('products').updateOne({ _id: new ObjectId(item.productId),
                stock: { $gte: 0, $lte: Number.MAX_SAFE_INTEGER - item.quantity, $mod: [1, 0] } }, { $inc: { stock: item.quantity } }, { ...options, session });
              if (restored.modifiedCount !== 1) throw new HttpError(409, 'INSUFFICIENT_STOCK');
            }
            fields['inventory.restored'] = true;
          }
          if(['cancelled','refunded'].includes(input.status))await reverseOrderRewards(db,session,order);
          fields.statusHistory = [...(Array.isArray(order.statusHistory) ? order.statusHistory : []),
            ...path.map(status => ({ status, at: new Date(), actorId: new ObjectId(staff.id) }))];
          const predicate = order.status !== undefined ? { status: order.status } : { status: { $exists: false }, dispatched: order.dispatched ?? { $exists: false }, canceled: order.canceled ?? { $exists: false } };
          const updated = await db.collection<Document & { statusHistory?: Document[] }>('orders').updateOne({ _id: order._id, ...predicate }, { $set: fields }, { ...options, session });
          if (updated.modifiedCount !== 1) throw new HttpError(409, 'INVALID_TRANSITION');
          outcome = { status: input.status };
        }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, readPreference: 'primary', maxCommitTimeMS: 5000 });
        if (!outcome) throw new HttpError(503, 'COMMERCE_UNAVAILABLE');
        return outcome;
      } finally { await session.endSession(); }
    },
  };
}

export { legacyOrderDto } from './legacy-dto.js';
