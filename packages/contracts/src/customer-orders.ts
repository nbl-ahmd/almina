import { z } from 'zod';
import { orderStatusSchema, stripePaymentStateSchema } from './commerce';

const minor = z.number().int().nonnegative();
// Added detail is best effort: an unexpected stored value drops that detail, never the shopper's whole order list.
const extra = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);
/** One of the signed-in shopper's own orders. Everything added after the first account release is optional, so the storefront
 *  and the API can deploy in either order. */
export const customerOrderDtoSchema = z.object({
  channel: z.literal('wholesale').optional(), orderId: z.string(), status: z.string(), createdAt: z.coerce.date(),
  totals: z.object({
    totalMinor: minor, deliveryFeeMinor: extra(minor), discountMinor: extra(minor),
    lines: z.array(z.object({ productId: z.string(), name: z.string(), quantity: z.number().int(), variantLabel: extra(z.string()), lineTotalMinor: extra(minor) })),
  }),
  timeline: z.array(z.object({ status: orderStatusSchema, at: z.coerce.date() })).optional(),
  paymentMethod: z.enum(['cash', 'card', 'stripe']).optional(),
  paymentState: stripePaymentStateSchema.optional(),
  reviews: z.array(z.object({ productId: z.string(), rating: z.number().int().min(1).max(5), moderation: z.enum(['pending', 'approved', 'rejected']) })).optional(),
});
export type CustomerOrderDto = z.infer<typeof customerOrderDtoSchema>;
