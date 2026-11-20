"use client";
import { useState } from 'react';
import Link from './app-link';
import { checkAddition } from '../app/(storefront)/cart/actions';
import { recordCommerceEvent } from '../lib/telemetry/browser';

/** Adds a staff-curated complementary set to the local cart; the server still revalidates every item and price at checkout. */
export function BundleAdd({ items }: { items: { id: string; name: string; stock: number }[] }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ message: string; added: number } | null>(null);
  async function addAll() {
    setPending(true);
    try {
      // Storage parsing/validation only happens after an explicit cart interaction.
      const { storedCart, saveCart } = await import('../lib/catalog/browser-cart');
      const lines = storedCart();
      const next = [...lines];
      let added = 0;
      for (const item of items) {
        const index = next.findIndex(line => line.id === item.id);
        const previous = index >= 0 ? next[index]!.quantity : 0;
        const quantity = Math.min(item.stock, previous + 1);
        if (quantity <= previous) continue;
        if (await checkAddition(item.id, quantity)) continue;
        const line = { id: item.id, quantity };
        if (index >= 0) next[index] = line; else next.push(line);
        added++;
      }
      // A different tab may have changed storage while the stock requests were in flight.
      if (added && JSON.stringify(lines) !== JSON.stringify(storedCart())) { setResult({ message: 'Your cart changed. Please try again.', added: 0 }); return; }
      if (added) { saveCart(next); recordCommerceEvent('cart_updated'); }
      setResult({ message: added === items.length ? `All ${items.length} products added.` : added ? `${added} of ${items.length} products added.` : 'No products could be added right now.', added });
    } catch { setResult({ message: 'Unable to save your cart in this browser.', added: 0 }); }
    finally { setPending(false); }
  }
  return <div className="flex flex-wrap items-center gap-3"><button type="button" className="min-h-11 rounded-lg bg-brand px-5 text-sm font-semibold text-primary-foreground disabled:opacity-60 md:rounded-full" disabled={pending || !items.length} onClick={addAll}>{pending ? 'Adding…' : 'Add these to cart'}</button>{result ? <>{result.added ? <Link className="text-sm font-semibold text-teal" href="/cart">View cart</Link> : null}<p role="status" className="mb-0 text-sm text-muted">{result.message}</p></> : null}</div>;
}
