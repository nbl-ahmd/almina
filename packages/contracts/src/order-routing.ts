import { deliveryPointSchema } from './delivery-zones';
import { z } from 'zod';
import { rakDeliveryAreas } from './rak-delivery-areas';
export { rakDeliveryAreas } from './rak-delivery-areas';
// Deliberately bounded, identical in JavaScript and MongoDB's legacy-read expression.
export const areaReplacements = [[' ', ''], ['-', ''], ['_', ''], ['’', ''], ["'", ''], ['.', ''], ['ـ', '']] as const;
export function areaKey(value: string) {
  let key = value.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '').replace(/[A-Z]/g, letter => letter.toLowerCase());
  for (const [from, to] of areaReplacements) key = key.replaceAll(from, to);
  return key;
}
export const rakEmirateKeys = ['Ras al-Khaimah', 'Ras Al Khaimah', 'RAK', 'رأس الخيمة', 'راس الخيمة'].map(areaKey);
export function resolveDeliveryArea(customer: { city?: unknown; emirate?: unknown }) {
  if (typeof customer.city !== 'string' || typeof customer.emirate !== 'string' || !rakEmirateKeys.includes(areaKey(customer.emirate))) return null;
  const key = areaKey(customer.city);
  const matches = rakDeliveryAreas.filter(area => [area.name, ...area.aliases].some(alias => areaKey(alias) === key));
  // Ambiguous names are never guessed. The fallback queue handles them.
  return matches.length === 1 ? matches[0]!.id : null;
}
export const routingBranchSchema = z.object({ id: z.uuid(), name: z.string().trim().min(2).max(100),
  enabled: z.boolean().optional(), kind: z.enum(['branch','warehouse']).optional(), address: z.string().trim().max(1000).optional(), phone: z.string().trim().max(30).optional(), email: z.union([z.email(),z.literal('')]).optional(), hours: z.string().trim().max(500).optional(), location: deliveryPointSchema.nullable().optional(),
  areaIds: z.array(z.string().refine(value => rakDeliveryAreas.some(area => area.id === value))).max(300),
}).strict();
export const orderRoutingSchema = z.object({ revision: z.number().int().nonnegative().default(0), active: z.boolean().default(false),
  branches: z.array(routingBranchSchema).max(20).default([]), fallbackBranchId: z.uuid().nullable().default(null),
}).strict().superRefine((value, context) => {
  const ids = value.branches.map(branch => branch.id), names = value.branches.map(branch => areaKey(branch.name));
  const areas = value.branches.flatMap(branch => branch.areaIds);
  if (new Set(ids).size !== ids.length || new Set(names).size !== names.length || new Set(areas).size !== areas.length)
    context.addIssue({ code: 'custom', message: 'Each branch and delivery area must be unique.' });
  if ((value.active || value.fallbackBranchId) && !ids.includes(value.fallbackBranchId ?? ''))
    context.addIssue({ code: 'custom', message: 'Choose an existing fallback branch.' });
});
export type OrderRouting = z.infer<typeof orderRoutingSchema>;
export function routingDecision(areaId: string | null, policy: OrderRouting) {
  const explicit = policy.branches.find(branch => branch.areaIds.includes(areaId ?? ''));
  const branch = policy.active ? explicit ?? policy.branches.find(branch => branch.id === policy.fallbackBranchId) : undefined;
  return { areaId, areaLabel: rakDeliveryAreas.find(area => area.id === areaId)?.name ?? 'Unrecognized delivery area',
    branchId: branch?.id ?? null, branchName: branch?.name ?? 'Administrator inbox', needsReview: areaId === null };
}
