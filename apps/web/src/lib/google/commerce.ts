import { z } from 'zod';

export const reviewReceiptSchema = z.object({
  orderId: z.string().min(1).max(100), email: z.email(),
  createdAt: z.iso.datetime(), deliveryCountry: z.literal('AE'),
}).strict();
export type ReviewReceipt = z.infer<typeof reviewReceiptSchema>;
export type GoogleCommerceConfiguration = { merchantId: number; deliveryBusinessDays: number; survey: boolean; widget: boolean };

/** Public configuration only. Live Google calls require an explicit eligibility gate. */
export function googleCommerceConfiguration(env: Readonly<Record<string, string | undefined>>): GoogleCommerceConfiguration {
  const merchantId = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER).parse(env.GOOGLE_MERCHANT_ACCOUNT_ID ?? '5884188879');
  const deliveryBusinessDays = z.coerce.number().int().min(1).max(30).parse(env.GOOGLE_REVIEWS_DELIVERY_BUSINESS_DAYS ?? '6');
  const allowed = env.APP_ENV === 'production' && env.WEB_ORIGIN === 'https://alminapharmacy.com'
    && env.GOOGLE_CUSTOMER_REVIEWS_ELIGIBILITY_CONFIRMED === 'true';
  return { merchantId, deliveryBusinessDays, survey: allowed && env.GOOGLE_CUSTOMER_REVIEWS_ENABLED === 'true',
    widget: allowed && env.GOOGLE_MERCHANT_WIDGET_ENABLED === 'true' };
}

/** Conservative published handling + transit estimate, based on the original order date in the UAE. */
export function reviewDeliveryDate(createdAt: string, businessDays: number) {
  const value = z.iso.datetime().parse(createdAt);
  const days = z.number().int().min(1).max(30).parse(businessDays);
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)!.value;
  const date = new Date(`${part('year')}-${part('month')}-${part('day')}T00:00:00Z`);
  let remaining = days;
  while (remaining > 0) { date.setUTCDate(date.getUTCDate() + 1); if (![0, 6].includes(date.getUTCDay())) remaining--; }
  return date.toISOString().slice(0, 10);
}

export function surveyPayload(config: GoogleCommerceConfiguration, receipt: unknown) {
  if (!config.survey) return null;
  const parsed = reviewReceiptSchema.safeParse(receipt);
  if (!parsed.success) return null;
  return { merchant_id: config.merchantId, order_id: parsed.data.orderId, email: parsed.data.email,
    delivery_country: parsed.data.deliveryCountry, estimated_delivery_date: reviewDeliveryDate(parsed.data.createdAt, config.deliveryBusinessDays), opt_in_style: 'CENTER_DIALOG' as const };
}
