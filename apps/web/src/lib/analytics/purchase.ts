import { track } from './client';

type Totals = { totalMinor: number; lines: readonly { quantity: number }[] };

/** Order value and size only: no order number, products or customer details. */
export function purchaseDetails(totals: Totals, payment: string) {
  return { value_aed: totals.totalMinor / 100, item_count: totals.lines.reduce((sum, line) => sum + line.quantity, 0), payment_method: payment };
}

/** The card return page re-reads payment status, so each paid order is counted once per tab. The order number stays on the device. */
export function trackCardPurchase(orderId: string, totals: Totals) {
  const key = `almina.analytics.counted.${orderId}`;
  try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); } catch { /* Count without the guard. */ }
  track('checkout_confirmed', purchaseDetails(totals, 'stripe'));
}
