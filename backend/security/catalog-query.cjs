const { fail } = require('./boundary.cjs');
// Compatibility input is reconstructed from typed fields, never forwarded as a raw Mongo filter.
function catalogFilter(input, search = false, category = false) {
  if (input === undefined) return { archivedAt: { $exists: false } };
  if (typeof input !== 'string' || input.length > 2000) throw fail(400, 'INVALID_REQUEST');
  let parsed;
  try { parsed = JSON.parse(input); } catch { throw fail(400, 'INVALID_REQUEST'); }
  const parts = search && Array.isArray(parsed) ? parsed : [parsed];
  if (parts.length > 10) throw fail(400, 'INVALID_REQUEST');
  const result = { archivedAt: { $exists: false } };
  for (const part of parts) {
    if (!part || typeof part !== 'object' || Array.isArray(part)) throw fail(400, 'INVALID_REQUEST');
    for (const [key, value] of Object.entries(part)) {
      if (['disabled', ...(category ? [] : ['featured', 'sale'])].includes(key) && typeof value === 'boolean') result[key] = value;
      else if (!category && key === 'category' && typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value)) result.category = value;
      else if (!category && key === 'stock' && typeof value === 'number' && Number.isInteger(value) && value >= 0) result.stock = value;
      else throw fail(400, 'INVALID_REQUEST');
    }
  }
  return result;
}
function escapeSearch(value) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 80) throw fail(400, 'INVALID_REQUEST');
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
module.exports = { catalogFilter, escapeSearch };
