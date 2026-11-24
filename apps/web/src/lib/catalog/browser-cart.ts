"use client";
import { decodeStoredCart, cartLines, type CartLine } from '../browser-validation';
import { writeCartCookie } from './cart-cookie';
const key = 'almina.cart.v1';
let decoded: { raw: string | null; legacy: boolean; lines: CartLine[] } | undefined;
export function storedCart() {
  const raw = localStorage.getItem(key);
  const legacy = raw === null;
  const value = legacy ? localStorage.getItem('cartItems') : raw;
  // Every rendered product card reads the same snapshot after a cart change.
  if (!decoded || decoded.raw !== value || decoded.legacy !== legacy) {
    decoded = { raw: value, legacy, lines: decodeStoredCart(value, legacy) };
  }
  return decoded.lines;
}
export function saveCart(lines: CartLine[]) {
  const valid = cartLines(lines);
  if (!valid) throw new Error('Invalid cart');
  localStorage.setItem(key, JSON.stringify(valid));
  try { writeCartCookie(valid); } catch { /* The cookie only speeds up the cart page's first paint. */ }
  window.dispatchEvent(new Event('almina-cart-change'));
}
