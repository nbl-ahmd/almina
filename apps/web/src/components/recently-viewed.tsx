'use client';
import { Button } from './ui/button';
import { CurrencyAmount } from './currency-amount';
import { shopText as u } from '../lib/i18n-storefront';
import type { Locale } from '../lib/i18n';
import { useEffect,useState } from 'react';
import Link from './app-link';
import { ProductImage } from './product-image';
import { readSaved } from '../lib/catalog/saved';
import styles from './product-card.module.css';
import system from './storefront-system/tokens.module.css';
import boundary from './storefront-system/boundary.module.css';
const key='almina.recent-products.v1';
type Item={id:string;name:string;href:string;price:number;stock:number;image:string};
export function RecordProductView({id}:{id:string}){useEffect(()=>{try{const ids=readSaved(localStorage.getItem(key));localStorage.setItem(key,JSON.stringify([id,...ids.filter(value=>value!==id)].slice(0,12)));}catch{/* Optional on-device history. */}},[id]);return null;}
export function RecentlyViewed({ cloudName, locale = 'en' }: { cloudName?: string | undefined; locale?: Locale }) {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    try {
      const ids = readSaved(localStorage.getItem(key));
      if (ids.length) void fetch('/api/saved-products', {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' },
        body: JSON.stringify({ ids: ids.slice(0, 8) }),
      }).then(response => response.ok ? response.json() : null)
        .then(value => setItems(value?.items ?? [])).catch(() => {});
    } catch { /* Optional on-device history. */ }
    return () => controller.abort();
  }, []);
  if (!items.length) return null;
  return (
    <section lang={locale} className={`${system.system} ${boundary.boundary}`}>
      <div className={styles.recentHead}>
        <h2>{u(locale, 'Pick up where you left off')}</h2>
        <Button type="button" size="sm" variant="outline" onClick={() => {
          try { localStorage.removeItem(key); setItems([]); } catch { /* Retain list if storage is unavailable. */ }
        }}>{u(locale, 'Clear history')}</Button>
      </div>
      <div className={styles.recentRail}>
        {items.map(item => (
          <Link key={item.id} href={item.href} data-product-entry="recent" className={`${styles.compact} ${styles.compactLink}`}>
            <span className={styles.compactPhoto}>
              <ProductImage src={item.image} alt="" cloudName={cloudName} width={100} height={100} sizes="48px" className={styles.photo} />
            </span>
            <span className={styles.compactText}>
              <bdi className={styles.title}>{item.name}</bdi>
              <span className={styles.stock} data-stock={item.stock > 0 ? 'available' : 'unavailable'}>
                {item.stock > 0 ? u(locale, 'In stock') : u(locale, 'Currently unavailable')}
              </span>
              <span className={styles.price}><span className={styles.amount}>
                <CurrencyAmount value={item.price} locale={locale} />
              </span></span>
            </span>
          </Link>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">{u(locale, 'Viewed on this device. You can clear this list at any time.')}</p>
    </section>
  );
}
