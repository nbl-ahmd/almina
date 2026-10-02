import { z } from 'zod';

const id = z.string().regex(/^[a-fA-F0-9]{24}$/).transform(value => value.toLowerCase());
const shortText = z.string().trim().max(200);
export const orderStatusSchema = z.enum(['pending', 'confirmed', 'packed', 'dispatched', 'cancelled', 'refunded']);
export const customerInputSchema = z.object({
  name: shortText.min(1), mobile: z.string().regex(/^\+?[0-9]{9,15}$/), email: z.email().max(254),
  emirate: shortText.min(1), city: shortText.min(1), address: z.string().trim().min(1).max(1000),
  buildingname: shortText.default(''), flatno: shortText.default(''), note: z.string().max(1000).default(''),
  maplink: z.union([z.literal(''), z.url().max(2048).refine(value => value.startsWith('https://'))]).default(''),
  payment: z.enum(['cash', 'card']),
}).strict();
const items = z.array(z.object({ productId: id, quantity: z.number().int().min(1).max(1000) }).strict()).min(1).max(100);
export const quoteInputSchema = z.object({ customer: customerInputSchema, items }).strict();
export const checkoutInputSchema = quoteInputSchema.extend({ idempotencyKey: z.uuid() }).strict();
export const statusInputSchema = z.object({ status: orderStatusSchema,
  billno: z.string().regex(/^\d{5,30}$/).optional(), billamount: z.number().finite().nonnegative().optional(),
}).strict();
const minor = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const lineSnapshotSchema = z.object({
  productId: id, sku: z.string(), barcode: z.string().nullable(), name: z.string(), quantity: z.number().int().positive(),
  unitPriceMinor: minor, salePriceMinor: minor.nullable(), discountMinor: minor,
  taxRateBps: z.number().int().nonnegative(), taxMinor: minor, lineTotalMinor: minor,
}).strict();
export const quoteDtoSchema = z.object({ currency: z.literal('AED'), policyVersion: z.string(),
  vatMode: z.enum(['inclusive', 'exclusive']), lines: z.array(lineSnapshotSchema),
  subtotalMinor: minor, discountMinor: minor, taxMinor: minor, deliveryFeeMinor: minor,
  minimumOrderMinor: minor, totalMinor: minor,
}).strict();
export const checkoutDtoSchema = z.object({ id, orderId: z.string(), status: orderStatusSchema,
  totals: quoteDtoSchema, replayed: z.boolean() }).strict();
export const commercePolicySchema = z.object({
  active: z.literal(true), version: z.string().min(1).max(100), currency: z.literal('AED'),
  vatMode: z.enum(['inclusive', 'exclusive']), vatRateBps: z.number().int().min(0).max(10000),
  minimumOrderMinor: minor, cancellationRestocks: z.boolean(),
  delivery: z.array(z.object({ emirate: shortText.min(1), feeMinor: minor }).strict()).min(1).max(20),
}).strict();
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;
export type QuoteInput = z.infer<typeof quoteInputSchema>;
export type CommercePolicy = z.infer<typeof commercePolicySchema>;
export type Quote = z.infer<typeof quoteDtoSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
