import { z } from 'zod';
import { commerceEvents } from './commerce-events';
export const commerceEventSchema = z.object({ event: z.enum(commerceEvents), consent: z.literal(true), campaign: z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/).optional() }).strict().refine(value => value.event.startsWith('campaign_') ? !!value.campaign : value.campaign === undefined);
export const commerceEventCountsSchema = z.object({ cart_updated: z.number().int().nonnegative().max(100000),
  checkout_reviewed: z.number().int().nonnegative().max(100000), checkout_confirmed: z.number().int().nonnegative().max(100000),
  checkout_failed: z.number().int().nonnegative().max(100000), client_error: z.number().int().nonnegative().max(100000),
  page_viewed: z.number().int().nonnegative().max(100000), product_viewed: z.number().int().nonnegative().max(100000),
  search_performed: z.number().int().nonnegative().max(100000), search_matched: z.number().int().nonnegative().max(100000),
  campaign_viewed: z.number().int().nonnegative().max(100000), campaign_clicked: z.number().int().nonnegative().max(100000) }).strict();
