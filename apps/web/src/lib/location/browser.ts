import { z } from 'zod';
import { deliveryEmirates } from '@almina/contracts';
export const areaSchema = z.object({ emirate: z.enum(deliveryEmirates), city: z.string().trim().min(1).max(200) }).strict();
export type DeliveryArea = z.infer<typeof areaSchema>;
const key = 'almina.delivery-area.v1';
export const areaEvent = 'almina-delivery-area-change';
export function savedArea(): DeliveryArea | null {
  try { const raw = localStorage.getItem(key); return raw ? areaSchema.parse(JSON.parse(raw)) : null; } catch { return null; }
}
export function saveArea(area: DeliveryArea) {
  localStorage.setItem(key, JSON.stringify(areaSchema.parse(area)));
  localStorage.setItem('almina.delivery-prompt.v1', 'dismissed');
  window.dispatchEvent(new Event(areaEvent));
}
