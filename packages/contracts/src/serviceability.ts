import { z } from 'zod';

const short = z.string().trim().max(200);
const safeMap = z.url().refine(value => value.startsWith('https://www.google.com/maps') || value.startsWith('https://maps.google.com/')).or(z.literal('')).default('');

/** A staff-maintained branch record. Nothing public is shown until the directory is explicitly verified. */
export const branchSchema = z.object({
  branchId:z.uuid().optional(),
  name: short.min(2), phone: z.string().trim().regex(/^\+?[0-9][0-9 -]{5,19}$/).or(z.literal('')).default(''),
  address: short.default(''), hours: short.default(''), deliveryHours: short.default(''), mapUrl: safeMap,
  areas: z.array(short.min(1)).max(50).default([]), verified: z.boolean().default(false),
}).strict();
export type Branch = z.infer<typeof branchSchema>;
export const branchDirectorySchema = z.object({
  items: z.array(branchSchema).max(20).default([]), verified: z.boolean().default(false),
  revision: z.number().int().nonnegative().default(0),
}).strict();
export type BranchDirectory = z.infer<typeof branchDirectorySchema>;

/**
 * Server-authoritative serviceability. Inactive by default, so existing delivery behaviour is unchanged
 * until staff publish an explicit served-area rule. The browser is never trusted to decide this.
 */
export const serviceabilityPolicySchema = z.object({
  active: z.boolean().default(false),
  emirates: z.array(short.min(1)).max(7).default([]),
  blockedCities: z.array(short.min(1)).max(200).default([]),
  notes: z.string().trim().max(1000).default(''),
  revision: z.number().int().nonnegative().default(0),
}).strict();
export type ServiceabilityPolicy = z.infer<typeof serviceabilityPolicySchema>;
export function isServiceable(customer: { emirate: string; city: string }, policy: Pick<ServiceabilityPolicy, 'active' | 'emirates' | 'blockedCities'>) {
  if (!policy.active) return true;
  const emirate = customer.emirate.trim().toLowerCase(), city = customer.city.trim().toLowerCase();
  return policy.emirates.some(value => value.trim().toLowerCase() === emirate) && !policy.blockedCities.some(value => value.trim().toLowerCase() === city);
}
