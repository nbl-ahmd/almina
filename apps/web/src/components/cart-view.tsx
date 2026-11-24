"use client";
import { CartCoupon } from './cart-coupon';
import { DeliveryProgress } from './delivery-progress';
import { DeliveryRow } from './delivery-row';
import { ReminderSignup } from './customer-reminders';
import { useEffect, useState, type ReactNode } from 'react';
import Link from './app-link';
import { ProductImage } from './product-image';
import { recordCommerceEvent } from '../lib/telemetry/browser';
import { loadCart, checkAddition } from '../app/(storefront)/cart/actions';
import { money, type CartLine } from '../lib/catalog/model';
import { Icon } from './storefront-icon';
import { storedCart, saveCart } from '../lib/catalog/browser-cart';
import { t, tf, itemCountText, type Locale } from '../lib/i18n';
type Items = Awaited<ReturnType<typeof loadCart>>['items'];
export function CartView({ checkout = false, recommendations, cloudName, locale = 'en' }: { checkout?: boolean; recommendations?: ReactNode; cloudName?: string | undefined; locale?: Locale }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [items, setItems] = useState<Items>([]);
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
        setLines(next); setItems(result.items); setError(result.error ?? ''); setReady(true);
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
  const itemsTotal = items.length && items.every(item => item.price !== null) ? items.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0) : null;
  if (!ready) return <div className="empty-state">{!checkout ? <h1>{t(locale, 'cartPageTitle')}</h1> : null}<p role="status">{t(locale, 'cartLoading')}</p><div aria-hidden="true" className="skeleton skeleton-line" /></div>;
  return <>{!checkout && !items.length ? <h1>{t(locale, 'cartPageTitle')}</h1> : null}{error ? <div className="notice error-notice"><p role="alert">{error}</p><p>{t(locale, 'cartSavedNotRemoved')}</p><button type="button" className="button-secondary" onClick={() => { setReady(false); setRetry(value => value + 1); }}>{t(locale, 'cartTryAgain')}</button></div> : null}
    {!lines.length && !error ? <><div className="grid items-center gap-5 overflow-hidden rounded-2xl p-5 md:grid-cols-2 md:p-8"><div><h2 className="mb-3 text-2xl font-semibold md:text-3xl">{t(locale, 'cartEmptyTitle')}</h2><p className="mb-5 text-sm leading-6">{t(locale, 'cartEmptyBody')}</p><Link className="button rounded-full text-sm" href="/products">{t(locale, 'cartStartShopping')} <Icon name="arrow" /></Link></div></div>{recommendations}</> : items.length ? <>
      {!checkout ? <div className="cart-active-heading"><div className="cart-title-count"><h1>{t(locale, 'cartPageTitle')}</h1><span>{itemCountText(locale, items.length, 'product')}</span></div></div> : null}
      {!checkout ? <DeliveryRow locale={locale} /> : null}<DeliveryProgress locale={locale} lines={lines} />{!checkout && items.every(item => item.reminderEligible) ? <ReminderSignup locale={locale} items={lines} /> : null}<div className="cart-layout grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_300px] lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] lg:gap-8"><div className="cart-left min-w-0"><h2 className="sr-only">{t(locale, 'cartYourItems')}</h2><div className="pf-card py-1"><ul className="cart-items pf-lines m-0 list-none">
      {items.map(item => { const lineTotal = item.price === null ? null : item.price * item.quantity; return <li className="cart-item pf-line" key={item.id}>
        <Link className="pf-thumb row-span-2" href={item.href} tabIndex={-1} aria-hidden="true"><ProductImage locale={locale} cloudName={cloudName} className="size-full object-contain p-1.5" src={item.image} alt="" width={90} height={90} sizes="(max-width: 899px) 64px, 88px" /></Link>
        <div className="min-w-0"><Link className="pf-line-name inline-flex min-h-11 items-start" href={item.href}>{item.name}</Link>{item.variantLabel ? <p className="pf-muted">{item.variantLabel}</p> : null}{!item.available ? <p className="cart-availability pf-muted text-[var(--color-error)]" role="status">{t(locale, 'cartUnavailableQuantity')}</p> : <p className="cart-item-available pf-muted">{t(locale, 'cartInStock')}</p>}</div>
        <p className="pf-line-total m-0">{lineTotal === null ? t(locale, 'cartUnavailable') : money(lineTotal)}</p>
        {!checkout ? <div className="cart-item-actions col-start-2 -col-end-1 flex flex-wrap items-center justify-between gap-2">
          <div className="quantity-control rounded-full border bg-white"><button className="size-11 rounded-none bg-transparent" type="button" aria-label={tf(locale, 'cartDecreaseAria', { name: item.name })} disabled={pending || item.quantity <= 1} onClick={() => change(item.id, item.quantity - 1)}><Icon name="minus" /></button><output className="quantity min-w-8 text-sm font-semibold" aria-label={tf(locale, 'cartQuantityAria', { name: item.name, count: item.quantity })}>{item.quantity}</output><button className="size-11 rounded-none bg-transparent" type="button" aria-label={tf(locale, 'cartIncreaseAria', { name: item.name })} disabled={pending || item.quantity >= 999} onClick={() => change(item.id, item.quantity + 1)}><Icon name="plus" /></button></div>
          <p className="cart-unit-price pf-muted m-0">{item.price === null ? t(locale, 'cartUnavailable') : money(item.price)}{' '}<span>{t(locale, 'cartPerItem')}</span></p>
          <button type="button" className="remove-button pf-link-button" aria-label={tf(locale, 'cartRemoveAria', { name: item.name })} disabled={pending} onClick={() => change(item.id, 0)}>{locale === 'ar' ? 'إزالة' : 'Remove'}</button>
        </div> : <p className="cart-item-actions pf-muted col-start-2 -col-end-1 m-0">{tf(locale, 'cartCheckoutLine', { price: item.price === null ? t(locale, 'cartUnavailable') : money(item.price), quantity: item.quantity })}</p>}
      </li>; })}
      </ul></div></div>
      <aside className="cart-summary pf-card min-w-0 md:sticky md:top-6"><h2 className="pf-card-title">{t(locale, 'cartOrderSummary')}</h2>
        <dl className="pf-bill"><dt>{locale === 'ar' ? 'إجمالي المنتجات' : 'Item total'} <span className="pf-muted">· {itemCountText(locale, items.reduce((sum, item) => sum + item.quantity, 0), 'item')}</span></dt><dd>{itemsTotal === null ? t(locale, 'cartAtCheckout') : money(itemsTotal)}</dd><dt>{t(locale, 'cartDeliveryRow')}</dt><dd>{t(locale, 'cartAtCheckout')}</dd><dt>{t(locale, 'cartVatRow')}</dt><dd>{t(locale, 'cartAtCheckout')}</dd></dl>
        {!checkout && !error && <CartCoupon lines={lines} locale={locale} />}<p className="pf-muted flex items-start gap-2"><Icon name="check" /><span>{t(locale, 'cartSummaryNote')}</span></p>
        {!checkout ? <><Link className="checkout-link inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-white transition-colors motion-safe:active:scale-[0.99]" href="/checkout">{t(locale, 'cartProceed')} <Icon name="arrow" /></Link><Link className="cart-continue flex min-h-11 items-center justify-center text-xs" href="/products">{t(locale, 'cartContinueShopping')}</Link><div className="cart-mobile-bar mobile-action-bar md:hidden"><div className="pf-bar"><span className="pf-bar-total"><small>{locale === 'ar' ? 'إجمالي المنتجات' : 'Item total'}</small><strong>{itemsTotal === null ? '—' : money(itemsTotal)}</strong></span><Link className="checkout-link inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold text-white transition-colors motion-safe:active:scale-[0.99]" href="/checkout">{t(locale, 'cartProceed')} <Icon name="arrow" /></Link></div></div></> : <Link className="button button-secondary mt-3 w-full rounded-full" href="/cart">{t(locale, 'cartEditCart')}</Link>}
</aside><div className="cart-after"><div className="mt-5 flex items-start gap-3 rounded-2xl p-4"><Icon name="phone" /><div><h2 className="mb-1 text-sm font-semibold">{t(locale, 'cartHelpTitle')}</h2><p className="mb-1 text-xs leading-5">{t(locale, 'cartHelpBody')}</p><Link href="/contact" className="inline-flex min-h-11 items-center text-sm font-medium">{t(locale, 'cartContactPharmacy')} <Icon name="arrow" /></Link></div></div>{recommendations}</div></div></> : null}</>;
}
