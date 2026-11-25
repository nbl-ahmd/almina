import { getWebEnvironment } from '../lib/server/env';
import { SectionStrips } from './hero-banner';
import { getHomepageCampaigns } from '../lib/server/growth';
import { CatalogFilterPanel } from './catalog-filter-panel';
import {SearchSummary} from './search-summary';
import {SearchJourney} from './search-journey';
import { CatalogSort } from './catalog-sort';
import { GrowthActivity } from './growth-activity';

import { Input } from './ui/input';
import { NativeSelect } from './ui/native-select';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Field, FieldLabel, FieldGroup } from './ui/field';
import { ChevronDownIcon } from './storefront-icons';
import { CatalogFilterForm } from './catalog-filter-form';
import { getLocale } from '../lib/server/i18n';
import { shopText as u } from '../lib/i18n-storefront';
import { categoryContent } from '../lib/catalog/category-content';
import { StorefrontIntro } from './storefront-intro';
import Link from './app-link';
import { getCategories, getProducts } from '../lib/server/catalog';
import { categoryHref } from '../lib/catalog/model';
import { ProductGrid, Breadcrumb } from './storefront';
import { Icon } from './storefront-icon';
export type SearchParams = Record<string, string | string[] | undefined>;
export function scalar(value: string | string[] | undefined) { return typeof value === 'string' ? value : ''; }
export async function CatalogList({ title, params, offers = false, category, parents = [] }: { title: string; params: SearchParams; offers?: boolean; category?: string; parents?: { name: string; path: string }[] }) {
  const locale = await getLocale();
  // Section banners staff place on listing pages (finished artwork only; no prices or stock in them).
  const listingCampaigns = (await getHomepageCampaigns(locale).catch(() => [])).filter(page => page.homepagePlacement === 'strip' && page.stripSlot === 'listing');
  const pageValue = Number(scalar(params.page));
  const page = Number.isInteger(pageValue) && pageValue > 0 && pageValue <= (scalar(params.q)?10:1000) ? pageValue : 1;
  const q = scalar(params.q).trim().slice(0, 80);
  const brand=scalar(params.brand).trim().slice(0,100),literal=scalar(params.literal)==='true';
  const selected = category ?? scalar(params.category);
  const inStock = scalar(params.inStock) === 'true' ? true : undefined;
  const amount = (key: string) => { const raw=scalar(params[key]); return /^\d{1,6}(?:\.\d{1,2})?$/.test(raw) ? Number(raw) : undefined; };
  const minPrice=amount('minPrice'), maxPrice=amount('maxPrice');
  const sortValue=scalar(params.sort);
  const sort=['price-asc','price-desc','name'].includes(sortValue) ? sortValue as 'price-asc'|'price-desc'|'name' : 'relevance';
  const extraFilters=Object.fromEntries(['form','size','audience','bodyArea','concern','feature'].flatMap(key=>scalar(params[key])?[[key,scalar(params[key]).slice(0,100)]]:[]));
  const activeFilters=Number(Boolean(brand))+Object.keys(extraFilters).length+Number(Boolean(q))+Number(Boolean(selected))+Number(Boolean(inStock))+Number(minPrice!==undefined||maxPrice!==undefined);
  const sortQuery: Record<string,string> = {};
  if(q)sortQuery.q=q;
  if(brand)sortQuery.brand=brand;
  if(literal)sortQuery.literal='true';
  Object.assign(sortQuery,extraFilters);
  if(selected)sortQuery.category=selected;
  if(inStock)sortQuery.inStock='true';
  if(minPrice!==undefined)sortQuery.minPrice=String(minPrice);
  if(maxPrice!==undefined)sortQuery.maxPrice=String(maxPrice);
  function removeFilter(key:string){const query=new URLSearchParams(sortQuery);query.delete(key);if(sort!=='relevance')query.set('sort',sort);return query.size?`?${query}`:'?';}
  const chips=[...(brand?[{key:'brand',label:brand}]:[]),...Object.entries(extraFilters).map(([key,label])=>({key,label})),...(q?[{key:'q',label:q}]:[]),...(!category&&selected?[{key:'category',label:''}]:[]),...(inStock?[{key:'inStock',label:u(locale,'In stock')}]:[]),...(minPrice!==undefined?[{key:'minPrice',label:`${locale==='ar'?'من':'From'} AED ${minPrice}`}]:[]),...(maxPrice!==undefined?[{key:'maxPrice',label:`${locale==='ar'?'إلى':'To'} AED ${maxPrice}`}]:[])];
  const filterControl = '  px-3 text-sm  ';
  const editorial = category ? categoryContent(title) : null;
  const [result, categories] = await Promise.all([getProducts({ page, q, offers,locale,brand,literal,...extraFilters, category: selected, ...(inStock!==undefined?{inStock}:{}), ...(minPrice!==undefined?{minPrice}:{}), ...(maxPrice!==undefined?{maxPrice}:{}), sort }), getCategories()]);
  const emptySearch = Boolean(q && !result.products.length);
  const unavailableEmpty = emptySearch && Boolean(result.searchUnavailable || result.search?.unavailable);
  const productResults = unavailableEmpty ? <div className="search-recovery"><Link className="button button-secondary" href="/categories">{u(locale, 'Browse categories')}</Link></div> : <ProductGrid products={result.products} />;
  function pageHref(next: number) {
    const query = new URLSearchParams();
    if (q) query.set('q', q);
    if(brand)query.set('brand',brand);
    if(literal)query.set('literal','true');
    if (selected && !category) query.set('category', selected);
    if (inStock) query.set('inStock','true');
    if (minPrice !== undefined) query.set('minPrice',String(minPrice));
    if (maxPrice !== undefined) query.set('maxPrice',String(maxPrice));
    if (sort !== 'relevance') query.set('sort',sort);
    for(const [key,value] of Object.entries(extraFilters))query.set(key,value);
    query.set('page', String(next));
    return `?${query}`;
  }
  return <div className={emptySearch ? "catalog-page empty-search-page" : "catalog-page"}>{q?<GrowthActivity key={`${q}:${page}`} kind="search" matched={result.products.length>0}/>:null}<Breadcrumb title={u(locale,title)} parents={parents} /><StorefrontIntro title={u(locale,title)} description={offers ? u(locale,'Explore current offers from Al Mina. Real savings, with the current price shown on every product.') : q ? emptySearch ? locale === "en" ? `Search: “${q}”` : `البحث: «${q}»` : locale === "en" ? `Find the right match for “${q}”. Browse the results or narrow your search.` : `اعثر على ما يناسب بحثك عن «${q}». تصفح النتائج أو ضيّق نطاق البحث.` : editorial?.description ?? u(locale,'Explore products for your health, care and daily routine.')}><span className="catalog-intro-count text-xs">{locale === "en" ? `Page ${page} · ${result.products.length} ${result.products.length===1?'product':'products'} shown` : `الصفحة ${page} · عرض ${result.products.length} منتجات`}</span></StorefrontIntro>
    <div className="catalog-layout grid min-w-0 items-start [&_.product-grid]:lg:grid-cols-3">
      <CatalogFilterPanel key={`${q}:${selected}:${inStock}:${minPrice}:${maxPrice}:${sort}`} locale={locale} summary={<summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold max-lg:group-not-open:min-h-11 max-lg:group-not-open:rounded-full max-lg:group-not-open:bg-subtle max-lg:group-not-open:px-2.5 max-lg:group-not-open:py-0 max-lg:group-not-open:text-xs focus-visible:outline-2 focus-visible:outline-offset-2 lg:group-open:hidden [&::-webkit-details-marker]:hidden">
          <span className="flex size-8 items-center justify-center rounded-lg"><Icon name="filter" /></span>
          {u(locale,"Filters")}
          {activeFilters ? <span className="inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs tabular-nums">{activeFilters}</span>:null}
          <ChevronDownIcon aria-hidden="true" className="ms-auto size-4 shrink-0 group-open/filters:rotate-180" />
        </summary>}>
        <CatalogFilterForm locale={locale} className="filters border-t p-4 lg:border-0 lg:p-5">
          <FieldGroup className="gap-5">
            <div className="filter-panel-heading hidden min-h-11 items-center justify-between gap-3 border-b pb-4 lg:flex">
              <h2 className="m-0 flex items-center gap-2 text-base font-semibold"><span className="hidden lg:inline">{u(locale,"Filters")}</span><span className="lg:hidden">{u(locale,"Refine")}</span>{activeFilters ? <span className="hidden min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs tabular-nums lg:inline-flex">{activeFilters}</span>:null}</h2>
              {activeFilters ? <Link className="filter-reset inline-flex min-h-11 items-center rounded-lg px-1 text-xs font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2" href="?">{u(locale,"Clear filters")}</Link>:null}
            </div>
            <Field className="gap-2"><FieldLabel className="text-[13px] font-medium" htmlFor="catalog-list-field-1">{u(locale,"Search products")}</FieldLabel><Input id="catalog-list-field-1" className={filterControl} type="search" placeholder={u(locale,"Search products")} name="q" defaultValue={q} maxLength={80} /></Field>
            <Field className="gap-2"><FieldLabel className="text-[13px] font-medium" htmlFor="catalog-list-field-2">{u(locale,"Category")}</FieldLabel><NativeSelect id="catalog-list-field-2" className={filterControl} name="category" disabled={Boolean(category)} defaultValue={selected}><option value="">{u(locale,"All categories")}</option>{categories.map(cat=><option value={cat._id} key={cat._id}>{cat.name}</option>)}</NativeSelect></Field>
            {category ? <input type="hidden" name="category" value={category} />:null}
            <Field orientation="horizontal" className="min-h-12 gap-3 rounded-xl px-3"><Checkbox id="catalog-list-field-3" className="data-[state=checked]:text-white" name="inStock" value="true" defaultChecked={inStock} /><FieldLabel htmlFor="catalog-list-field-3" className="min-h-12 flex-1 cursor-pointer text-sm font-medium">{u(locale,"In stock")}</FieldLabel></Field>
            <fieldset className="catalog-price-range m-0 min-w-0 border-0 p-0">
              <legend className="mb-3 p-0 text-[13px] font-medium">{u(locale,"Price range (AED)")}</legend>
              <div className="grid min-w-0 grid-cols-2 gap-3">
                <Field className="gap-2"><FieldLabel htmlFor="catalog-list-field-4" className="text-xs font-normal">{u(locale,"From")}</FieldLabel><Input id="catalog-list-field-4" className={`${filterControl} tabular-nums`} type="number" inputMode="decimal" placeholder={locale==='ar'?'أدنى':'Min'} name="minPrice" min="0" max="999999" step="0.01" defaultValue={minPrice} /></Field>
                <Field className="gap-2"><FieldLabel htmlFor="catalog-list-field-5" className="text-xs font-normal">{u(locale,"To")}</FieldLabel><Input id="catalog-list-field-5" className={`${filterControl} tabular-nums`} type="number" inputMode="decimal" placeholder={locale==='ar'?'أقصى':'Max'} name="maxPrice" min="0" max="999999" step="0.01" defaultValue={maxPrice} /></Field>
              </div>
            </fieldset>
            <input type="hidden" name="sort" value={sort} />{Object.entries(extraFilters).map(([key,value])=><input key={key} type="hidden" name={key} value={value}/>)}{brand?<input type="hidden" name="brand" value={brand}/>:null}{literal?<input type="hidden" name="literal" value="true"/>:null}
            <div className="flex items-center gap-3"><Button className="min-w-0 flex-1 px-4" type="submit">{u(locale,"Apply filters")}</Button>{activeFilters ? <Link className="filter-reset inline-flex min-h-12 shrink-0 items-center rounded-lg px-2 text-xs font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 lg:hidden" href="?">{u(locale,"Clear filters")}</Link>:null}</div>
            <details className="group/categories hidden border-t pt-1 lg:block"><summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 [&::-webkit-details-marker]:hidden">{u(locale,"Explore categories")}<ChevronDownIcon aria-hidden="true" className="size-3.5 group-open/categories:rotate-180" /></summary><nav aria-label={u(locale,"Explore categories")} className="flex flex-col pt-1">{categories.map(cat=><Link className="flex min-h-11 items-center rounded-lg px-2 text-sm transition-colors focus-visible:outline-2" href={categoryHref(cat)} key={cat._id} aria-current={selected===cat._id?'page':undefined}>{cat.name}</Link>)}</nav></details>
          </FieldGroup>
        </CatalogFilterForm>
      </CatalogFilterPanel>
    <nav className="catalog-category-links scrollbar-none order-2 flex min-w-0 items-center gap-1.5 overflow-x-auto py-1 text-xs lg:order-first lg:col-span-2 lg:flex-wrap" aria-label={u(locale,"Browse categories")}>{categories.slice(0,8).map(cat=><Link className="inline-flex min-h-9 shrink-0 items-center rounded-full px-2.5 transition-colors aria-[current=page]:text-white" href={categoryHref(cat)} key={cat._id} aria-current={selected===cat._id?'page':undefined}>{cat.name}</Link>)}<Link className="inline-flex min-h-9 shrink-0 items-center px-2.5 font-semibold" href="/categories">{u(locale,"All categories")}</Link></nav>
      <div className="catalog-results order-3 col-span-2 min-w-0 lg:col-span-1"><SectionStrips pages={listingCampaigns} slot="listing" cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} /><div className="catalog-toolbar flex flex-wrap items-center justify-between gap-x-2 gap-y-0">{!emptySearch ? <span className="text-xs text-muted">{locale==='ar'?`عرض ${result.products.length} منتجات`:`${result.products.length} ${result.products.length===1?'product':'products'} on this page`}</span> : null}<CatalogSort key={`${q}:${selected}:${sort}`} sort={sort} query={sortQuery} locale={locale} /></div>{chips.length?<nav aria-label={locale==='ar'?'عوامل التصفية المطبقة':'Applied filters'} className="mb-4 flex flex-wrap gap-2">{chips.map(chip=><Link key={chip.key} href={removeFilter(chip.key)} aria-label={`${locale==='ar'?'إزالة':'Remove'} ${chip.label || categories.find(cat=>cat._id===selected)?.name || u(locale,'Category')}`} className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full px-3 text-xs"><span className="truncate">{chip.label || categories.find(cat=>cat._id===selected)?.name || u(locale,'Category')}</span><Icon name="close" /></Link>)}</nav>:null}{q && !emptySearch ? <p className="catalog-result-label mb-4 text-sm">{locale === "en" ? `Results for “${q}”` : `نتائج البحث عن «${q}»`}</p>:null}{q?<SearchSummary result={result.search} query={q} locale={locale} unavailable={result.searchUnavailable} filters={{...sortQuery,sort}}/>:null}{offers && !result.products.length && !q && !selected ? <div className="rounded-2xl border bg-white p-6 text-center md:p-10"><h2 className="mb-3 text-2xl font-semibold">{u(locale,"No current offers")}</h2><p className="mb-5 text-sm">{u(locale,"There are no active product offers to show right now. Explore the full range for your everyday essentials.")}</p><Link className="button rounded-full text-sm" href="/categories">{u(locale,"Browse categories")}<Icon name="arrow" /></Link></div> : result.search?<SearchJourney key={result.search.searchId} searchId={result.search.searchId} query={q} locale={locale} page={page} products={result.products.map(p=>p._id)}>{productResults}</SearchJourney>:productResults}
        <div className="mt-5 flex items-start gap-3 rounded-2xl border p-4 text-xs leading-relaxed"><Icon name="phone" /><p className="m-0">{u(locale,"Need help finding a product? ")}<Link className="font-semibold" href="/contact">{u(locale,"Contact Al Mina Pharmacy")}</Link>{u(locale," for product and delivery enquiries.")}</p></div>
        {editorial ? <section className="mt-6 rounded-2xl border bg-white p-5 md:p-7"><h2 className="mb-3 text-xl">{locale === "en" ? `Choosing your ${title.toLowerCase()} essentials` : `اختيار احتياجاتك من ${title}`}</h2><p className="max-w-prose text-sm leading-7">{editorial.body}</p><nav className="my-4 flex flex-wrap gap-2" aria-label={u(locale,"Explore related searches")}>{editorial.topics.map(topic=><Link className="inline-flex min-h-11 items-center rounded-full border bg-white px-4 text-xs transition-colors" href={'/search?'+new URLSearchParams({q:topic,category:category!})} key={topic}>{topic}</Link>)}</nav>{editorial.faqs.map(faq=><details key={faq.question} className="border-t py-3"><summary className="cursor-pointer text-sm font-medium">{faq.question}</summary><p className="mt-3 mb-0 text-sm leading-7">{faq.answer}</p></details>)}</section> : null}
        {page > 1 || result.hasNext ? <nav className="catalog-pagination mt-6 flex flex-wrap items-center justify-between gap-3 border-t py-5 text-xs" aria-label={u(locale,"Product pages")}><span>{locale === "en" ? `Page ${page} · ${result.products.length} ${result.products.length===1?'product':'products'} shown` : `الصفحة ${page} · عرض ${result.products.length} منتجات`}</span><div className="flex items-center gap-2">{page>1 ? <Link className="inline-flex min-h-11 items-center rounded-full border px-4" href={pageHref(page-1)}>{u(locale,"Previous page")}</Link>:null}<span className="rounded-full px-4 py-2 font-semibold text-white">{page}</span>{result.hasNext ? <Link className="inline-flex min-h-11 items-center rounded-full border px-4" href={pageHref(page+1)}>{u(locale,"Next page ")}<Icon name="arrow" /></Link>:null}</div></nav> : null}
      </div>
    </div>
  </div>;
}
