import { HttpError } from '../../errors.js';
import { boundedCsvRecords } from '../imports/csv.js';
const required = ['name', 'category', 'barcode', 'price', 'stock'];
export function retainedCatalogCsv(bytes: Uint8Array) {
  if (bytes.byteLength > 2 * 1024 * 1024) throw new HttpError(413, 'PAYLOAD_TOO_LARGE');
  let text: string; try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch { throw new HttpError(400, 'INVALID_REQUEST'); }
  const records = boundedCsvRecords(text, { bytes: 2 * 1024 * 1024, columns: 32, trimOuterWhitespace: true });
  const header = records.shift()?.map(value => value.trim());
  if (!header?.length || new Set(header).size !== header.length || header.some(value => !/^[A-Za-z_][A-Za-z0-9_]{0,79}$/.test(value)
    || ['__proto__', 'constructor', 'prototype'].includes(value)) || required.some(value => !header.includes(value))
    || !records.length || records.some(values => values.length !== header.length)) throw new HttpError(400, 'INVALID_REQUEST');
  // Preserve legacy trim/checkType=false behavior. Category/ID allocation and every commercial write stay in the domain.
  return records.map(values => Object.fromEntries(header.map((key, index) => [key, values[index]!.trim()])) as Record<string, string>);
}
