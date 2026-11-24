// A compact copy of the device cart (product ids and quantities only) so the cart page can render real lines on the server.
// localStorage stays the source of truth; the browser rewrites this on every save and reconciles on mount. Nothing here is trusted
// for price, stock or totals: the server reads current catalogue data for each id, and checkout recalculates everything.
import { cartLines, type CartLine } from '../browser-validation';

export const cartCookieName = 'almina_cart';
/** Comfortably under the 4 KB cookie limit; larger carts simply fall back to client loading. */
export const cartCookieMaxLength = 3200;

export function encodeCartCookie(lines: CartLine[]): string | null {
  if (!lines.length) return null;
  const value = lines.map(line => `${line.id}_${line.quantity}`).join('.');
  return value.length <= cartCookieMaxLength ? value : null;
}

export function decodeCartCookie(value: string | undefined | null): CartLine[] | null {
  if (!value || value.length > cartCookieMaxLength || !/^[a-f0-9]{24}_\d{1,3}(\.[a-f0-9]{24}_\d{1,3})*$/i.test(value)) return null;
  return cartLines(value.split('.').map(part => { const [id, quantity] = part.split('_'); return { id, quantity: Number(quantity) }; }));
}

/** Browser only: mirror the saved cart into the cookie (or clear it). */
export function writeCartCookie(lines: CartLine[]) {
  const value = encodeCartCookie(lines);
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = value
    ? `${cartCookieName}=${value}; Path=/; Max-Age=2592000; SameSite=Lax${secure}`
    : `${cartCookieName}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}
