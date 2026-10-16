'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DesignIcon } from './design-icon';
import { storedCart } from '../lib/catalog/browser-cart';

export function CartLink() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    function refresh() {
      try { setCount(storedCart().reduce((total, line) => total + line.quantity, 0)); }
      catch { setCount(0); }
    }
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('almina-cart-change', refresh);
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('almina-cart-change', refresh); };
  }, []);
  return <Link className="header-cart relative flex max-md:group-has-[.catalog-page]/storefront:hidden min-h-11 min-w-9 items-center justify-center gap-2 text-ink" href="/cart" aria-label={`Your cart${count ? `, ${count} ${count === 1 ? 'item' : 'items'}` : ''}`}><DesignIcon name="bag" /><span className="sr-only">Your cart</span>{count ? <span className="cart-count absolute -right-1 top-0 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[11px] text-white" aria-hidden="true">{count}</span> : null}</Link>;
}
