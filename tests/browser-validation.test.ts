import test from 'node:test';
import assert from 'node:assert/strict';
import { cartSchema } from '../apps/web/src/lib/catalog/model';
import { areaSchema, pointSchema } from '../apps/web/src/lib/location/schema';
import { searchAttributionSchema } from '../packages/contracts/src/search';
import { cartLines, deliveryArea, savedPointFrom, searchAttributionsFrom } from '../apps/web/src/lib/browser-validation';

// The browser readers avoid zod for bundle size; each must accept and normalise exactly what its zod schema does.
function agrees<T>(name: string, mirror: (value: unknown) => T | null, schema: { safeParse(value: unknown): { success: boolean; data?: unknown } }, samples: unknown[]) {
  for (const sample of samples) {
    const expected = schema.safeParse(sample), actual = mirror(sample);
    assert.equal(actual !== null, expected.success, `${name} acceptance differs for ${JSON.stringify(sample)}`);
    if (expected.success) assert.deepEqual(actual, expected.data, `${name} output differs for ${JSON.stringify(sample)}`);
  }
}
const a = 'aaaaaaaaaaaaaaaaaaaaaaaa', b = 'BBBBBBBBBBBBBBBBBBBBBBBB';

test('cart reader matches cartSchema', () => {
  agrees('cart', cartLines, cartSchema, [
    [], [{ id: a, quantity: 1 }], [{ id: a, quantity: 999 }, { id: b, quantity: 2 }], [{ id: a, quantity: 2, price: 0, role: 'admin' }],
    [{ id: a, quantity: 0 }], [{ id: a, quantity: 1000 }], [{ id: a, quantity: 1.5 }], [{ id: a, quantity: '2' }], [{ id: 'x', quantity: 1 }],
    [{ id: a, quantity: 1 }, { id: a, quantity: 1 }], [null], [[]], {}, 'oops', Array.from({ length: 101 }, (_, i) => ({ id: i.toString(16).padStart(24, '0'), quantity: 1 })),
    Array.from({ length: 100 }, (_, i) => ({ id: i.toString(16).padStart(24, '0'), quantity: 1 })),
  ]);
});

test('delivery area and saved point readers match their schemas', () => {
  agrees('area', deliveryArea, areaSchema, [
    { emirate: 'Dubai', city: 'Marina' }, { emirate: 'Dubai', city: '  Al Nakheel  ' }, { emirate: 'Dubai', city: '   ' }, { emirate: 'Gotham', city: 'x' },
    { emirate: 'Dubai', city: 'x'.repeat(201) }, { emirate: 'Dubai', city: 'x', extra: 1 }, { emirate: 'Dubai' }, null, [], 'Dubai',
  ]);
  const point = { latitude: 25.79, longitude: 55.94, address: ' Al Nakheel, RAK ', emirate: 'Ras al-Khaimah', city: 'Al Nakheel' };
  agrees('point', savedPointFrom, pointSchema, [
    point, { ...point, label: 'Home', building: ' Villa 4 ', flat: '', note: 'Gate' }, { ...point, label: 'Office' }, { ...point, latitude: 91 },
    { ...point, longitude: -181 }, { ...point, latitude: '25' }, { ...point, address: '' }, { ...point, extra: 1 }, { ...point, emirate: 'Gotham' },
    { ...point, building: 'x'.repeat(121) }, { ...point, flat: 'x'.repeat(61) }, { ...point, note: 'x'.repeat(301) }, { ...point, note: 3 },
  ]);
});

test('search attribution reader matches searchAttributionSchema', () => {
  const row = { searchId: '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b', productId: a, position: 1 };
  agrees('attribution', searchAttributionsFrom, searchAttributionSchema, [
    [], [row], [{ ...row, position: 300 }], [{ ...row, position: 301 }], [{ ...row, position: 0 }], [{ ...row, searchId: 'not-a-uuid' }],
    [{ ...row, searchId: '00000000-0000-0000-0000-000000000000' }], [{ ...row, searchId: 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF' }],
    [{ ...row, productId: 'x' }], [{ ...row, extra: true }], Array.from({ length: 51 }, () => row), null, {},
  ]);
});
