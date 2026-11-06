'use client';
import { useEffect, useState } from 'react';
import Link from '../app-link';
import { wholesaleRequest } from '../wholesale/request';
import type { ProductAudience } from './product-audience';
import { type TradeType, type TradeTerms, type ProductTrade, type TradePriceDraft } from '../../lib/admin/product-pricing';
export { productTradeTerms, type ProductTrade, type TradeType, type TradeTerms, type TradePriceDraft } from '../../lib/admin/product-pricing';
const draftPrices = (terms: TradeTerms) => terms.prices.map(({ unitPriceMinor, ...price }) => ({ ...price, unitPrice: (unitPriceMinor / 100).toFixed(2) }));
export function useProductTrade(productId: string | undefined, audience: ProductAudience | undefined) {
  const [trade, setTrade] = useState<ProductTrade>({ retail: audience?.audience !== 'wholesale', wholesale: false, ready: !audience, error: '', types: [], prices: [], revision: 0, dirty: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!audience) return;
    let active = true;
    void Promise.all([wholesaleRequest<TradeType[]>('admin/types'), productId ? wholesaleRequest<TradeTerms>('admin/terms?' + new URLSearchParams({ productId })) : Promise.resolve({ data: { productId: '', enabled: false, prices: [], revision: 0 } as TradeTerms })])
      .then(([types, terms]) => { if (active) setTrade({ retail: audience.audience !== 'wholesale', wholesale: audience.audience !== 'retail' && terms.data.enabled, types: types.data, prices: draftPrices(terms.data), revision: terms.data.revision, savedPrices: terms.data.prices, ready: true, error: '', dirty: false }); })
      .catch(() => { if (active) setTrade(current => ({ ...current, ready: false, error: 'Channel pricing could not load. Retry before editing to preserve saved rates.' })); });
    return () => { active = false; };
    // The editor remounts on a product change; ordinary server refreshes must not discard unsaved pricing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, attempt]);
  return { trade, setTrade, reload: () => { setTrade(current => ({ ...current, error: '' })); setAttempt(value => value + 1); }, saved: (terms: TradeTerms) => setTrade(current => ({ ...current, revision: terms.revision, savedPrices: terms.prices, prices: draftPrices(terms), dirty: false })) };
}
export function ProductChannels({ trade, onChange, reload }: { trade: ProductTrade; onChange: (value: ProductTrade) => void; reload: () => void }) {
  return <section className="admin-form__section product-channels"><div className="admin-form__heading"><div><h2>Sales channels</h2><p>Enable a channel to set its prices.</p></div></div>
    <div className="product-channel-switches">{(['retail', 'wholesale'] as const).map(channel => <button type="button" role="switch" aria-label={channel === 'retail' ? 'Retail' : 'Wholesale'} key={channel} aria-checked={trade[channel]} disabled={!trade.ready} onClick={() => onChange({ ...trade, [channel]: !trade[channel], dirty: true, ...(channel === 'wholesale' && !trade.wholesale && !trade.prices.length && trade.types.filter(type => type.active).length === 1 ? { prices: [{ typeId: trade.types.find(type => type.active)!.id, unitPrice: '', minimumQuantity: 1, quantityMultiple: 1, maximumQuantity: 1000 }] } : {}) })} className="admin-switch"><span className="admin-switch__text"><strong>{channel === 'retail' ? 'Retail' : 'Wholesale'}</strong><span>{channel === 'retail' ? 'Public storefront' : 'Approved businesses'}</span></span><span className="admin-switch__track" aria-hidden="true" /></button>)}</div>
    {!trade.ready ? <p role="status">{trade.error || 'Loading saved channel prices…'} {trade.error ? <button type="button" className="admin-btn--secondary" onClick={reload}>Retry channel pricing</button> : null}</p> : !trade.retail && !trade.wholesale ? <p role="alert" className="admin-form__note--warning">Enable at least one sales channel.</p> : null}
    <input type="hidden" name="audience" value={trade.retail && trade.wholesale ? 'all' : trade.wholesale ? 'wholesale' : 'retail'} />
  </section>;
}
export function WholesalePrices({ trade, onChange }: { trade: ProductTrade; onChange: (value: ProductTrade) => void }) {
  const types = [...trade.types, ...trade.prices.filter(price => !trade.types.some(type => type.id === price.typeId)).map(price => ({ id: price.typeId, name: `Saved business type (${price.typeId})`, active: false, allowMedicines: false, revision: 0 }))];
  const patch = (typeId: string, values: Partial<TradePriceDraft>) => onChange({ ...trade, dirty: true, prices: trade.prices.map(price => price.typeId === typeId ? { ...price, ...values } : price) });
  return <fieldset className="product-wholesale-prices admin-form-lock" hidden={!trade.wholesale} disabled={!trade.wholesale}>
    <h3>Wholesale prices</h3><p className="admin-card__hint">Set a unit price for each business type you supply. Stock is shared with retail.</p>
    {!types.length ? <p role="status">Create a <Link href="/admin/wholesale">wholesale business type</Link> before adding rates.</p> : null}
    {types.map(type => { const price = trade.prices.find(price => price.typeId === type.id); return <div className="product-trade-row" key={type.id}>
      <label className="admin-option"><input type="checkbox" aria-label={`Set wholesale price for ${type.name}`} checked={Boolean(price)} onChange={event => onChange({ ...trade, dirty: true, prices: event.target.checked ? [...trade.prices, { typeId: type.id, unitPrice: '', minimumQuantity: 1, quantityMultiple: 1, maximumQuantity: 1000 }] : trade.prices.filter(price => price.typeId !== type.id) })} />{type.name}{type.active ? '' : ' · paused'}</label>
      {price ? <div className="admin-form__grid"><label className="admin-field">Wholesale price — {type.name} (AED)<input type="number" min="0.01" max="1000000" step="0.01" required={trade.wholesale} value={price.unitPrice} onChange={event => patch(type.id, { unitPrice: event.target.value })} /></label><div className="product-quantity-fields">{(['minimumQuantity', 'quantityMultiple', 'maximumQuantity'] as const).map(key => <label className="admin-field" key={key}>{{ minimumQuantity: 'Minimum order', quantityMultiple: 'Case multiple', maximumQuantity: 'Maximum order' }[key]}<input type="number" min={1} max={1000} required={trade.wholesale} value={price[key]} onChange={event => patch(type.id, { [key]: Number(event.target.value) })} /></label>)}</div></div> : null}
    </div>; })}
  </fieldset>;
}
