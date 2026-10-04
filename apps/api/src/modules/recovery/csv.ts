import { HttpError } from '../../errors.js';
export const recoveryColumns = ['product_id', 'name', 'category', 'barcode', 'price', 'salePrice', 'vat', 'featured', 'description', 'cloudinaryImages'] as const;
export const recoveryTemplate = recoveryColumns.join(',') + '\r\n';
// RFC 4180 subset: quoted newlines/commas/doubled quotes, strict headers/row widths.
// Identifiers, barcodes and decimal money remain strings; no formula evaluation/coercion.
export function recoveryCsv(text: string) {
  if (Buffer.byteLength(text) > 4 * 1024 * 1024) throw new HttpError(413, 'PAYLOAD_TOO_LARGE');
  const records: string[][] = [];
  let record: string[] = [], field = '', quoted = false, closed = false;
  const input = text.replace(/^\uFEFF/, '');
  function cell() { record.push(field); field = ''; closed = false; }
  function line() {
    cell();
    if (record.some(value => value.length)) records.push(record);
    record = [];
    if (records.length > 501) throw new HttpError(400, 'INVALID_REQUEST');
  }
  for (let i = 0; i < input.length; i++) {
    const char = input[i]!;
    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') { field += '"'; i++; } else { quoted = false; closed = true; }
      } else field += char;
    } else if (char === ',' ) cell();
    else if (char === '\r' || char === '\n') { line(); if (char === '\r' && input[i + 1] === '\n') i++; }
    else if (char === '"' && !field && !closed) quoted = true;
    else { if (closed || char === '"') throw new HttpError(400, 'INVALID_REQUEST'); field += char; }
    if (field.length > 16000 || record.length > recoveryColumns.length) throw new HttpError(400, 'INVALID_REQUEST');
  }
  if (quoted) throw new HttpError(400, 'INVALID_REQUEST');
  if (field.length || record.length || closed) line();
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
