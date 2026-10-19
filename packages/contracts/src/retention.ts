import { z } from 'zod';

export const reminderKinds = ['restock', 'price-drop', 'replenishment', 'cart'] as const;
export const retentionPolicySchema = z.object({
  revision: z.number().int().nonnegative().default(0), enabled: z.boolean().default(false),
  restock: z.boolean().default(false), priceDrop: z.boolean().default(false),
  replenishment: z.boolean().default(false), cartRecovery: z.boolean().default(false),
  cartDelayHours: z.number().int().min(1).max(72).default(24),
}).strict();
export type RetentionPolicy = z.infer<typeof retentionPolicySchema>;
const id = z.string().regex(/^[a-f0-9]{24}$/i);
export const reminderInputSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('subscribe'), kind: z.enum(reminderKinds), consent: z.literal(true),
    productId: id.optional(), days: z.number().int().min(7).max(180).optional(),
    items: z.array(z.object({ id, quantity: z.number().int().min(1).max(99) }).strict()).min(1).max(30).optional(),
  }).strict(),
  z.object({ operation: z.literal('cancel'), id: z.string().min(1).max(100) }).strict(),
]).superRefine((value, context) => {
  if (value.operation !== 'subscribe') return;
  if (value.kind === 'cart' ? !value.items || value.productId || value.days : !value.productId || value.items || (value.kind === 'replenishment' ? !value.days : value.days !== undefined))
    context.addIssue({ code: 'custom', message: 'Choose a product or a cart and a valid reminder interval.' });
});
export const reminderDtoSchema = z.object({
  id: z.string(), kind: z.enum(reminderKinds), productName: z.string(),
  state: z.enum(['waiting', 'processing', 'sending', 'sent', 'uncertain', 'cancelled', 'expired']),
  dueAt: z.coerce.date(), createdAt: z.coerce.date(),
});
