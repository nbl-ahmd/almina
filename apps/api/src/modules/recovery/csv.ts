import { HttpError } from '../../errors.js';
import { boundedCsvRecords } from '../imports/csv.js';
export const recoveryColumns = ['product_id', 'name', 'category', 'barcode', 'price', 'salePrice', 'vat', 'featured', 'description', 'cloudinaryImages'] as const;
export const recoveryTemplate = recoveryColumns.join(',') + '\r\n';
// RFC 4180 subset: quoted newlines/commas/doubled quotes, strict headers/row widths.
// Identifiers, barcodes and decimal money remain strings; no formula evaluation/coercion.
export function recoveryCsv(text: string) {
  const records = boundedCsvRecords(text, { bytes: 4 * 1024 * 1024, columns: recoveryColumns.length });
  const header = records.shift();
  if (!header || header.length !== recoveryColumns.length || header.some((value, i) => value !== recoveryColumns[i])
    || !records.length || records.some(values => values.length !== header.length)) throw new HttpError(400, 'INVALID_REQUEST');
  return records.map(values => {
    const row: Record<(typeof recoveryColumns)[number], string> = Object.fromEntries(recoveryColumns.map((key, i) => [key, values[i]!])) as Record<(typeof recoveryColumns)[number], string>;
    const bool = (value: string) => value === 'true' ? true : value === 'false' ? false : value;
    return { ...row, vat: bool(row.vat!), featured: row.featured ? bool(row.featured) : false,
      cloudinaryImages: row.cloudinaryImages ? row.cloudinaryImages.split('|') : [],
      ...(row.salePrice === '' ? { salePrice: undefined } : {}) };
  });
}
