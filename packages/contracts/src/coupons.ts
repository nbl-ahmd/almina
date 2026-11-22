import { z } from 'zod';

export const couponCodeSchema = z.string().max(64).trim().toUpperCase().pipe(
  z.string().min(3).max(32).regex(/^[A-Z0-9][A-Z0-9-]*$/).refine(code => !/^AM-[A-F0-9]{24}$/.test(code)),
);
const amount = z.number().int().min(0).max(100_000_000);
const rules = z.object({
  code: couponCodeSchema,
  enabled: z.boolean(),
  discount: z.discriminatedUnion('type', [
    z.object({ type: z.literal('fixed'), amountMinor: amount.positive() }).strict(),
    z.object({ type: z.literal('percent'), basisPoints: z.number().int().min(100).max(10000), capMinor: amount.positive().nullable() }).strict(),
  ]),
  minimumMinor: amount,
  maximumUses: z.number().int().min(1).max(1_000_000).nullable(),
  startsAt: z.iso.datetime().transform(value => new Date(value).toISOString()).nullable(),
  endsAt: z.iso.datetime().transform(value => new Date(value).toISOString()).nullable(),
}).strict();
export const couponRecordSchema = rules.extend({ revision: z.number().int().positive(), uses: z.number().int().nonnegative() });
export const couponSaveSchema = rules.extend({ revision: z.number().int().nonnegative() }).refine(
  value => !value.startsAt || !value.endsAt || Date.parse(value.startsAt) < Date.parse(value.endsAt),
);
export const couponListQuerySchema = z.object({ after: couponCodeSchema.optional() }).strict();
export const couponListSchema = z.object({ items: z.array(couponRecordSchema), next: couponCodeSchema.nullable() }).strict();
export const appliedCouponSchema = z.object({ code: couponCodeSchema, discountMinor: z.number().int().positive().max(Number.MAX_SAFE_INTEGER) }).strict();
export type CouponRecord = z.infer<typeof couponRecordSchema>;
export type CouponSave = z.infer<typeof couponSaveSchema>;
