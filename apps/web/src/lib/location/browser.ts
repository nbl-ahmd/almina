import { deliveryArea, savedPointFrom, type DeliveryArea, type SavedPoint } from '../browser-validation';
export type { DeliveryArea, SavedPoint };
const parseArea = (value: unknown) => { const area = deliveryArea(value); if (!area) throw new Error('Invalid delivery area'); return area; };
const parsePoint = (value: unknown) => { const point = savedPointFrom(value); if (!point) throw new Error('Invalid delivery point'); return point; };
const key = 'almina.delivery-area.v1';
export const areaEvent = 'almina-delivery-area-change';
export const openDeliveryEvent = 'almina-open-delivery-area';
export function savedArea(): DeliveryArea | null {
  try { const raw = localStorage.getItem(key); return raw ? parseArea(JSON.parse(raw)) : null; } catch { return null; }
}
export function saveArea(area: DeliveryArea) {
  localStorage.setItem(key, JSON.stringify(parseArea(area)));
  localStorage.setItem('almina.delivery-prompt.v1', 'dismissed');
  window.dispatchEvent(new Event(areaEvent));
}

/** The exact spot the customer confirmed on the map. Kept on this device only; checkout copies it into the order, where the
 *  server re-validates it. Older visitors only have an area, so every reader must cope with this being absent. */
const pointKey = 'almina.delivery-point.v1';
export function savedPoint(): SavedPoint | null {
  try { const raw = localStorage.getItem(pointKey); return raw ? parsePoint(JSON.parse(raw)) : null; } catch { return null; }
}
export function savePoint(point: SavedPoint) {
  const value = parsePoint(point);
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
