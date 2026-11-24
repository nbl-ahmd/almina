import test from 'node:test';
import assert from 'node:assert/strict';
import { cartCookieMaxLength, decodeCartCookie, encodeCartCookie } from '../apps/web/src/lib/catalog/cart-cookie';

const a = 'aaaaaaaaaaaaaaaaaaaaaaaa', b = 'bbbbbbbbbbbbbbbbbbbbbbbb';

test('the cart cookie round-trips ids and quantities only', () => {
  const lines = [{ id: a, quantity: 2 }, { id: b, quantity: 999 }];
  const value = encodeCartCookie(lines);
  assert.equal(value, `${a}_2.${b}_999`);
  assert.deepEqual(decodeCartCookie(value), lines);
  assert.equal(encodeCartCookie([]), null);
});

test('tampered, duplicated, out-of-range or oversized cookies are ignored', () => {
  for (const value of [undefined, null, '', 'oops', `${a}_0`, `${a}_1000`, `${a}_1.${a}_2`, `${a}_1;x=1`, `${a}_-1`, 'x'.repeat(cartCookieMaxLength + 1)]) {
    assert.equal(decodeCartCookie(value), null, String(value).slice(0, 40));
  }
  const many = Array.from({ length: 101 }, (_, i) => ({ id: i.toString(16).padStart(24, '0'), quantity: 1 }));
  assert.equal(decodeCartCookie(many.map(line => `${line.id}_1`).join('.')), null);
  // Carts too large for a cookie fall back to client loading instead of being truncated.
  assert.equal(encodeCartCookie(Array.from({ length: 100 }, (_, i) => ({ id: i.toString(16).padStart(24, '0'), quantity: 999 }))) !== null, true);
});
