"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { loadCart, checkAddition } from '../app/cart/actions';
import { money, type CartLine } from '../lib/catalog/model';
import { storedCart, saveCart } from '../lib/catalog/browser-cart';
type Items = Awaited<ReturnType<typeof loadCart>>['items'];
export function CartView({ checkout = false }: { checkout?: boolean }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [items, setItems] = useState<Items>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
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
  }, []);
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
  if (!ready) return <p role="status">Loading your cart…</p>;
  return <><p role="alert">{error}</p>{!lines.length ? <><h2>Your cart is currently empty</h2><Link href="/products">Start shopping</Link></> : <>
    {items.map(item => <article className="cart-row" key={item.id}><Image src={item.image} alt="" width={90} height={90} sizes="90px" /><div><Link href={item.href}>{item.name}</Link><p>{item.price === null ? 'Unavailable' : money(item.price)} per item</p>{!item.available ? <p role="status">This quantity is no longer available.</p> : null}</div>
      {!checkout ? <div><button aria-label={`Decrease ${item.name} quantity`} disabled={pending || item.quantity <= 1} onClick={() => change(item.id, item.quantity - 1)}>−</button><span className="quantity">{item.quantity}</span><button aria-label={`Increase ${item.name} quantity`} disabled={pending || item.quantity >= 999} onClick={() => change(item.id, item.quantity + 1)}>+</button><button disabled={pending} onClick={() => change(item.id, 0)}>Remove</button></div> : <p>Quantity: {item.quantity}</p>}</article>)}
    <p>Prices and availability are checked against the catalog. Delivery, VAT and the final total must be confirmed at checkout.</p>
    {!checkout ? <Link className="button" href="/checkout">Proceed to checkout</Link> : <Link href="/cart">Edit cart</Link>}
  </>}</>;
}
