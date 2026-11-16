"use client";
import { CurrencyAmount } from './currency-amount';
import { DeliveryProgress } from './delivery-progress';
import { ReminderSignup } from './customer-reminders';
import { useEffect, useState, type ReactNode } from 'react';
import Link from './app-link';
import { ProductImage } from './product-image';
import { recordCommerceEvent } from '../lib/telemetry/browser';
import { loadCart, checkAddition } from '../app/(storefront)/cart/actions';
import { type CartLine } from '../lib/catalog/model';
import { Icon } from './icon';
import { storedCart, saveCart } from '../lib/catalog/browser-cart';
import { t, tf, itemCountText, type Locale } from '../lib/i18n';
type Items = Awaited<ReturnType<typeof loadCart>>['items'];
export function CartView({ checkout = false, recommendations, cloudName, locale = 'en', orderingEnabled = true }: { orderingEnabled?: boolean; checkout?: boolean; recommendations?: ReactNode; cloudName?: string | undefined; locale?: Locale }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [items, setItems] = useState<Items>([]);
  const [subtotalMinor, setSubtotalMinor] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    let revision = 0;
    async function refresh() {
      const current = ++revision;
      try {
        const next = storedCart();
        const result = await loadCart(next);
        if (!active || current !== revision) return;
        setLines(next); setItems(result.items); setSubtotalMinor(result.subtotalMinor); setError(result.error ?? ''); setReady(true);
      } catch { if (active) { setError(t(locale, 'cartReadError')); setReady(true); } }
    }
    void refresh();
    window.addEventListener('storage', refresh); window.addEventListener('almina-cart-change', refresh);
    return () => { active = false; window.removeEventListener('storage', refresh); window.removeEventListener('almina-cart-change', refresh); };
  }, [retry, locale]);
  async function change(id: string, quantity: number) {
    setPending(true); setError('');
    try {
      const latest = storedCart();
      if (quantity > 0) {
        const message = await checkAddition(id, quantity);
        if (message) { setError(message); return; }
      }
      if (JSON.stringify(latest) !== JSON.stringify(storedCart())) { setError(t(locale, 'cartChanged')); return; }
      saveCart(quantity === 0 ? latest.filter(line => line.id !== id) : latest.map(line => line.id === id ? { id, quantity } : line));
      recordCommerceEvent('cart_updated');
    } catch { setError(t(locale, 'cartSaveError')); }
    finally { setPending(false); }
  }
  if (!ready) return <div className="empty-state"><p role="status">{t(locale, 'cartLoading')}</p><div aria-hidden="true" className="skeleton skeleton-line" /></div>;
  const ar = locale === 'ar';
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const count = `${itemCountText(locale, quantity)} · ${itemCountText(locale, items.length, 'product')}`;
  const nextLabel = orderingEnabled ? t(locale, 'cartProceed') : ar ? 'معلومات الطلب' : 'Ordering information';
  const quoteNote = orderingEnabled && !checkout ? t(locale, 'cartSummaryNote') : ar ? 'الطلب عبر الإنترنت غير متاح حالياً. سلتك محفوظة؛ تواصل مع الصيدلية للاستفسار.' : 'Online ordering is currently unavailable. Your cart is saved; contact the pharmacy for enquiries.';
  const nextAction = <Link className="checkout-link" href="/checkout">{nextLabel}<Icon name="arrow" /></Link>;
  return <>
    {error ? <div className="notice error-notice"><p role="alert">{error}</p><p>{t(locale, 'cartSavedNotRemoved')}</p><button type="button" className="button-secondary" onClick={() => { setReady(false); setRetry(value => value + 1); }}>{t(locale, 'cartTryAgain')}</button></div> : null}
    {!lines.length && !error ? <><div className="cart-empty rounded-2xl bg-subtle p-5 md:p-8"><h2>{t(locale, 'cartEmptyTitle')}</h2><p>{t(locale, 'cartEmptyBody')}</p><Link className="button" href="/products">{t(locale, 'cartStartShopping')}<Icon name="arrow" /></Link></div>{recommendations}</> : items.length ? <>
      <p className="cart-count text-sm text-muted">{count}</p>
      <DeliveryProgress locale={locale} lines={lines} />
      <div className="cart-layout">
        <div className="cart-left min-w-0"><h2 className="cart-list-heading">{t(locale, 'cartYourItems')}</h2><div className="cart-items grid gap-3">
          {items.map(item => <article className="cart-item" key={item.id}>
            <Link className="cart-item-image" href={item.href} tabIndex={-1} aria-hidden="true"><ProductImage cloudName={cloudName} className="aspect-square h-auto w-full object-contain" src={item.image} alt="" width={90} height={90} sizes="(max-width:767px) 64px, 90px" /></Link>
            <div className="cart-item-description"><Link className="cart-item-name" href={item.href}>{item.name}</Link>{item.variantLabel ? <p className="text-xs text-muted">{item.variantLabel}</p> : null}<p className={`cart-availability text-xs ${item.available ? 'text-teal' : 'text-warning'}`}>{t(locale, item.available ? 'cartInStock' : 'cartUnavailableQuantity')}</p>
              <p className="cart-unit-price">{item.price === null ? t(locale, 'cartUnavailable') : <CurrencyAmount value={item.price} locale={locale} />} <span>{t(locale, 'cartPerItem')}</span></p>
            </div>
            {!checkout ? <button type="button" className="cart-remove" aria-label={tf(locale, 'cartRemoveAria', { name: item.name })} disabled={pending} onClick={() => change(item.id, 0)}><Icon name="close" /></button> : null}
            <div className="cart-item-actions">
              {!checkout ? <div className="quantity-control"><button type="button" aria-label={tf(locale, 'cartDecreaseAria', { name: item.name })} disabled={pending || item.quantity <= 1} onClick={() => change(item.id, item.quantity - 1)}><Icon name="minus" /></button><output className="quantity" aria-label={tf(locale, 'cartQuantityAria', { name: item.name, count: item.quantity })}>{item.quantity}</output><button type="button" aria-label={tf(locale, 'cartIncreaseAria', { name: item.name })} disabled={pending || item.quantity >= 999} onClick={() => change(item.id, item.quantity + 1)}><Icon name="plus" /></button></div> : <span>{ar ? `الكمية: ${item.quantity}` : `Quantity: ${item.quantity}`}</span>}
              <div className="cart-line-total"><span>{ar ? 'إجمالي المنتجات في هذا السطر' : 'Line subtotal'}</span>{item.lineTotalMinor === null ? t(locale, 'cartUnavailable') : <CurrencyAmount value={item.lineTotalMinor / 100} locale={locale} />}</div>
            </div>
          </article>)}
        </div></div>
        <aside className="cart-summary"><h2>{t(locale, 'cartOrderSummary')}</h2>
          <dl><dt>{ar ? 'القطع / المنتجات المختلفة' : 'Items / distinct products'}</dt><dd>{quantity} / {items.length}</dd><dt>{ar ? 'إجمالي المنتجات التقديري' : 'Estimated merchandise subtotal'}</dt><dd className="cart-subtotal">{subtotalMinor === null ? t(locale, 'cartUnavailable') : <CurrencyAmount value={subtotalMinor / 100} locale={locale} />}</dd><dt>{t(locale, 'cartDeliveryRow')}</dt><dd>{orderingEnabled && !checkout ? t(locale, 'cartAtCheckout') : ar ? 'لم يتم احتسابها' : 'Not quoted'}</dd></dl>
          <p className="cart-summary-note">{ar ? 'هذا تقدير لأسعار المنتجات الحالية، وليس إجمالياً نهائياً يشمل التوصيل والضريبة.' : 'Based on current catalogue prices. This is not a final delivery/tax quote.'}</p><p className="cart-summary-note">{quoteNote}</p>
          {!checkout ? <div className="cart-desktop-action">{nextAction}</div> : <Link className="button button-secondary" href="/cart">{t(locale, 'cartEditCart')}</Link>}
          <Link className="cart-continue" href="/products">{t(locale, 'cartContinueShopping')}</Link>
          <div className="cart-support"><h3>{t(locale, 'cartSupportTitle')}</h3><Link href="/contact">{t(locale, 'cartContactPharmacy')}<Icon name="arrow" /></Link></div>
        </aside>
      </div>
      {!checkout && items.every(item => item.reminderEligible) ? <ReminderSignup locale={locale} items={lines} /> : null}
      {recommendations}
      {!checkout ? <div className="cart-mobile-bar"><div><span>{ar ? 'إجمالي المنتجات التقديري' : 'Estimated merchandise subtotal'}</span><strong>{subtotalMinor === null ? t(locale, 'cartUnavailable') : <CurrencyAmount value={subtotalMinor / 100} locale={locale} />}</strong></div>{nextAction}</div> : null}
    </> : null}
  </>;
}
