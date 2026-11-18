import Link from './app-link';
import type { Locale } from '../lib/i18n';
import type { SearchMetadata } from '../lib/server/search';
import styles from './catalog-list.module.css';

type SummaryProps = { result: SearchMetadata; locale: Locale };

const facets = [
  ['brands', 'brand', 'Brand', 'العلامة التجارية'],
  ['forms', 'form', 'Form', 'الشكل'],
  ['sizes', 'size', 'Size', 'الحجم'],
  ['audiences', 'audience', 'Age group', 'الفئة العمرية'],
  ['bodyAreas', 'bodyArea', 'Body area', 'منطقة الاستخدام'],
  ['concerns', 'concern', 'Care need', 'العناية'],
  ['features', 'feature', 'Features', 'الميزات'],
] as const;

export function SearchDescription({ result, query, locale, filters, matched }: SummaryProps & {
  query: string; filters: URLSearchParams; matched: boolean;
}) {
  const ar = locale === 'ar';
  const corrected = new URLSearchParams(filters);
  const original = new URLSearchParams(filters);
  original.set('q', query);
  original.set('literal', 'true');
  if (result.correction) corrected.set('q', result.correction);
  const price = result.interpretation.maxPrice;
  return (
    <>
      {result.correction ? <p className={styles.queryNote}>
        {ar ? 'هل تقصد ' : 'Did you mean '}
        <Link href={'?' + corrected}><bdi>{result.correction}</bdi></Link>?
        {' · '}<Link href={'?' + original}>{ar ? 'البحث بالعبارة الأصلية' : 'Search the original phrase'}</Link>
      </p> : null}
      {price !== undefined && !filters.has('maxPrice') ? <p className={styles.queryNote}>
        {ar ? `منتجات بسعر يصل إلى ${price} درهماً` : `Products up to AED ${price}`}
      </p> : null}
      {result.relaxed && matched ? <p className={styles.queryNote} role="status">
        {ar ? 'لم نعثر على تطابق دقيق. نتائج ذات صلة بـ ' : 'No exact match found. Showing related results for '}
        <bdi>“{result.interpretedQuery}”</bdi>.
      </p> : null}
    </>
  );
}

export function SearchFacets({ result, locale, query }: SummaryProps & { query: URLSearchParams }) {
  const available = facets.filter(([kind]) => result.facets[kind].length > 1);
  if (!available.length) return null;
  return (
    <details className={styles.explore}>
      <summary>{locale === 'ar' ? 'تصفية النتائج' : 'Narrow these results'}</summary>
      {available.map(([kind, param, en, ar]) => (
        <nav className={styles.facet} key={kind} aria-label={locale === 'ar' ? ar : en}>
          <p>{locale === 'ar' ? ar : en}</p>
          <div className={styles.chips}>
            {result.facets[kind].slice(0, 6).map(item => {
              const next = new URLSearchParams(query);
              next.set(param, item.value);
              return <Link className={styles.option} data-store-control="option" key={item.value} href={'?' + next}
                aria-current={query.get(param) === item.value ? 'page' : undefined}>
                <bdi>{item.value}</bdi><span className={styles.badge}>{item.count}</span>
              </Link>;
            })}
          </div>
        </nav>
      ))}
    </details>
  );
}

export function SearchDiscovery({ result, locale }: SummaryProps) {
  const ar = locale === 'ar';
  const suggestions = [
    ...result.collections, ...result.categories, ...result.brands,
    ...result.querySuggestions.map(item => ({ ...item, name: ar ? `ابحث عن «${item.name}»` : item.name })),
  ].filter((item, index, rows) => rows.findIndex(other => other.href === item.href) === index).slice(0, 8);
  return (
    <>
      {suggestions.length ? <nav className={styles.discovery} aria-label={ar ? 'اقتراحات ذات صلة' : 'Related suggestions'}>
        <h2>{ar ? 'اقتراحات ذات صلة' : 'Related suggestions'}</h2>
        <div className={styles.chips}>
          {suggestions.map(item => <Link key={item.href} className={styles.option} href={item.href}><bdi>{item.name}</bdi></Link>)}
        </div>
      </nav> : null}
      {result.alternatives.length ? <nav className={styles.discovery} aria-label={ar ? 'منتجات مشابهة' : 'Similar products'}>
        <h2>{ar ? 'منتجات مشابهة' : 'Similar products'}</h2>
        <div className={styles.chips}>
          {result.alternatives.map(item => <Link key={item.href} className={styles.textLink} href={item.href}><bdi>{item.name}</bdi></Link>)}
        </div>
      </nav> : null}
    </>
  );
}
