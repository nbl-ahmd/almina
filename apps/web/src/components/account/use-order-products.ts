'use client';
import { useEffect, useState } from 'react';
import type { AccountOrder } from '../../lib/account/orders';

export type OrderProduct = { href: string; image: string };
/** Current photos and links for ordered products. Order lines keep their own names and amounts; a delisted product simply has no
 *  photo or link. */
export function useOrderProducts(orders: AccountOrder[]) {
  const key = [...new Set(orders.flatMap(order => order.totals.lines.map(line => line.productId)))].filter(id => /^[a-f0-9]{24}$/i.test(id)).slice(0, 60).join(',');
  const [products, setProducts] = useState<Map<string, OrderProduct>>(new Map());
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController(), ids = key.split(',');
    void (async () => {
      for (let offset = 0; offset < ids.length; offset += 20) {
        const response = await fetch('/api/saved-products', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' }, body: JSON.stringify({ ids: ids.slice(offset, offset + 20) }) });
        if (!response.ok) return;
        const result = await response.json() as { items: (OrderProduct & { id: string })[] };
        setProducts(current => new Map([...current, ...result.items.map(item => [item.id, { href: item.href, image: item.image }] as const)]));
      }
    })().catch(() => { /* Photos are optional; the order still reads in full. */ });
    return () => controller.abort();
  }, [key]);
  return products;
}
