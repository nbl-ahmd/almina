import { z } from 'zod';
import { orderStatusSchema, lineSnapshotSchema, quoteDtoSchema } from './commerce';
import { productBusinessIdSchema } from './identifiers';

const id = z.string().regex(/^[a-fA-F0-9]{24}$/);
const booleanQuery = z.enum(['true', 'false']).transform(value => value === 'true');
export const cursorQuerySchema = z.object({
  limit: z.string().regex(/^\d{1,3}$/).transform(Number).pipe(z.number().int().min(1).max(100)).default(20),
  cursor: z.string().min(1).max(512).regex(/^[A-Za-z0-9_-]+$/).optional(),
}).strict();
export const sitemapQuerySchema = z.object({
  kind: z.enum(['products', 'categories']),
  cursor: cursorQuerySchema.shape.cursor,
}).strict();
export const sitemapPageSchema = z.object({
  items: z.array(z.object({ id, name: z.string().min(1), productId: productBusinessIdSchema.optional() }).strict()).max(1000),
  nextCursor: z.string().max(512).regex(/^[A-Za-z0-9_-]+$/).nullable(),
}).strict();
export const catalogQuerySchema = cursorQuerySchema.extend({
  categoryId: id.optional(), featured: booleanQuery.optional(), sale: booleanQuery.optional(),
  q: z.string().trim().min(2).max(80).regex(/^[\p{L}\p{N}\s]+$/u).optional(),
}).strict();
export const adminProductQuerySchema = catalogQuerySchema.extend({ disabled: booleanQuery.optional() }).strict();
export const orderQuerySchema = cursorQuerySchema.extend({
  dispatched: booleanQuery.optional(), canceled: booleanQuery.optional(), status: orderStatusSchema.optional(),
  city: z.string().trim().min(1).max(100).optional(),
}).strict();
export const resourceParamsSchema = z.object({ id }).strict();
export const businessProductParamsSchema = z.object({ productId: productBusinessIdSchema }).strict();
export const loginBodySchema = z.object({
  username: z.string().min(1).max(100),
  // bcrypt uses at most 72 UTF-8 bytes. Avoid silently accepting equivalent passwords.
  password: z.string().min(1).max(72).refine(value => new TextEncoder().encode(value).length <= 72),
}).strict();

export const productDtoSchema = z.object({
  id, productId: z.string().min(1), categoryId: id, name: z.string(),
  images: z.array(z.string()), cloudinaryImages: z.array(z.string().max(1000)).max(8).default([]), gdriveFileIds: z.array(z.string()),
  price: z.number().finite().nonnegative(), stock: z.number().int().nonnegative(),
  vat: z.boolean(), sale: z.boolean(), featured: z.boolean(), disabled: z.boolean(),
  salePrice: z.number().finite().nonnegative().nullable(),
  salePercent: z.number().finite().nullable(), saleBadge: z.string().nullable(),
  saleType: z.string().nullable(), description: z.string().nullable(),
}).strict();
export const categoryDtoSchema = z.object({
  id, name: z.string(), image: z.string().nullable(), gdriveFileId: z.string().nullable(),
  color: z.string().nullable(), disabled: z.boolean(),
}).strict();
export const bannerDtoSchema = z.object({
  id, name: z.string(), image: z.string(), gdriveFileId: z.string().nullable(), link: z.string(),
}).strict();
export const storeDtoSchema = z.object({ status: z.enum(['open', 'closed']) }).strict();
export const staffDtoSchema = z.object({
  id, username: z.string(), name: z.string(), role: z.enum(['admin', 'user']), cities: z.array(z.string()),
}).strict();
export const loginDtoSchema = z.object({ expiresAt: z.iso.datetime(), user: staffDtoSchema }).strict();
export const orderSummaryDtoSchema = z.object({
  id, orderId: z.string(), createdAt: z.iso.datetime().nullable(),
  status: z.union([orderStatusSchema, z.literal('legacy_conflict')]),
  dispatched: z.boolean(), canceled: z.boolean(), city: z.string().nullable(),
  // Historical values are reported as stored; never recalculate them from live products.
  totalAmount: z.number().finite().nullable(), billno: z.string().nullable(), billamount: z.number().finite().nullable(),
}).strict();
export const orderDetailDtoSchema = orderSummaryDtoSchema.extend({
  customer: z.object({
    name: z.string().nullable(), mobile: z.string().nullable(), email: z.string().nullable(),
    emirate: z.string().nullable(), city: z.string().nullable(), buildingname: z.string().nullable(),
    flatno: z.string().nullable(), note: z.string().nullable(), payment: z.string().nullable(),
    address: z.string().nullable(), maplink: z.string().nullable(), totalprice: z.string().nullable(),
    totalSalePrice: z.number().finite().nullable(), totalVat: z.number().finite().nullable(),
    totalAmount: z.number().finite().nullable(), deliveryFee: z.number().finite().nullable(),
  }).strict(),
  items: z.array(z.object({ productId: id.nullable(), quantity: z.number().finite().nullable() }).strict()),
  snapshotAvailable: z.boolean(),
  lines: z.array(lineSnapshotSchema).nullable(), totals: quoteDtoSchema.nullable(),
}).strict();
export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item).max(100), nextCursor: z.string().nullable() }).strict();
}
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
export type AdminProductQuery = z.infer<typeof adminProductQuerySchema>;
export type OrderQuery = z.infer<typeof orderQuerySchema>;
export type Staff = z.infer<typeof staffDtoSchema>;
