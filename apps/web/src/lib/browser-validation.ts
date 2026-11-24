// Dependency-free readers for values the browser keeps on this device. They run on every
// storefront page (cart badge, add-to-cart, delivery chip), so they avoid loading zod.
// Each mirrors a zod schema used on the server; tests/browser-validation.test.ts keeps them in step.
// Nothing here is trusted for price, stock, coverage or totals: the server validates again.
import { deliveryEmirates, type DeliveryEmirate } from '@almina/contracts/delivery-emirates';

const objectId = /^[a-f0-9]{24}$/i;
const uuid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
type Row = Record<string, unknown>;
const isRow = (value: unknown): value is Row => typeof value === 'object' && value !== null && !Array.isArray(value);
const onlyKeys = (row: Row, keys: readonly string[]) => Object.keys(row).every(key => keys.includes(key));
const isInt = (value: unknown, min: number, max: number): value is number => Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
const isEmirate = (value: unknown): value is DeliveryEmirate => (deliveryEmirates as readonly unknown[]).includes(value);
/** zod `.trim().min(min).max(max)`: returns the trimmed text, or null when it does not fit. */
function text(value: unknown, min: number, max: number) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length >= min && trimmed.length <= max ? trimmed : null;
}

export type CartLine = { id: string; quantity: number };
/** Mirrors `cartSchema`: up to 100 distinct product ids, quantities 1–999. Extra keys are dropped. */
export function cartLines(value: unknown): CartLine[] | null {
  if (!Array.isArray(value) || value.length > 100) return null;
  const lines: CartLine[] = [];
  for (const line of value) {
    if (!isRow(line) || typeof line.id !== 'string' || !objectId.test(line.id) || !isInt(line.quantity, 1, 999)) return null;
    lines.push({ id: line.id, quantity: line.quantity });
  }
  return new Set(lines.map(line => line.id)).size === lines.length ? lines : null;
}
export function decodeStoredCart(raw: string | null, legacy = false): CartLine[] {
  try {
    const data: unknown = JSON.parse(raw ?? '[]');
    if (!Array.isArray(data)) return [];
    const candidates = legacy ? data.map(line => isRow(line) ? { id: line._id, quantity: line.quantity } : null) : data;
    return cartLines(candidates) ?? [];
  } catch { return []; }
}

export type DeliveryArea = { emirate: DeliveryEmirate; city: string };
/** Mirrors `areaSchema` (strict). */
export function deliveryArea(value: unknown): DeliveryArea | null {
  if (!isRow(value) || !onlyKeys(value, ['emirate', 'city']) || !isEmirate(value.emirate)) return null;
  const city = text(value.city, 1, 200);
  return city === null ? null : { emirate: value.emirate, city };
}

const pointLabels = ['Home', 'Work', 'Other'] as const;
export type SavedPoint = DeliveryArea & {
  latitude: number; longitude: number; address: string;
  label?: typeof pointLabels[number]; building?: string; flat?: string; note?: string;
};
const pointKeys = ['latitude', 'longitude', 'address', 'emirate', 'city', 'label', 'building', 'flat', 'note'] as const;
/** Mirrors `pointSchema` (strict). Optional details may be absent so older saved points keep working. */
export function savedPointFrom(value: unknown): SavedPoint | null {
  if (!isRow(value) || !onlyKeys(value, pointKeys) || !isEmirate(value.emirate)) return null;
  const { latitude, longitude } = value;
  if (typeof latitude !== 'number' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) return null;
  if (typeof longitude !== 'number' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  const address = text(value.address, 1, 1000), city = text(value.city, 1, 200);
  if (address === null || city === null) return null;
  const point: SavedPoint = { latitude, longitude, address, emirate: value.emirate, city };
  if (value.label !== undefined) {
    if (!(pointLabels as readonly unknown[]).includes(value.label)) return null;
    point.label = value.label as typeof pointLabels[number];
  }
  for (const [key, max] of [['building', 120], ['flat', 60], ['note', 300]] as const) {
    if (value[key] === undefined) continue;
    const detail = text(value[key], 0, max);
    if (detail === null) return null;
    point[key] = detail;
  }
  return point;
}

export type SearchAttribution = { searchId: string; productId: string; position: number };
/** Mirrors `searchAttributionSchema` (strict rows, at most 50). */
export function searchAttributionsFrom(value: unknown): SearchAttribution[] | null {
  if (!Array.isArray(value) || value.length > 50) return null;
  const rows: SearchAttribution[] = [];
  for (const row of value) {
    if (!isRow(row) || !onlyKeys(row, ['searchId', 'productId', 'position'])) return null;
    if (typeof row.searchId !== 'string' || !uuid.test(row.searchId) || typeof row.productId !== 'string' || !objectId.test(row.productId) || !isInt(row.position, 1, 300)) return null;
    rows.push({ searchId: row.searchId, productId: row.productId, position: row.position });
  }
  return rows;
}
