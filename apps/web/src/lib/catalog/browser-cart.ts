"use client";
import { decodeStoredCart, cartSchema, type CartLine } from './model';
const key = 'almina.cart.v1';
export function storedCart() {
  const raw = localStorage.getItem(key);
  return raw !== null ? decodeStoredCart(raw) : decodeStoredCart(localStorage.getItem('cartItems'), true);
}
export function saveCart(lines: CartLine[]) {
  localStorage.setItem(key, JSON.stringify(cartSchema.parse(lines)));
  window.dispatchEvent(new Event('almina-cart-change'));
}
