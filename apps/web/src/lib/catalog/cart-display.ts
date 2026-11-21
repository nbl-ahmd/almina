/** Catalogue-price display estimates only. Checkout always obtains its own server quote. */
export function catalogueLineMinor(price: number | null, quantity: number): number | null {
  if (price === null || !Number.isFinite(price) || price < 0 || !Number.isInteger(quantity) || quantity < 1) return null;
  const minor = Math.round((price + Number.EPSILON) * 100);
  const total = minor * quantity;
  return Number.isSafeInteger(minor) && Number.isSafeInteger(total) ? total : null;
}
export function catalogueSubtotal(lines: { lineTotalMinor: number | null }[]): number | null {
  if (!lines.length || lines.some(line => line.lineTotalMinor === null)) return null;
  const total = lines.reduce((sum, line) => sum + line.lineTotalMinor!, 0);
  return Number.isSafeInteger(total) ? total : null;
}
