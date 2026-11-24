import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { cartCookieName, decodeCartCookie } from '../catalog/cart-cookie';

/** Quantities from the cookie copy of the device cart, so product tiles render their "Add"/stepper state on the server
 *  (no swap and no layout shift after hydration). localStorage remains the source of truth once the page is live. */
export const cartQuantities = cache(async () => {
  const lines = decodeCartCookie((await cookies()).get(cartCookieName)?.value) ?? [];
  return new Map(lines.map(line => [line.id, line.quantity]));
});
