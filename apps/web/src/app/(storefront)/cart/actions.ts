"use server";
import { getLocale } from '../../../lib/server/i18n';
import { t } from '../../../lib/i18n';
import { readCart, validateCartAddition } from '../../../lib/server/cart';
import { cartSchema, type CartLine } from '../../../lib/catalog/model';
export async function loadCart(lines: CartLine[]) {
  const locale = await getLocale();
  const parsed = cartSchema.safeParse(lines);
  if (!parsed.success) return { error: t(locale,'cartReadServerError'), items: [] };
  try { return { error: null, items: await readCart(parsed.data, locale) }; }
  catch { return { error: t(locale,'cartCheckServerError'), items: [] }; }
}
export async function checkAddition(id: string, quantity: number) {
  const locale = await getLocale();
  try { return await validateCartAddition(id, quantity, locale); }
  catch { return t(locale,'cartCheckStockError'); }
}
