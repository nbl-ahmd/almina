import assert from 'node:assert/strict';
import { test } from 'node:test';
import { recoveryCsv, recoveryTemplate } from '../apps/api/src/modules/recovery/csv.js';
import { validateRecoveryInput, parseRecoveryCatalog, recoveryDigest } from '../apps/api/src/modules/recovery/catalog.js';
const row = { product_id: 'PD_ORIGINAL', name: 'Reviewed item', category: 'Care', barcode: '000001234567890123', price: '12.50', vat: true,
  cloudinaryImages: ['https://res.cloudinary.com/synthetic/image/upload/v1/item.webp'] };
test('CSV preserves long leading-zero barcodes, stable IDs, decimal text and quoted content', () => {
  const rows = recoveryCsv(recoveryTemplate + 'PD_ORIGINAL,"Reviewed, item",Care,000001234567890123,12.50,,true,false,"Two\nlines",https://res.cloudinary.com/synthetic/image/upload/v1/item.webp\r\n');
  assert.equal(rows[0]!.barcode, row.barcode); assert.equal(rows[0]!.price, '12.50');
  assert.equal(rows[0]!.name, 'Reviewed, item'); assert.equal(rows[0]!.description, 'Two\nlines');
  assert.equal(('stock' in parseRecoveryCatalog(rows, 'synthetic')[0]!), false);
});
test('recovery validation returns bounded row errors for money, duplicates, identity and foreign images', () => {
  for (const patch of [{ price: '1.001' }, { price: 12.5 }, { barcode: 123 }, { salePrice: '13' },
    { cloudinaryImages: ['https://res.cloudinary.com/other/image/upload/x.png'] }, { stock: 10 }]) {
    assert.ok(validateRecoveryInput([{ ...row, ...patch }], 'synthetic').errors.length);
  }
  assert.equal(validateRecoveryInput([row, row], 'synthetic').errors[0]!.row, 2);
  assert.ok(validateRecoveryInput(Array.from({ length: 501 }, () => row), 'synthetic').errors.length);
  assert.throws(() => validateRecoveryInput([row], ''), { status: 503 });
  assert.throws(() => validateRecoveryInput('x'.repeat(4 * 1024 * 1024), 'synthetic'), { status: 413 });
  const errors = validateRecoveryInput([{ ...row, price: 'secret-marker' }], 'synthetic').errors;
  assert.ok(!JSON.stringify(errors).includes('secret-marker'));
});
test('CSV rejects malformed quotes, headers/columns, oversized input and row floods', () => {
  for (const csv of ['name,stock\nx,1', recoveryTemplate + '"unterminated', recoveryTemplate + '"x"trailing',
    recoveryTemplate + 'x,y', recoveryTemplate + ('x,'.repeat(10) + 'x\n').repeat(501)]) assert.throws(() => recoveryCsv(csv));
});
test('canonical review digest changes for any reviewed commercial or identity change', () => {
  const digest = recoveryDigest(parseRecoveryCatalog([row], 'synthetic'), 'synthetic');
  assert.equal(digest, recoveryDigest(parseRecoveryCatalog([{ ...row, price: '12.5' }], 'synthetic'), 'synthetic'));
  for (const patch of [{ price: '13' }, { barcode: '000002' }, { product_id: 'PD_OTHER' }, { vat: false }]) {
    assert.notEqual(digest, recoveryDigest(parseRecoveryCatalog([{ ...row, ...patch }], 'synthetic'), 'synthetic'));
  }
});
