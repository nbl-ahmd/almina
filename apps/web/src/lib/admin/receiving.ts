import { z } from 'zod';

// No customer information belongs in the alert transport.
export const receivingSignalSchema = z.object({
  pendingCount: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  latestIds: z.array(z.string().regex(/^[a-f0-9]{24}$/i)).max(10),
  reviewCount: z.number().int().nonnegative().optional(),
  oldestPendingAt: z.iso.datetime().nullable().optional(),
});
export type ReceivingSignal = z.infer<typeof receivingSignalSchema>;
export function waitingMinutes(oldest: string | null | undefined, now: number) {
  if (!oldest) return 0;
  const time = Date.parse(oldest);
  return Number.isFinite(time) ? Math.max(0, Math.floor((now - time) / 60000)) : 0;
}
