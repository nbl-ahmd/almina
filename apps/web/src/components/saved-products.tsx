'use client';

import { useEffect, useState } from 'react';
import { currentSaved, loadSavedAccount, changeSaved } from '../lib/catalog/saved-account';
import type { Locale } from '../lib/i18n';
import { shopText } from '../lib/i18n-storefront';
import Link from './app-link';
import { CurrencyAmount } from './currency-amount';
import { AddToCart } from './cart-controls';
import { ProductImage } from './product-image';
import { StorefrontIntro } from './storefront-intro';
import { Button } from './ui/button';
import { Icon } from './icon';
import styles from './storefront-information.module.css';

type Item = { id: string; name: string; href: string; price: number | null; stock: number; image: string };
type Result = { key: string; items: Item[]; failed?: boolean };
const pageSize = 20;

export function SavedProducts({ cloudName, locale }: { cloudName?: string | undefined; locale: Locale }) {
  const [ids, setIds] = useState<string[]>();
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<Result>();
  const [unavailable, setUnavailable] = useState(false);
  const [removeFailed, setRemoveFailed] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [retry, setRetry] = useState(0);
  const text = (en: string, ar: string) => locale === 'ar' ? ar : en;
  const pageIds = ids?.slice(page * pageSize, (page + 1) * pageSize);
  const pageKey = pageIds?.join(',') ?? '';

  useEffect(() => {
    function update() {
      try {
        const next = currentSaved();
        setIds(previous => previous?.join(',') === next.join(',') ? previous : next);
        setPage(value => Math.min(value, Math.max(0, Math.ceil(next.length / pageSize) - 1)));
        setUnavailable(false);
      } catch {
        setUnavailable(true);
      }
    }

    let active = true;
    void loadSavedAccount().then(() => { if (active) update(); });
    window.addEventListener('almina-saved-change', update);
    return () => {
      active = false;
      window.removeEventListener('almina-saved-change', update);
    };
  }, [retry]);

  useEffect(() => {
    if (!pageKey) return;
    const controller = new AbortController();
    void fetch('/api/saved-products', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' },
      body: JSON.stringify({ ids: pageKey.split(',') }),
    }).then(response => {
      if (!response.ok) throw new Error();
      return response.json() as Promise<{ items: Item[] }>;
    }).then(({ items }) => {
      if (!controller.signal.aborted) setResult({ key: pageKey, items });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ key: pageKey, items: [], failed: true });
    });

    return () => controller.abort();
  }, [pageKey, retry]);

  const visible = result?.key === pageKey ? result : undefined;

  return <>
    <StorefrontIntro
      title={text('Saved products', 'المنتجات المحفوظة')}
      description={text('Sign in to access your saved products across devices. Guest favourites stay on this device.', 'سجّل الدخول للوصول إلى منتجاتك المحفوظة عبر أجهزتك. تبقى مفضلات الزائر على هذا الجهاز.')}
    />
    {removeFailed ? <p role="alert" className={`${styles.panel} ${styles.error}`}>{text('Unable to remove this saved product. Try again.', 'تعذّرت إزالة هذا المنتج المحفوظ. حاول مرة أخرى.')}</p> : null}
    {unavailable || (pageKey && visible?.failed) ? <section className={`${styles.panel} ${styles.state}`}>
      <h2 role="alert">{text('Saved products could not load', 'تعذّر تحميل المنتجات المحفوظة')}</h2>
      <Button type="button" size="sm" variant="outline" onClick={() => {
        setResult(undefined);
        setRetry(value => value + 1);
      }}>{text('Try again', 'حاول مرة أخرى')}</Button>
    </section> : !ids || (pageKey && !visible) ? <p className={`${styles.panel} ${styles.state}`} role="status">
      {text('Loading saved products…', 'جارٍ تحميل المنتجات المحفوظة…')}
    </p> : !ids.length ? <section className={`${styles.panel} ${styles.state}`}>
      <h2>{text('No saved products yet', 'لا توجد منتجات محفوظة بعد')}</h2>
      <p>{text('Save a product to find it here later.', 'احفظ أي منتج لتجده هنا لاحقاً.')}</p>
      <Button asChild size="sm"><Link href="/products">{text('Explore products', 'تصفّح المنتجات')}<Icon name="arrow" /></Link></Button>
    </section> : <>
      <div className={styles.savedGrid}>
        {visible?.items.map(item => <article key={item.id} className={styles.savedCard}>
          <Link className={styles.savedPhoto} href={item.href} aria-label={item.name}>
            <ProductImage src={item.image} alt="" cloudName={cloudName} width={300} height={300}
              sizes="(max-width: 767px) 45vw, (max-width: 1023px) 32vw, 300px" />
          </Link>
          <h2><Link href={item.href}><bdi>{item.name}</bdi></Link></h2>
          <p className="m-0 text-xs text-muted">{shopText(locale, item.stock > 0 ? 'In stock' : 'Currently unavailable')}</p>
          <div className={styles.savedPurchase}>
            <p className={styles.savedPrice}>{item.price === null
              ? text('Price unavailable', 'السعر غير متاح')
              : <CurrencyAmount value={item.price} locale={locale} />}</p>
            <AddToCart id={item.id} stock={item.stock} name={item.name} locale={locale} compact />
          </div>
          <Button type="button" variant="ghost" size="icon" className={styles.savedRemove} disabled={removing}
            aria-label={text(`Remove ${item.name} from saved products`, `إزالة ${item.name} من المنتجات المحفوظة`)}
            onClick={async () => {
              setRemoving(true);
              setRemoveFailed(false);
              try { await changeSaved(item.id, true); }
              catch { setRemoveFailed(true); }
              finally { setRemoving(false); }
            }}><Icon name="trash" /></Button>
        </article>)}
      </div>
      {(visible?.items.length ?? 0) < (pageIds?.length ?? 0) ? <p className="mt-4 text-sm text-muted">
        {text('Some saved products are no longer listed.', 'بعض المنتجات المحفوظة لم تعد مدرجة.')}
      </p> : null}
      {ids.length > pageSize ? <nav className="mt-5 flex flex-wrap gap-3" aria-label={text('Saved product pages', 'صفحات المنتجات المحفوظة')}>
        {page > 0 ? <Button type="button" variant="outline" size="sm" onClick={() => setPage(page - 1)}>{text('Previous', 'السابق')}</Button> : null}
        {(page + 1) * pageSize < ids.length ? <Button type="button" variant="outline" size="sm" onClick={() => setPage(page + 1)}>{text('Next', 'التالي')}</Button> : null}
      </nav> : null}
    </>}
  </>;
}
