import { deliveryPointSchema, zoneDeliverySchema } from './delivery-zones';
import {searchAttributionSchema} from './search';
import { z } from 'zod';
import { couponCodeSchema, appliedCouponSchema } from './coupons';

const id = z.string().regex(/^[a-fA-F0-9]{24}$/).transform(value => value.toLowerCase());
const shortText = z.string().trim().max(200);
export const orderStatusSchema = z.enum(['pending', 'confirmed', 'packed', 'dispatched', 'cancelled', 'refunded']);
export const customerInputSchema = z.object({
  coordinates: deliveryPointSchema.optional(),
  name: shortText.min(1), mobile: z.string().regex(/^\+?[0-9]{9,15}$/), email: z.email().max(254),
  emirate: shortText.min(1), city: shortText.min(1), address: z.string().trim().min(1).max(1000),
  buildingname: shortText.default(''), flatno: shortText.default(''), note: z.string().max(1000).default(''),
  maplink: z.union([z.literal(''), z.url().max(2048).refine(value => value.startsWith('https://'))]).default(''),
  payment: z.enum(['cash', 'card', 'stripe']),
}).strict();
const items = z.array(z.object({ productId: id, quantity: z.number().int().min(1).max(1000) }).strict()).min(1).max(100);
export const couponPreviewInputSchema = z.object({ items, couponCode: couponCodeSchema }).strict();
export const quoteInputSchema = z.object({ customer: customerInputSchema, items, couponCode: couponCodeSchema.optional(), voucherCode:z.string().regex(/^AM-[A-F0-9]{24}$/).optional() }).strict();
// Optional only for retained legacy clients; the Next gateway requires acknowledgment.
export const checkoutInputSchema = quoteInputSchema.extend({ idempotencyKey: z.uuid(), searchAttribution:searchAttributionSchema.optional(), acceptedQuoteHash: z.string().regex(/^[a-f0-9]{64}$/).optional() }).strict();
export const statusInputSchema = z.object({ status: orderStatusSchema,
  billno: z.string().regex(/^\d{5,30}$/).optional(), billamount: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER / 100).refine(value => /^\d+(\.\d{1,2})?$/.test(String(value))).optional(),
}).strict();
const minor = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export const lineSnapshotSchema = z.object({
  familyKey:z.string().max(80).optional(),variantLabel:z.string().max(500).optional(),
  productId: id, sku: z.string(), barcode: z.string().nullable(), name: z.string(), quantity: z.number().int().positive(),
  unitPriceMinor: minor, salePriceMinor: minor.nullable(), discountMinor: minor, voucherDiscountMinor:minor.optional(), couponDiscountMinor:minor.optional(),
  taxRateBps: z.number().int().nonnegative(), taxMinor: minor, lineTotalMinor: minor,
}).strict();
export const quoteDtoSchema = z.object({ delivery: zoneDeliverySchema.optional(), currency: z.literal('AED'), policyVersion: z.string(),
  vatMode: z.enum(['inclusive', 'exclusive']), coupon: appliedCouponSchema.optional(), voucher:z.object({code:z.string().regex(/^AM-[A-F0-9]{24}$/),discountMinor:minor}).strict().optional(), lines: z.array(lineSnapshotSchema),
  subtotalMinor: minor, discountMinor: minor, taxMinor: minor, deliveryFeeMinor: minor,
  minimumOrderMinor: minor, totalMinor: minor,
}).strict();
export const checkoutDtoSchema = z.object({ id, orderId: z.string(), status: orderStatusSchema,
  createdAt: z.iso.datetime().optional(), totals: quoteDtoSchema, replayed: z.boolean() }).strict();
export const commercePolicySchema = z.object({
  active: z.literal(true), version: z.string().min(1).max(100), currency: z.literal('AED'),
  vatMode: z.enum(['inclusive', 'exclusive']), vatRateBps: z.number().int().min(0).max(10000),
  minimumOrderMinor: minor, cancellationRestocks: z.boolean(),
  delivery: z.array(z.object({ emirate: shortText.min(1), feeMinor: minor, freeAboveMinor: minor.optional() }).strict()).min(1).max(20),
}).strict();
export type CheckoutInput = z.infer<typeof checkoutInputSchema>;
export type QuoteInput = z.infer<typeof quoteInputSchema>;
export type CommercePolicy = z.infer<typeof commercePolicySchema>;
export type Quote = z.infer<typeof quoteDtoSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const stripePaymentStateSchema=z.enum(['awaiting_payment','paid','expired','refunded','partially_refunded','refund_pending','disputed']);
export const stripeCheckoutDtoSchema = z.object({
  orderId: z.string(), state: stripePaymentStateSchema,
  checkoutUrl: z.url().refine(value => { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'checkout.stripe.com' && !url.username && !url.password; }).nullable(),
  createdAt: z.iso.datetime().optional(), testMode: z.boolean(), totals:quoteDtoSchema, paymentReceived:z.boolean(),
}).strict();
export const stripeStatusInputSchema = z.object({ idempotencyKey: z.uuid() }).strict();
