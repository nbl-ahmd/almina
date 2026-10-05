import { z } from 'zod';
import { commerceEvents } from './commerce-events';
export const commerceEventSchema = z.object({ event: z.enum(commerceEvents), consent: z.literal(true) }).strict();
export const commerceEventCountsSchema = z.object({ cart_updated: z.number().int().nonnegative().max(100000),
  checkout_reviewed: z.number().int().nonnegative().max(100000), checkout_confirmed: z.number().int().nonnegative().max(100000),
  checkout_failed: z.number().int().nonnegative().max(100000), client_error: z.number().int().nonnegative().max(100000) }).strict();
