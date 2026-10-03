"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { loadCart, checkAddition } from '../app/cart/actions';
import { money, type CartLine } from '../lib/catalog/model';
import { Icon } from './icon';
import { storedCart, saveCart } from '../lib/catalog/browser-cart';
type Items = Awaited<ReturnType<typeof loadCart>>['items'];
export function CartView({ checkout = false }: { checkout?: boolean }) {
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
    } catch { setError('Unable to save your cart.'); }
    finally { setPending(false); }
  }
  if (!ready) return <div className="empty-state"><p role="status">Loading your cart…</p><div aria-hidden="true" className="skeleton skeleton-line" /></div>;
  return <>{error ? <div className="notice error-notice"><p role="alert">{error}</p><p>Your saved items have not been removed.</p><button type="button" className="button-secondary" onClick={() => { setReady(false); setRetry(value => value + 1); }}>Try again</button></div> : null}
    {!lines.length && !error ? <div className="empty-state"><Icon name="bag" /><h2>Your cart is currently empty</h2><p>Find the essentials for your everyday routine.</p><Link className="button" href="/products">Start shopping <Icon name="arrow" /></Link></div> : items.length ? <div className="cart-layout"><div className="cart-items">
      {items.map(item => <article className="cart-row" key={item.id}><Image src={item.image} alt="" width={90} height={90} sizes="(max-width: 1023px) 72px, 90px" /><div><Link className="cart-item-name" href={item.href}>{item.name}</Link><p className="cart-unit-price">{item.price === null ? 'Unavailable' : money(item.price)} per item</p>{!item.available ? <p role="status">This quantity is no longer available.</p> : null}</div>
        {!checkout ? <div className="cart-actions"><div className="quantity-control"><button type="button" aria-label={`Decrease ${item.name} quantity`} disabled={pending || item.quantity <= 1} onClick={() => change(item.id, item.quantity - 1)}><Icon name="minus" /></button><output className="quantity" aria-label={`Quantity for ${item.name}: ${item.quantity}`}>{item.quantity}</output><button type="button" aria-label={`Increase ${item.name} quantity`} disabled={pending || item.quantity >= 999} onClick={() => change(item.id, item.quantity + 1)}><Icon name="plus" /></button></div><button type="button" className="remove-button" aria-label={`Remove ${item.name} from cart`} disabled={pending} onClick={() => change(item.id, 0)}>Remove</button></div> : <p>Quantity: {item.quantity}</p>}</article>)}
    </div><aside className="cart-summary"><h2>{checkout ? 'Review your items' : 'Your next step'}</h2><p>Prices and availability are checked against the catalog. Delivery, VAT and the final total must be confirmed at checkout.</p>
      {!checkout ? <><Link className="button" href="/checkout">Proceed to checkout <Icon name="arrow" /></Link><Link href="/products">Continue shopping</Link></> : <Link className="button button-secondary" href="/cart">Edit cart</Link>}
    </aside></div> : null}</>;
}
