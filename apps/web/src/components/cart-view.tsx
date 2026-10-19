"use client";
import { DeliveryProgress } from './delivery-progress';
import Image from 'next/image';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ProductImage } from './product-image';
import { recordCommerceEvent } from '../lib/telemetry/browser';
import { loadCart, checkAddition } from '../app/(storefront)/cart/actions';
import { money, type CartLine } from '../lib/catalog/model';
import { Icon } from './icon';
import { storedCart, saveCart } from '../lib/catalog/browser-cart';
type Items = Awaited<ReturnType<typeof loadCart>>['items'];
export function CartView({ checkout = false, recommendations, cloudName }: { checkout?: boolean; recommendations?: ReactNode; cloudName?: string | undefined }) {
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
      } catch { if (active) { setError('Unable to read cart storage.'); setReady(true); } }
    }
    void refresh();
    window.addEventListener('storage', refresh); window.addEventListener('almina-cart-change', refresh);
    return () => { active = false; window.removeEventListener('storage', refresh); window.removeEventListener('almina-cart-change', refresh); };
  }, [retry]);
  async function change(id: string, quantity: number) {
    setPending(true); setError('');
    try {
      const latest = storedCart();
      if (quantity > 0) {
        const message = await checkAddition(id, quantity);
        if (message) { setError(message); return; }
      }
      if (JSON.stringify(latest) !== JSON.stringify(storedCart())) { setError('Your cart changed. Please try again.'); return; }
      saveCart(quantity === 0 ? latest.filter(line => line.id !== id) : latest.map(line => line.id === id ? { id, quantity } : line));
      recordCommerceEvent('cart_updated');
    } catch { setError('Unable to save your cart.'); }
    finally { setPending(false); }
  }
  if (!ready) return <div className="empty-state"><p role="status">Loading your cart…</p><div aria-hidden="true" className="skeleton skeleton-line" /></div>;
  return <>{error ? <div className="notice error-notice"><p role="alert">{error}</p><p>Your saved items have not been removed.</p><button type="button" className="button-secondary" onClick={() => { setReady(false); setRetry(value => value + 1); }}>Try again</button></div> : null}
    {!lines.length && !error ? <><div className="grid items-center gap-5 overflow-hidden rounded-2xl bg-[#eeedfc] p-5 md:grid-cols-2 md:p-8"><div><h2 className="mb-3 text-2xl font-semibold md:text-3xl">A little room for your everyday essentials.</h2><p className="mb-5 text-sm leading-6 text-muted">Your cart is empty. Explore care for your daily routine and find something you need.</p><Link className="button rounded-full text-sm" href="/products">Start shopping <Icon name="arrow" /></Link></div><Image src="/design/home/wellness-editorial.webp" alt="" width={768} height={512} sizes="(max-width:767px) 90vw, 50vw" className="h-48 w-full rounded-xl object-cover md:h-64" /></div>{recommendations}</> : items.length ? <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#eeedfc] px-4 py-3"><p className="m-0 text-sm font-medium">A little more care, ready for your routine.</p><span className="text-xs text-muted">{items.length} {items.length === 1 ? 'product' : 'products'} in your cart</span></div>
      <DeliveryProgress lines={lines} /><div className="cart-layout grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_300px] lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)] lg:gap-8"><div className="cart-left min-w-0"><div className="cart-list-heading mb-3 flex items-center justify-between gap-3"><h2 className="m-0 text-lg font-bold">Your items</h2><Link className="inline-flex min-h-11 items-center text-xs text-ocean" href="/products">Continue shopping</Link></div><div className="cart-items grid gap-3">
      {items.map(item => <article className="cart-item relative grid grid-cols-[64px_minmax(0,1fr)] gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm lg:grid-cols-[90px_minmax(0,1fr)] lg:gap-x-5 lg:rounded-2xl lg:p-5 lg:shadow-none" key={item.id}><Link className="cart-item-image block self-start overflow-hidden rounded-lg border border-border bg-white p-1 lg:row-span-2" href={item.href} tabIndex={-1} aria-hidden="true"><ProductImage cloudName={cloudName} className="aspect-square h-auto w-full object-contain" src={item.image} alt="" width={90} height={90} sizes="(max-width: 767px) 64px, 90px" /></Link><div className="cart-item-description min-w-0 pr-7"><Link className="inline-flex min-h-11 items-start text-sm leading-snug font-bold text-ink wrap-anywhere md:text-base" href={item.href}>{item.name}</Link>{item.variantLabel ? <p className="mb-1 text-xs text-ocean">{item.variantLabel}</p> : null}{!item.available ? <p className="cart-availability mb-0 text-xs text-warning" role="status">This quantity is no longer available.</p> : <span className="cart-item-available mt-1 flex w-fit rounded-full bg-subtle px-2 py-0.5 text-[11px] text-ocean">In stock</span>}</div>
        {!checkout ? <><button type="button" className="remove-button absolute right-1 top-1 flex size-11 items-center justify-center border-0 bg-transparent p-2 text-muted no-underline hover:bg-subtle hover:text-ink" aria-label={`Remove ${item.name} from cart`} disabled={pending} onClick={() => change(item.id, 0)}><Icon name="close" /></button><div className="cart-item-actions col-span-full flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2.5 lg:col-start-2"><div className="quantity-control rounded-lg bg-page"><button className="size-11 rounded-none bg-transparent" type="button" aria-label={`Decrease ${item.name} quantity`} disabled={pending || item.quantity <= 1} onClick={() => change(item.id, item.quantity - 1)}><Icon name="minus" /></button><output className="quantity min-w-8 text-sm" aria-label={`Quantity for ${item.name}: ${item.quantity}`}>{item.quantity}</output><button className="size-11 rounded-none bg-transparent" type="button" aria-label={`Increase ${item.name} quantity`} disabled={pending || item.quantity >= 999} onClick={() => change(item.id, item.quantity + 1)}><Icon name="plus" /></button></div><p className="cart-unit-price m-0 text-right text-base font-bold tabular-nums">{item.price === null ? 'Unavailable' : money(item.price)}{' '}<span className="ml-1 text-xs font-normal text-ocean">per item</span></p></div></> : <p className="cart-item-actions col-span-full m-0 text-sm lg:col-start-2">{item.price === null ? 'Unavailable' : money(item.price)} per item · Quantity: {item.quantity}</p>}</article>)}
      </div><div className="mt-5 flex items-start gap-3 rounded-2xl bg-[#f0f3ff] p-4"><Icon name="phone" /><div><h2 className="mb-1 text-sm font-semibold">Need a hand with your order?</h2><p className="mb-1 text-xs leading-5 text-muted">Ask our team about a product or delivery before you check out.</p><Link href="/contact" className="inline-flex min-h-11 items-center text-sm font-medium text-brand">Contact the pharmacy <Icon name="arrow" /></Link></div></div>{recommendations}</div>
      <aside className="cart-summary min-w-0 rounded-2xl border border-border bg-surface p-4 shadow-sm md:sticky md:top-6 md:p-6"><h2 className="mb-5 border-b border-border pb-3 text-lg font-bold">Order summary</h2><dl className="m-0 grid grid-cols-[minmax(0,1fr)_auto] gap-4 text-sm [&_dd]:m-0 [&_dd]:text-right [&_dd]:font-semibold"><dt>Products</dt><dd>{items.length}</dd><dt>Delivery</dt><dd>At checkout</dd><dt>VAT &amp; final total</dt><dd>At checkout</dd></dl><div className="cart-summary-note my-5 flex items-start gap-2 rounded-lg border border-border bg-subtle p-3 text-xs leading-relaxed text-ocean"><Icon name="check" /><p className="m-0">Your final total is confirmed after you enter your delivery details.</p></div>
        {!checkout ? <><Link className="button checkout-link min-h-12 w-full rounded-full px-4 text-sm" href="/checkout">Proceed to checkout <Icon name="arrow" /></Link><Link className="cart-continue mt-2 flex min-h-11 items-center justify-center text-xs text-ocean" href="/products">Continue shopping</Link><div className="fixed inset-x-0 bottom-[calc(62px+env(safe-area-inset-bottom))] z-[19] border-t border-border bg-surface px-4 py-3 shadow-nav md:hidden"><Link className="button min-h-11 w-full rounded-xl text-sm" href="/checkout">Proceed to checkout <Icon name="arrow" /></Link><p className="mt-2 mb-0 text-center text-[11px] text-ocean">Delivery and final total reviewed at checkout</p></div></> : <Link className="button button-secondary mt-3 w-full rounded-full" href="/cart">Edit cart</Link>}
        <div className="cart-support mt-5 border-t border-border pt-4"><h3 className="mb-2 text-sm font-semibold">Help with your order?</h3><p className="text-xs leading-relaxed text-ocean">Contact Al Mina Pharmacy for product or delivery enquiries.</p><Link className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-ocean" href="/contact">Contact the pharmacy <Icon name="arrow" /></Link></div>
      </aside></div></> : null}</>;
}
