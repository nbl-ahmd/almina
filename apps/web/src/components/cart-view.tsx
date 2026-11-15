"use client";
import { DeliveryProgress } from './delivery-progress';
import { ReminderSignup } from './customer-reminders';
import { useEffect, useState, type ReactNode } from 'react';
import Link from './app-link';
import { ProductImage } from './product-image';
import { recordCommerceEvent } from '../lib/telemetry/browser';
import { loadCart, checkAddition } from '../app/(storefront)/cart/actions';
import { money, type CartLine } from '../lib/catalog/model';
import { Icon } from './icon';
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
  if (!ready) return <div className="empty-state"><p role="status">{t(locale, 'cartLoading')}</p><div aria-hidden="true" className="skeleton skeleton-line" /></div>;
  return <>{error ? <div className="notice error-notice"><p role="alert">{error}</p><p>{t(locale, 'cartSavedNotRemoved')}</p><button type="button" className="button-secondary" onClick={() => { setReady(false); setRetry(value => value + 1); }}>{t(locale, 'cartTryAgain')}</button></div> : null}
    {!lines.length && !error ? <><div className="grid items-center gap-5 overflow-hidden rounded-2xl bg-subtle p-5 md:grid-cols-2 md:p-8"><div><h2 className="mb-3 text-2xl font-semibold md:text-3xl">{t(locale, 'cartEmptyTitle')}</h2><p className="mb-5 text-sm leading-6 text-muted">{t(locale, 'cartEmptyBody')}</p><Link className="button rounded-full text-sm" href="/products">{t(locale, 'cartStartShopping')} <Icon name="arrow" /></Link></div><div className="flex min-h-32 items-center justify-center text-teal [&_.icon]:size-16" aria-hidden="true"><Icon name="bag" /></div></div>{recommendations}</> : items.length ? <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-accent px-4 py-3"><p className="m-0 text-sm font-medium">{t(locale, 'cartReadyBanner')}</p><span className="text-xs text-muted">{locale==='ar'?`${itemCountText(locale,items.length,'product')} في السلة`:tf(locale, 'cartItemsInCart', { count: items.length, unit: t(locale,items.length===1?'cartProductOne':'cartProductOther') })}</span></div>
      <DeliveryProgress locale={locale} lines={lines} />{!checkout && items.every(item => item.reminderEligible) ? <ReminderSignup locale={locale} items={lines} /> : null}<div className="cart-layout grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_300px] lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] lg:gap-8"><div className="cart-left min-w-0"><div className="cart-list-heading mb-3 flex items-center justify-between gap-3"><h2 className="m-0 text-lg font-bold">{t(locale, 'cartYourItems')}</h2><Link className="inline-flex min-h-11 items-center text-xs text-ocean" href="/products">{t(locale, 'cartContinueShopping')}</Link></div><div className="cart-items grid gap-3">
      {items.map(item => <article className="cart-item relative grid grid-cols-[64px_minmax(0,1fr)] gap-3 rounded-2xl border border-border bg-surface p-3 lg:grid-cols-[92px_minmax(0,1fr)] lg:gap-x-5 lg:rounded-2xl lg:p-4" key={item.id}><Link className="cart-item-image block self-start overflow-hidden rounded-[14px] bg-page p-1.5 lg:row-span-2" href={item.href} tabIndex={-1} aria-hidden="true"><ProductImage cloudName={cloudName} className="aspect-square h-auto w-full object-contain" src={item.image} alt="" width={90} height={90} sizes="(max-width: 767px) 64px, 90px" /></Link><div className="cart-item-description min-w-0 pr-7"><Link className="inline-flex min-h-11 items-start text-sm leading-snug font-bold text-ink wrap-anywhere md:text-base" href={item.href}>{item.name}</Link>{item.variantLabel ? <p className="mb-1 text-xs text-ocean">{item.variantLabel}</p> : null}{!item.available ? <p className="cart-availability mb-0 text-xs text-warning" role="status">{t(locale, 'cartUnavailableQuantity')}</p> : <span className="cart-item-available mt-1 flex w-fit rounded-full bg-subtle px-2 py-0.5 text-xs text-ocean">{t(locale, 'cartInStock')}</span>}</div>
        {!checkout ? <><button type="button" className="remove-button absolute right-1 top-1 flex size-11 items-center justify-center border-0 bg-transparent p-2 text-muted no-underline hover:bg-subtle hover:text-ink" aria-label={tf(locale, 'cartRemoveAria', { name: item.name })} disabled={pending} onClick={() => change(item.id, 0)}><Icon name="close" /></button><div className="cart-item-actions col-span-full flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5 lg:col-start-2"><div className="quantity-control rounded-full border-border bg-white"><button className="size-11 rounded-none bg-transparent" type="button" aria-label={tf(locale, 'cartDecreaseAria', { name: item.name })} disabled={pending || item.quantity <= 1} onClick={() => change(item.id, item.quantity - 1)}><Icon name="minus" /></button><output className="quantity min-w-8 text-sm" aria-label={tf(locale, 'cartQuantityAria', { name: item.name, count: item.quantity })}>{item.quantity}</output><button className="size-11 rounded-none bg-transparent" type="button" aria-label={tf(locale, 'cartIncreaseAria', { name: item.name })} disabled={pending || item.quantity >= 999} onClick={() => change(item.id, item.quantity + 1)}><Icon name="plus" /></button></div><p className="cart-unit-price m-0 text-right text-base font-bold tabular-nums">{item.price === null ? t(locale, 'cartUnavailable') : money(item.price)}{' '}<span className="ml-1 text-xs font-normal text-ocean">{t(locale, 'cartPerItem')}</span></p></div></> : <p className="cart-item-actions col-span-full m-0 text-sm lg:col-start-2">{tf(locale, 'cartCheckoutLine', { price: item.price === null ? t(locale, 'cartUnavailable') : money(item.price), quantity: item.quantity })}</p>}</article>)}
      </div><div className="mt-5 flex items-start gap-3 rounded-2xl bg-page p-4"><Icon name="phone" /><div><h2 className="mb-1 text-sm font-semibold">{t(locale, 'cartHelpTitle')}</h2><p className="mb-1 text-xs leading-5 text-muted">{t(locale, 'cartHelpBody')}</p><Link href="/contact" className="inline-flex min-h-11 items-center text-sm font-medium text-teal">{t(locale, 'cartContactPharmacy')} <Icon name="arrow" /></Link></div></div>{recommendations}</div>
      <aside className="cart-summary min-w-0 rounded-2xl border border-border bg-surface p-4 md:sticky md:top-6 md:p-6"><h2 className="mb-5 border-b border-border pb-3 text-lg font-bold">{t(locale, 'cartOrderSummary')}</h2><dl className="m-0 grid grid-cols-[minmax(0,1fr)_auto] gap-4 text-sm [&_dd]:m-0 [&_dd]:text-right [&_dd]:font-semibold"><dt>{t(locale, 'cartProductsRow')}</dt><dd>{items.length}</dd><dt>{t(locale, 'cartDeliveryRow')}</dt><dd>{t(locale, 'cartAtCheckout')}</dd><dt>{t(locale, 'cartVatRow')}</dt><dd>{t(locale, 'cartAtCheckout')}</dd></dl><div className="cart-summary-note my-5 flex items-start gap-2 rounded-[14px] border border-border bg-page p-3 text-xs leading-relaxed text-muted"><Icon name="check" /><p className="m-0">{t(locale, 'cartSummaryNote')}</p></div>
        {!checkout ? <><Link className="checkout-link inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-ocean motion-safe:active:scale-[0.99]" href="/checkout">{t(locale, 'cartProceed')} <Icon name="arrow" /></Link><Link className="cart-continue mt-2 flex min-h-11 items-center justify-center text-xs text-ocean" href="/products">{t(locale, 'cartContinueShopping')}</Link><div className="cart-mobile-bar mobile-action-bar md:hidden"><Link className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-ocean motion-safe:active:scale-[0.99]" href="/checkout">{t(locale, 'cartProceed')} <Icon name="arrow" /></Link><p className="mt-1.5 mb-0 text-center text-xs leading-4 text-ocean">{t(locale, 'cartMobileNote')}</p></div></> : <Link className="button button-secondary mt-3 w-full rounded-full" href="/cart">{t(locale, 'cartEditCart')}</Link>}
        <div className="cart-support mt-5 border-t border-border pt-4"><h3 className="mb-2 text-sm font-semibold">{t(locale, 'cartSupportTitle')}</h3><p className="text-xs leading-relaxed text-ocean">{t(locale, 'cartSupportBody')}</p><Link className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-ocean" href="/contact">{t(locale, 'cartContactPharmacy')} <Icon name="arrow" /></Link></div>
      </aside></div></> : null}</>;
}
