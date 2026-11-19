import { shopText } from '../lib/i18n-storefront';
import { getLocale } from '../lib/server/i18n';
import styles from './catalog-list.module.css';
import system from './storefront-system/tokens.module.css';

export function CatalogLoading({ title = 'Al Mina Pharmacy', showHeading = true }: { title?: string; showHeading?: boolean }) {
  return <>{showHeading ? <div className="mb-6 rounded-2xl bg-subtle p-5"><h1>{title}</h1><p role="status">Loading the pharmacy…</p></div> : <p role="status" className="sr-only">Loading products…</p>}<div className="product-grid grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4" aria-hidden="true">{Array.from({ length: 5 }, (_, i) => <div className="skeleton-card rounded-2xl border border-border bg-white p-3" key={i}><div className="skeleton skeleton-image" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-line" /></div>)}</div></>;
}

export async function PublicCatalogLoading({ title }: { title: string }) {
  const locale = await getLocale();
  return (
    <section data-storefront-catalog className={`${system.system} ${styles.catalog}`} lang={locale}>
      <div className={styles.content}>
        <div className={styles.heading}>
          <h1>{shopText(locale, title)}</h1>
          <p role="status">{locale === 'ar' ? 'جارٍ تحميل المنتجات…' : 'Loading products…'}</p>
        </div>
        <div className={styles.skeleton} aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => <div key={index}><span /><span /><span /></div>)}
        </div>
      </div>
    </section>
  );
}
