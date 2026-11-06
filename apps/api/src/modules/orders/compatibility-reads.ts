import { branchOrderFilter, readOrderRouting, presentRouting, addressReviewScope } from './routing.js';
import { z } from 'zod';
import { ObjectId, type Db, type Document, type Filter } from 'mongodb';
import { orderStatusSchema, type Staff } from '@almina/contracts';
import { HttpError } from '../../errors.js';
import { queryOptions } from '../../database.js';
import { orderFilter } from './repository.js';
import { orderDetailProjection } from './dto.js';
import { legacyOrderDto } from './legacy-dto.js';
const integer = z.string().regex(/^\d{1,5}$/).transform(Number);
const querySchema = z.object({ limit: integer.pipe(z.number().int().min(1).max(100)).optional(), offset: integer.pipe(z.number().int().min(0).max(10000)).optional(),
  status: orderStatusSchema.optional(), review: z.literal('1').optional() }).strict();
export function retainedOrderQuery(raw: unknown) {
  const value = querySchema.safeParse(raw); if (!value.success) throw new HttpError(400, 'INVALID_REQUEST');
  return { limit: value.data.limit ?? 25, offset: value.data.offset ?? 0, status: value.data.status, ...(value.data.review ? { review: true } : {}) };
}
export function retainedOrderFilter(raw: unknown, staff: Staff) {
  const page = retainedOrderQuery(raw), scope = orderFilter({ limit: 1 }, staff);
  const fallback: Filter<Document> = page.status === 'pending' ? { dispatched: { $ne: true }, canceled: { $ne: true } }
    : page.status === 'dispatched' ? { dispatched: true, canceled: { $ne: true } }
    : page.status === 'cancelled' ? { canceled: true, dispatched: { $ne: true } } : { _id: { $in: [] } };
  const filter: Filter<Document> = { ...scope, ...(page.status ? { $or: [{ status: page.status }, { status: { $exists: false }, ...fallback }] } : {}) };
  return { page, filter };
}
async function compatibilityViews(db: Db, orders: Document[]) {
  // Immutable v2 lines never read mutable catalog prices. Legacy values are explicitly a present-day compatibility fallback.
  const ids = new Set<string>();
  for (const order of orders) if (!(order.schemaVersion === 2 && Array.isArray(order.lines)) && Array.isArray(order.cartItems)) for (const item of order.cartItems) {
    if (/^[a-f0-9]{24}$/i.test(String(item?._id))) ids.add(String(item._id));
    if (ids.size > 10000) throw new HttpError(503, 'SERVICE_UNAVAILABLE'); // Fail rather than silently truncate a historical order.
  }
  const products = ids.size ? await db.collection('products').find({ _id: { $in: [...ids].map(id => new ObjectId(id)) } }, { ...queryOptions,
    projection: { _id: 1, product_id: 1, name: 1, barcode: 1, price: 1, sale: 1, salePrice: 1, vat: 1, stock: 1,
      salePercent: 1, saleBadge: 1, saleType: 1, featured: 1, disabled: 1, published: 1,
      image: 1, images: 1, cloudinaryImages: 1, gdriveFileId: 1, gdriveFileIds: 1, category: 1 } }).limit(ids.size).toArray() : [];
  const categoryIds = [...new Set(products.map(product => String(product.category)).filter(id => /^[a-f0-9]{24}$/i.test(id)))];
  const categories = categoryIds.length ? await db.collection('categories').find({ _id: { $in: categoryIds.map(id => new ObjectId(id)) } },
    { ...queryOptions, projection: { _id: 1, name: 1, image: 1, color: 1 } }).limit(categoryIds.length).toArray() : [];
  const categoryById = new Map(categories.map(category => [String(category._id), category]));
  const productById = new Map(products.map(product => [String(product._id), { ...product, category: categoryById.get(String(product.category)) ?? null }]));
  return orders.map(order => legacyOrderDto({ ...order, cartItems: order.schemaVersion === 2 && Array.isArray(order.lines) ? order.cartItems : (Array.isArray(order.cartItems) ? order.cartItems : []).map(item => ({
    _id: productById.get(String(item?._id)) ?? item?._id ?? null, quantity: item?.quantity,
  })) }));
}
export async function retainedOrderList(db: Db, raw: unknown, staff: Staff): Promise<Document[]> {
  const { page, filter } = retainedOrderFilter(raw, staff);
  const { ['customer.city']: _city, ...rest } = filter; void _city;
  const access = await branchOrderFilter(db, staff, orderFilter({ limit: 1 }, staff));
  const scoped = { $and: [access, rest, ...(page.review ? [addressReviewScope()] : [])] };
  const docs = await db.collection('orders').find(scoped, { ...queryOptions, projection: orderDetailProjection })
    .sort({ createdAt: -1, _id: -1 }).skip(page.offset).limit(page.limit).toArray();
  const policy = await readOrderRouting(db);
  return (await compatibilityViews(db, docs)).map(order => ({ ...order, routing: presentRouting(order, policy) }));
}
export async function retainedOrderDetail(db: Db, value: unknown, raw: unknown, staff: Staff): Promise<Document> {
  if (!z.object({}).strict().safeParse(raw).success || !z.string().regex(/^[a-f0-9]{24}$/i).safeParse(value).success) throw new HttpError(400, 'INVALID_REQUEST');
  const doc = await db.collection('orders').findOne({ ...await branchOrderFilter(db, staff, orderFilter({ limit: 1 }, staff)), _id: new ObjectId(String(value)) }, { ...queryOptions, projection: orderDetailProjection });
  if (!doc) throw new HttpError(404, 'NOT_FOUND'); return { ...(await compatibilityViews(db, [doc]))[0]!, routing: presentRouting(doc, await readOrderRouting(db)) };
}
