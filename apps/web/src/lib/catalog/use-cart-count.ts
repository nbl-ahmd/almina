"use client";
import { useEffect, useState } from 'react';
import { storedCart } from './browser-cart';

/** Total quantity in the device cart, kept in sync across tabs and storefront updates. */
export function useCartCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    function refresh() {
      try { setCount(storedCart().reduce((total, line) => total + line.quantity, 0)); }
      catch { setCount(0); }
    }
    refresh();
    window.addEventListener('storage', refresh);
    window.addEventListener('almina-cart-change', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('almina-cart-change', refresh);
    };
  }, []);
  return count;
}
