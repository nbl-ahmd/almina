import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Db } from 'mongodb';
import { assertRetainedBatchAllowed } from '../apps/api/src/modules/catalog/creation';
import { retainedCatalogCsv } from '../apps/api/src/modules/catalog/csv';
const header = 'name,category,barcode,price,stock,vat,sale,salePrice,featured,product_id,disabled';
const csv = (text: string) => retainedCatalogCsv(Buffer.from(text));
test('pre-upload recovery guard fails before CSV conversion and bounds the bootstrap lookup', async () => {
  let reads = 0, recovered = false;
  const db = { collection: (name: string) => ({ findOne: async (filter: unknown, options: unknown) => {
    reads++; assert.equal(name, 'recovery_bootstrap');
    assert.deepEqual(filter, { _id: 'empty-database-v1' });
    assert.deepEqual(options, { projection: { _id: 1 }, maxTimeMS: 3000, timeoutMS: 4000 });
    return recovered ? { _id: 'empty-database-v1' } : null;
  } }) } as unknown as Db;
  await assert.rejects(assertRetainedBatchAllowed(db, true), { status: 409, code: 'RECOVERY_IMPORT_REQUIRED' });
  assert.equal(reads, 0);
  await assertRetainedBatchAllowed(db, false); assert.equal(reads, 1);
  recovered = true;
  await assert.rejects(assertRetainedBatchAllowed(db, false), { status: 409, code: 'RECOVERY_IMPORT_REQUIRED' });
  assert.equal(reads, 2);
});
test('retained CSV preserves scalar identifiers/barcodes/decimal text, legacy trimming and uppercase flags without evaluating formulas', () => {
  const result = csv('\uFEFF' + header + '\r\n"Synthetic, care",Category,000012345678901234567890, 12.50 ,0,TRUE,FALSE,,TRUE,old-client-id,TRUE\r\n');
  assert.deepEqual(result, [{ name: 'Synthetic, care', category: 'Category', barcode: '000012345678901234567890', price: '12.50', stock: '0',
    vat: 'TRUE', sale: 'FALSE', salePrice: '', featured: 'TRUE', product_id: 'old-client-id', disabled: 'TRUE' }]);
  assert.equal(csv('name,category,barcode,price,stock\n"=1+1",Category,"0001",0.00,0')[0]!.name, '=1+1');
  assert.equal(csv('name,category,barcode,price,stock\n \t"Quoted care" \t,Category,001,1.25,2')[0]!.name, 'Quoted care');
  assert.equal(csv('name,category,barcode,price,stock\n"A\nB ""quoted""",Category,001,1.25,2')[0]!.name, 'A\nB "quoted"');
});
test('retained CSV rejects malformed/duplicate/missing headers, row widths, prototype/nested headers and non-UTF8 bytes', () => {
  for (const value of ['', header, 'name,category,price,stock\nSynthetic,Category,12.50,0',
    'name,category,barcode,price,stock,name\nA,B,1,1.00,0,C', 'name,category,barcode,price,stock,__proto__\nA,B,1,1.00,0,C',
    'name,category,barcode,price,stock,category.name\nA,B,1,1.00,0,C', 'name,category,barcode,price,stock\nA,B,1,1.00',
    'name,category,barcode,price,stock\n"unterminated,B,1,1.00,0', 'name,category,barcode,price,stock\n"A"x,B,1,1.00,0']) assert.throws(() => csv(value), { status: 400 });
  assert.throws(() => retainedCatalogCsv(new Uint8Array([0xff])), { status: 400 });
});
test('retained CSV bounds bytes, row count, columns and cells before transaction work', () => {
  assert.throws(() => retainedCatalogCsv(new Uint8Array(2 * 1024 * 1024 + 1)), { status: 413 });
  assert.equal(csv('name,category,barcode,price,stock\n' + Array(500).fill('A,B,001,1.00,0').join('\n')).length, 500);
  assert.throws(() => csv('name,category,barcode,price,stock\n' + Array(501).fill('A,B,001,1.00,0').join('\n')), { status: 400 });
  assert.throws(() => csv('name,category,barcode,price,stock\n' + 'A'.repeat(16001) + ',B,001,1.00,0'), { status: 400 });
  const columns = ['name', 'category', 'barcode', 'price', 'stock', ...Array.from({ length: 28 }, (_, i) => 'unused_' + i)];
  assert.throws(() => csv(columns.join(',') + '\n' + columns.map(() => '1').join(',')), { status: 400 });
});
