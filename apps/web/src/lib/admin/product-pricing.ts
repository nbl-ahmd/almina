import { wholesaleTermsSchema, type wholesaleTypeSchema, type WholesalePrice } from '@almina/contracts';
import type { z } from 'zod';
export type TradeType = z.infer<typeof wholesaleTypeSchema>;
export type TradeTerms = z.infer<typeof wholesaleTermsSchema>;
export type TradePriceDraft = Omit<WholesalePrice, 'unitPriceMinor'> & { unitPrice: string };
export type ProductTrade = { retail: boolean; wholesale: boolean; ready: boolean; error: string; types: TradeType[]; prices: TradePriceDraft[]; revision: number; dirty: boolean; savedPrices?: WholesalePrice[] };
export function productTradeTerms(draft: ProductTrade, productId: string): TradeTerms {
  if (!draft.ready) throw Error('Load channel pricing before saving.');
  if (!draft.retail && !draft.wholesale) throw Error('Enable retail, wholesale, or both.');
  if (draft.wholesale && !draft.prices.length) throw Error('Add a wholesale price for at least one business type.');
  const prices = !draft.wholesale ? (draft.savedPrices ?? []) : draft.prices.map(({ unitPrice, ...price }) => {
    if (!/^\d{1,7}(\.\d{1,2})?$/.test(unitPrice)) throw Error('Enter each wholesale price in AED with up to two decimal places.');
    const [whole, fraction = ''] = unitPrice.split('.');
    return { ...price, unitPriceMinor: Number(whole) * 100 + Number(fraction.padEnd(2, '0')) };
  });
  const parsed = wholesaleTermsSchema.safeParse({ productId, enabled: draft.wholesale, prices, revision: draft.revision });
  if (!parsed.success) throw Error('Check wholesale prices and quantities. Prices must be positive; minimum quantities must match the case multiple and maximum.');
  return parsed.data;
}
