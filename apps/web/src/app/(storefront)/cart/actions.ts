"use server";
import { readCart, validateCartAddition } from '../../../lib/server/cart';
import { cartSchema, type CartLine } from '../../../lib/catalog/model';
export async function loadCart(lines: CartLine[]) {
  const parsed = cartSchema.safeParse(lines);
  if (!parsed.success) return { error: 'Your cart could not be read.', items: [] };
  try { return { error: null, items: await readCart(parsed.data) }; }
  catch { return { error: 'Unable to check your cart. Please try again.', items: [] }; }
}
export async function checkAddition(id: string, quantity: number) {
  try { return await validateCartAddition(id, quantity); }
  catch { return 'Unable to check stock. Please try again.'; }
}
