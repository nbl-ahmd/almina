import { ChevronDownIcon } from '@heroicons/react/24/outline';
import Link from './app-link';
import { CatalogFilterForm } from './catalog-filter-form';
import { CatalogFilterPanel } from './catalog-filter-panel';
import { CatalogSort } from './catalog-sort';
import { GrowthActivity } from './growth-activity';
import { Icon } from './icon';
import { SearchJourney } from './search-journey';
import { SearchDescription, SearchDiscovery, SearchFacets } from './search-summary';
import { Breadcrumb, ProductGrid } from './storefront';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { NativeSelect } from './ui/native-select';
import { categoryContent } from '../lib/catalog/category-content';
import { categoryHref } from '../lib/catalog/model';
import { shopText as u } from '../lib/i18n-storefront';
import { getCategories, getProducts } from '../lib/server/catalog';
import { CatalogUnavailable } from '../lib/server/catalog-response';
import { getLocale } from '../lib/server/i18n';
import boundary from './storefront-system/boundary.module.css';
import system from './storefront-system/tokens.module.css';
import styles from './catalog-list.module.css';

export type SearchParams = Record<string, string | string[] | undefined>;
export function scalar(value: string | string[] | undefined) {
  return typeof value === 'string' ? value : '';
}

export async function CatalogList({
  title, params, offers = false, category, parents = [],
}: {
  title: string;
  params: SearchParams;
  offers?: boolean;
  category?: string;
  parents?: { name: string; path: string }[];
}) {
  const locale = await getLocale();
  const ar = locale === 'ar';
  const number = new Intl.NumberFormat(locale);
  const t = (key: string) => u(locale, key);
  const q = scalar(params.q).trim().slice(0, 80);
  const lastPage = scalar(params.q) ? 10 : 1000;
  const pageValue = Number(scalar(params.page));
  const page = Number.isInteger(pageValue) && pageValue > 0 && pageValue <= lastPage ? pageValue : 1;
  const brand = scalar(params.brand).trim().slice(0, 100);
  const literal = scalar(params.literal) === 'true';
  const selected = category ?? scalar(params.category);
  const inStock = scalar(params.inStock) === 'true' ? true : undefined;
  const amount = (key: string) => {
    const raw = scalar(params[key]);
    return /^\d{1,6}(?:\.\d{1,2})?$/.test(raw) ? Number(raw) : undefined;
  };
  const minPrice = amount('minPrice'), maxPrice = amount('maxPrice');
  const sortValue = scalar(params.sort);
  const sort = sortValue === 'price-asc' || sortValue === 'price-desc' || sortValue === 'name' ? sortValue : 'relevance';
  const extraFilters = Object.fromEntries(['form', 'size', 'audience', 'bodyArea', 'concern', 'feature']
    .flatMap(key => scalar(params[key]) ? [[key, scalar(params[key]).slice(0, 100)]] : []));

  const refinements = {
    ...(selected && !category ? { category: selected } : {}),
    ...(inStock ? { inStock: 'true' } : {}),
    ...(minPrice !== undefined ? { minPrice: String(minPrice) } : {}),
    ...(maxPrice !== undefined ? { maxPrice: String(maxPrice) } : {}),
    ...(brand ? { brand } : {}),
    ...extraFilters,
  };
  const intent = { ...(q ? { q } : {}), ...(literal ? { literal: 'true' } : {}) };
  const sortQuery = { ...intent, ...refinements };
  const sorted = sort === 'relevance' ? {} : { sort };
  const current = new URLSearchParams({ ...sortQuery, ...sorted });
  const clearHref = '?' + new URLSearchParams({ ...intent, ...sorted });
  const clearSearchHref = '?' + new URLSearchParams({ ...refinements, ...sorted });
  const pageHref = (next: number) => '?' + new URLSearchParams({ ...sortQuery, ...sorted, page: String(next) });
  const original = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) original.append(key, item);
  }
  const retryHref = '?' + original;

  const [result, categories] = await Promise.all([
    getProducts({ page, q, offers, locale, brand, literal, ...extraFilters, category: selected, sort,
      ...(inStock ? { inStock } : {}),
      ...(minPrice !== undefined ? { minPrice } : {}),
      ...(maxPrice !== undefined ? { maxPrice } : {}),
    })
      .catch(error => { if (error instanceof CatalogUnavailable) return null; throw error; }),
    getCategories().catch(error => { if (error instanceof CatalogUnavailable) return null; throw error; }),
  ]);
  const searchUnavailable = Boolean(result?.searchUnavailable || result?.search?.unavailable);
  const products = result?.products ?? [];
  const unavailable = !result || (searchUnavailable && !products.length);
  const search = result?.search;
  const hasNext = Boolean(result?.hasNext && page < lastPage);
  const chips = Object.entries(refinements).map(([key, value]) => {
    const query = new URLSearchParams(current);
    query.delete(key);
    const label = key === 'category' ? t(categories?.find(cat => cat._id === selected)?.name ?? 'Category')
      : key === 'inStock' ? t('In stock')
      : key === 'minPrice' || key === 'maxPrice'
        ? `${t(key === 'minPrice' ? 'From' : 'To')} ${new Intl.NumberFormat(locale, { style: 'currency', currency: 'AED' }).format(Number(value))}`
        : value;
    return { key, label, href: '?' + query };
  });
  const heading = q && !category && !offers
    ? <>{ar ? 'نتائج البحث عن ' : 'Results for '}<bdi>“{q}”</bdi></>
    : t(title);
  const categoryLinks = categories?.length ? (
    <nav className={styles.categories} data-store-rail aria-label={t('Browse categories')}>
      {categories.slice(0, 8).map(cat => (
        <Link className={styles.option} href={categoryHref(cat)} key={cat._id}
          aria-current={selected === cat._id ? 'page' : undefined}>{t(cat.name)}</Link>
      ))}
      <Link className={styles.textLink} href="/categories">{t('All categories')}</Link>
    </nav>
  ) : null;

  const noOffers = offers && !q && !chips.length && page === 1;
  const emptyOffers = noOffers && !unavailable && !products.length;
  const empty = !products.length && (
    <section className={styles.state} aria-labelledby="catalog-empty">
      <h2 id="catalog-empty">{noOffers ? t('No current offers')
        : q ? (ar ? 'لم نعثر على منتجات مطابقة' : 'No matching products')
        : (ar ? 'لا توجد منتجات في هذه الصفحة' : 'No products on this page')}</h2>
      <p>{page > 1 ? (ar ? 'ارجع إلى الصفحة السابقة لمواصلة التصفح.' : 'Go to the previous page to keep browsing.')
        : chips.length ? (ar ? 'جرّب إزالة فلتر لتوسيع النتائج.' : 'Remove a filter to see more results.')
        : q ? (ar ? 'جرّب اسم المنتج أو العلامة التجارية أو عبارة أقصر.' : 'Try a product name, brand or shorter phrase.')
        : noOffers ? (ar ? 'يمكنك تصفح جميع المنتجات المتاحة.' : 'You can still browse the full catalogue.')
        : t('Try a different search or explore another category.')}</p>
      {page === 1 && (chips.length
        ? <Button asChild size="sm" variant="outline"><Link href={clearHref}>{t('Clear filters')}</Link></Button>
        : <Button asChild size="sm" variant={emptyOffers ? "default" : "outline"}><Link href={noOffers ? '/products' : '/categories'}>
            {noOffers ? (ar ? 'تصفح المنتجات' : 'Browse products') : t('Browse categories')}
          </Link></Button>)}
    </section>
  );
  const editorial = category ? categoryContent(title) : null;

  return (
    <div className={`${system.system} ${boundary.boundary} ${styles.catalog}`} lang={locale}>
      <div className={styles.content}>
        {q && !unavailable ? <GrowthActivity key={`${q}:${page}`} kind="search" matched={products.length > 0} /> : null}
        <Breadcrumb title={t(title)} parents={parents} />
        <div className={styles.heading}>
          <h1>{heading}</h1>
          {!unavailable && products.length > 0 ? (
            <p>{ar ? `${number.format(products.length)} منتجات في هذه الصفحة`
              : `${number.format(products.length)} ${products.length === 1 ? 'product' : 'products'} on this page`}</p>
          ) : null}
        </div>
        {!q && !unavailable && !emptyOffers ? categoryLinks : null}
        {unavailable ? (
          <section className={styles.state} data-store-notice="error" aria-labelledby="catalog-unavailable">
            <h2 id="catalog-unavailable">{q ? (ar ? 'البحث غير متاح مؤقتاً' : 'Search is temporarily unavailable')
              : (ar ? 'تعذّر تحميل المنتجات' : 'Unable to load products')}</h2>
            <p>{ar ? 'حاول مرة أخرى أو تصفح فئة.' : 'Try again or browse a category.'}</p>
            <div className={styles.actions}>
              <Button asChild size="sm">
                {/* Full document navigation retries the same URL, including its query. */}
                <a href={retryHref}>{t('Try again')}</a>
              </Button>
              <Link className={styles.textLink} href="/categories">{t('Browse categories')}</Link>
            </div>
          </section>
        ) : emptyOffers ? (
          <div>
            {empty}
            <div className={styles.discovery}>{categoryLinks}</div>
          </div>
        ) : (
          <div className={styles.layout}>
            <CatalogFilterPanel id="catalog-filters" key={`filters:${current}`} className={styles.filters}>
              <summary className={styles.filterToggle}>
                <Icon name="filter" />
                <span>{t('Filters')}</span>
                {chips.length ? <span className={styles.badge}>{number.format(chips.length)}</span> : null}
                <ChevronDownIcon className={styles.chevron} aria-hidden="true" />
              </summary>
              <div className={styles.filterBody}>
                <h2 className={styles.filterHeading}>{t('Filters')}</h2>
                <CatalogFilterForm locale={locale} className={styles.form}>
                  <div className={styles.field}>
                    <label htmlFor="catalog-query">{t('Search products')}</label>
                    <div className={styles.filterSearch}>
                      <Icon name="search" />
                      <Input type="search" id="catalog-query" name="q" defaultValue={q} maxLength={80} dir="auto" />
                    </div>
                  </div>
                  {category || !categories ? (
                    <>
                      {selected ? <input type="hidden" name="category" value={selected} /> : null}
                      {!categories && !category ? <p className={styles.queryNote} role="status">
                        {ar ? 'الفئات غير متاحة مؤقتاً.' : 'Categories are temporarily unavailable.'}
                      </p> : null}
                    </>
                  ) : (
                    <div className={styles.field}>
                      <label htmlFor="catalog-category">{t('Category')}</label>
                      <NativeSelect id="catalog-category" name="category" defaultValue={selected}>
                        <option value="">{t('All categories')}</option>
                        {categories.map(cat => <option value={cat._id} key={cat._id}>{t(cat.name)}</option>)}
                      </NativeSelect>
                    </div>
                  )}
                  <label className={styles.stock}>
                    <input type="checkbox" name="inStock" value="true" defaultChecked={inStock} />
                    {t('In stock')}
                  </label>
                  <fieldset className={styles.price}>
                    <legend>{t('Price range (AED)')}</legend>
                    <div className={styles.priceFields}>
                      <div className={styles.field}>
                        <label htmlFor="catalog-min">{t('From')}</label>
                        <Input id="catalog-min" type="number" inputMode="decimal" placeholder={ar ? 'أدنى' : 'Min'}
                          name="minPrice" min="0" max="999999" step="0.01" defaultValue={minPrice} />
                      </div>
                      <div className={styles.field}>
                        <label htmlFor="catalog-max">{t('To')}</label>
                        <Input id="catalog-max" type="number" inputMode="decimal" placeholder={ar ? 'أقصى' : 'Max'}
                          name="maxPrice" min="0" max="999999" step="0.01" defaultValue={maxPrice} />
                      </div>
                    </div>
                  </fieldset>
                  <input type="hidden" name="sort" value={sort} />
                  {Object.entries({ ...extraFilters, ...(brand ? { brand } : {}), ...(literal ? { literal: 'true' } : {}) })
                    .map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)}
                  <div className={styles.actions}>
                    <Button type="submit" size="sm">{t('Apply filters')}</Button>
                    {chips.length ? <Link className={styles.textLink} href={clearHref}>{t('Clear filters')}</Link> : null}
                    {q ? <Link className={styles.textLink} href={clearSearchHref}>{ar ? 'مسح البحث' : 'Clear search'}</Link> : null}
                  </div>
                </CatalogFilterForm>
                {search ? <SearchFacets result={search} locale={locale} query={current} /> : null}
                {categories?.length ? <details className={styles.explore}>
                  <summary>{t('Explore categories')}<ChevronDownIcon aria-hidden="true" /></summary>
                  <nav aria-label={t('Explore categories')}>
                    {categories.map(cat => <Link className={styles.textLink} href={categoryHref(cat)} key={cat._id}
                      aria-current={selected === cat._id ? 'page' : undefined}>{t(cat.name)}</Link>)}
                  </nav>
                </details> : null}
              </div>
            </CatalogFilterPanel>
            <CatalogSort key={`sort:${current}`} className={styles.sort} sort={sort}
              query={{ ...sortQuery, ...(category ? { category } : {}) }} locale={locale} />
            {chips.length ? (
              <nav className={`${styles.chips} ${styles.applied}`} aria-label={ar ? 'عوامل التصفية المطبقة' : 'Applied filters'}>
                {chips.map(chip => (
                  <Link key={chip.key} href={chip.href} className={styles.chip} aria-label={`${ar ? 'إزالة' : 'Remove'} ${chip.label}`}>
                    <bdi>{chip.label}</bdi><Icon name="close" />
                  </Link>
                ))}
              </nav>
            ) : null}
            <div className={`catalog-results ${styles.results}`}>
              {searchUnavailable ? <p className={styles.queryNote} role="status">
                {ar ? 'قد تكون بعض نتائج البحث غير متاحة. ' : 'Some search results may be unavailable. '}
                <a href={retryHref}>{t('Try again')}</a>
              </p> : null}
              {q && (category || offers) ? <p className={styles.queryNote}>
                {ar ? 'نتائج البحث عن ' : 'Results for '}<bdi>“{q}”</bdi>
              </p> : null}
              {search ? <SearchDescription result={search} query={q} locale={locale} filters={current} matched={products.length > 0} /> : null}
              {search ? (
                <SearchJourney key={search.searchId} searchId={search.searchId} query={q} locale={locale} page={page} products={products.map(p => p._id)}>
                  {empty || <ProductGrid products={products} />}
                </SearchJourney>
              ) : empty || <ProductGrid products={products} />}
              {page > 1 || hasNext ? (
                <nav className={styles.pagination} aria-label={t('Product pages')}>
                  <span aria-current="page">{ar ? 'الصفحة' : 'Page'} {number.format(page)}</span>
                  <div className={styles.actions}>
                    {page > 1 ? <Button asChild size="sm" variant="outline"><Link href={pageHref(page - 1)}><Icon name="back" />{t('Previous page')}</Link></Button> : null}
                    {hasNext ? <Button asChild size="sm" variant="outline"><Link href={pageHref(page + 1)}>{t('Next page ')}<Icon name="arrow" /></Link></Button> : null}
                  </div>
                </nav>
              ) : null}
              {search ? <SearchDiscovery result={search} locale={locale} /> : null}
              {q ? categoryLinks : null}
              <p className={styles.help}>
                {t('Need help finding a product? ')}<Link href="/contact">{t('Contact Al Mina Pharmacy')}</Link>{t(' for product and delivery enquiries.')}
              </p>
              {editorial ? (
                <section className={styles.editorial}>
                  <h2>{ar ? `اختيار احتياجاتك من ${t(title)}` : `Choosing your ${title.toLowerCase()} essentials`}</h2>
                  <p lang="en" dir="ltr">{editorial.description}</p>
                  <p lang="en" dir="ltr">{editorial.body}</p>
                  <nav className={styles.chips} aria-label={t('Explore related searches')}>
                    {editorial.topics.map(topic => <Link lang="en" className={styles.option} href={'/search?' + new URLSearchParams({ q: topic, category: category! })} key={topic}>{topic}</Link>)}
                  </nav>
                  {editorial.faqs.map(faq => <details key={faq.question} lang="en" dir="ltr"><summary>{faq.question}</summary><p>{faq.answer}</p></details>)}
                </section>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
