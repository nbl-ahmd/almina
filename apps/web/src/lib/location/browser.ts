import { z } from 'zod';
import { deliveryEmirates } from '@almina/contracts';
export const areaSchema = z.object({ emirate: z.enum(deliveryEmirates), city: z.string().trim().min(1).max(200) }).strict();
export type DeliveryArea = z.infer<typeof areaSchema>;
const key = 'almina.delivery-area.v1';
export const areaEvent = 'almina-delivery-area-change';
export const openDeliveryEvent = 'almina-open-delivery-area';
export function savedArea(): DeliveryArea | null {
  try { const raw = localStorage.getItem(key); return raw ? areaSchema.parse(JSON.parse(raw)) : null; } catch { return null; }
}
export function saveArea(area: DeliveryArea) {
  localStorage.setItem(key, JSON.stringify(areaSchema.parse(area)));
  localStorage.setItem('almina.delivery-prompt.v1', 'dismissed');
  window.dispatchEvent(new Event(areaEvent));
}

/** The exact spot the customer confirmed on the map. Kept on this device only; checkout copies it into the order, where the
 *  server re-validates it. Older visitors only have an area, so every reader must cope with this being absent. */
export const pointSchema = z.object({
  latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180),
  address: z.string().trim().min(1).max(1000), emirate: z.enum(deliveryEmirates), city: z.string().trim().min(1).max(200),
  // Details the customer adds after placing the pin. All optional so older saved points keep working.
  label: z.enum(['Home', 'Work', 'Other']).optional(), building: z.string().trim().max(120).optional(), flat: z.string().trim().max(60).optional(), note: z.string().trim().max(300).optional(),
}).strict();
export type SavedPoint = z.infer<typeof pointSchema>;
const pointKey = 'almina.delivery-point.v1';
export function savedPoint(): SavedPoint | null {
  try { const raw = localStorage.getItem(pointKey); return raw ? pointSchema.parse(JSON.parse(raw)) : null; } catch { return null; }
}
export function savePoint(point: SavedPoint) {
  const value = pointSchema.parse(point);
  localStorage.setItem(pointKey, JSON.stringify(value));
  saveArea({ emirate: value.emirate, city: value.city });
}
export function clearPoint() {
  try { localStorage.removeItem(pointKey); } catch { /* Storage can be unavailable; the area still works. */ }
  window.dispatchEvent(new Event(areaEvent));
}
const skipKey = 'almina.delivery-skip.v1';
const skipDays = 7;
/** "Browse first": the sheet stays out of the way for a week instead of greeting the customer on every page. */
export function skipLocationPrompt() { try { localStorage.setItem(skipKey, String(Date.now())); } catch { /* Best effort. */ } }
export function locationPromptSkipped(now = Date.now()) {
  try { const at = Number(localStorage.getItem(skipKey)); return Number.isFinite(at) && at > 0 && now - at < skipDays * 86400000; } catch { return false; }
}
