'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { storedCart } from '../lib/catalog/browser-cart';
export function CartRecommendations({ products, title }: { products: { id: string; card: ReactNode }[]; title: string }) {
  const [excluded, setExcluded] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => { try { setExcluded(storedCart().map(line => line.id)); } catch { setExcluded([]); } };
    sync(); window.addEventListener('storage', sync); window.addEventListener('almina-cart-change', sync);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('almina-cart-change', sync); };
  }, []);
  const visible = products.filter(product => !excluded.includes(product.id)).slice(0, 2);
  return visible.length ? <section className="cart-recommendations"><h2>{title}</h2><div className="product-grid cart-recommendation-grid">{visible.map(product => <div key={product.id}>{product.card}</div>)}</div></section> : null;
}
