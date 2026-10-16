import { HttpError } from '../../errors.js';
// Bounded RFC 4180 subset, shared by reviewed recovery and retained CSV conversion.
export function boundedCsvRecords(text: string, limits: { bytes: number; columns: number; rows?: number; trimOuterWhitespace?: boolean }): string[][] {
  if (Buffer.byteLength(text) > limits.bytes) throw new HttpError(413, 'PAYLOAD_TOO_LARGE');
  const records: string[][] = [];
  let record: string[] = [], field = '', quoted = false, closed = false;
  const input = text.replace(/^\uFEFF/, '');
  function cell() { record.push(field); if (record.length > limits.columns) throw new HttpError(400, 'INVALID_REQUEST'); field = ''; closed = false; }
  function line() {
    cell();
    if (record.some(value => value.length)) records.push(record);
    record = [];
    if (records.length > (limits.rows ?? 500) + 1) throw new HttpError(400, 'INVALID_REQUEST');
  }
  for (let i = 0; i < input.length; i++) {
    const char = input[i]!;
    if (quoted) {
      if (char === '"') {
        if (input[i + 1] === '"') { field += '"'; i++; } else { quoted = false; closed = true; }
      } else field += char;
    } else if (char === ',' ) cell();
    else if (char === '\r' || char === '\n') { line(); if (char === '\r' && input[i + 1] === '\n') i++; }
    else if (char === '"' && (!field || limits.trimOuterWhitespace && !field.trim()) && !closed) { field = ''; quoted = true; }
    else { if (closed && limits.trimOuterWhitespace && /^\s$/.test(char)) continue;
      if (closed || char === '"') throw new HttpError(400, 'INVALID_REQUEST'); field += char; }
    if (field.length > 16000 || record.length > limits.columns) throw new HttpError(400, 'INVALID_REQUEST');
  }
  if (quoted) throw new HttpError(400, 'INVALID_REQUEST');
  if (field.length || record.length || closed) line();
  return records;
}
