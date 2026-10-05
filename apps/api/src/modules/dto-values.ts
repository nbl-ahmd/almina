export const text = (value: unknown): string | null => typeof value === 'string' ? value : null;
export const number = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
// The root workspace and persistent service have separately installed BSON constructors.
// Normalize genuine database ObjectIds across those package boundaries without accepting strings.
export function id(value: unknown): string | null {
  if (!value || typeof value !== 'object' || !('_bsontype' in value) || value._bsontype !== 'ObjectId'
    || !('toHexString' in value) || typeof value.toHexString !== 'function') return null;
  try { const hex: unknown = value.toHexString(); return typeof hex === 'string' && /^[a-f0-9]{24}$/.test(hex) ? hex : null; }
  catch { return null; }
}
