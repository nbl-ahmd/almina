import { GrowthActivity } from './growth-activity';

import { Input } from './ui/input';
import { NativeSelect } from './ui/native-select';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Field, FieldLabel, FieldGroup } from './ui/field';
import { getLocale } from '../lib/server/i18n';
import { shopText as u } from '../lib/i18n-storefront';
import { categoryContent } from '../lib/catalog/category-content';
import { StorefrontIntro } from './storefront-intro';
import Link from 'next/link';
import { getCategories, getProducts } from '../lib/server/catalog';
import { categoryHref } from '../lib/catalog/model';
import { ProductGrid, Breadcrumb } from './storefront';
import { Icon } from './icon';
export type SearchParams = Record<string, string | string[] | undefined>;
export function scalar(value: string | string[] | undefined) { return typeof value === 'string' ? value : ''; }
export async function CatalogList({ title, params, offers = false, category, parents = [] }: { title: string; params: SearchParams; offers?: boolean; category?: string; parents?: { name: string; path: string }[] }) {
  const locale = await getLocale();
  const pageValue = Number(scalar(params.page));
  const page = Number.isInteger(pageValue) && pageValue > 0 && pageValue <= 1000 ? pageValue : 1;
  const q = scalar(params.q).trim().slice(0, 80);
  const selected = category ?? scalar(params.category);
  const inStock = scalar(params.inStock) === 'true' ? true : undefined;
  const amount = (key: string) => { const raw=scalar(params[key]); return /^\d{1,6}(?:\.\d{1,2})?$/.test(raw) ? Number(raw) : undefined; };
  const minPrice=amount('minPrice'), maxPrice=amount('maxPrice');
  const sortValue=scalar(params.sort);
  const sort=['price-asc','price-desc','name'].includes(sortValue) ? sortValue as 'price-asc'|'price-desc'|'name' : 'relevance';
  const activeFilters=Number(Boolean(q))+Number(Boolean(selected))+Number(Boolean(inStock))+Number(minPrice!==undefined)+Number(maxPrice!==undefined)+Number(sort!=='relevance');
  const editorial = category ? categoryContent(title) : null;
  const [result, categories] = await Promise.all([getProducts({ page, q, offers, category: selected, ...(inStock!==undefined?{inStock}:{}), ...(minPrice!==undefined?{minPrice}:{}), ...(maxPrice!==undefined?{maxPrice}:{}), sort }), getCategories()]);
  function pageHref(next: number) {
    const query = new URLSearchParams();
    if (q) query.set('q', q);
    if (selected && !category) query.set('category', selected);
    if (inStock) query.set('inStock','true');
    if (minPrice !== undefined) query.set('minPrice',String(minPrice));
    if (maxPrice !== undefined) query.set('maxPrice',String(maxPrice));
    if (sort !== 'relevance') query.set('sort',sort);
    query.set('page', String(next));
    return `?${query}`;
  }
  return <div className="catalog-page">{q?<GrowthActivity key={`${q}:${page}`} kind="search" matched={result.products.length>0}/>:null}<Breadcrumb title={u(locale,title)} parents={parents} /><StorefrontIntro title={u(locale,title)} description={offers ? u(locale,'Explore current offers from Al Mina. Real savings, with the current price shown on every product.') : q ? locale === "en" ? `Find the right match for “${q}”. Browse the results or narrow your search.` : `اعثر على ما يناسب بحثك عن «${q}». تصفح النتائج أو ضيّق نطاق البحث.` : editorial?.description ?? u(locale,'Explore products for your health, care and daily routine.')} artwork={offers ? 'care' : /baby/i.test(title) ? 'family' : /skin|cosmetic/i.test(title) ? 'skin' : 'none'}><span className="text-xs text-muted">{locale === "en" ? `Page ${page} · ${result.products.length} products shown` : `الصفحة ${page} · عرض ${result.products.length} منتجات`}</span></StorefrontIntro>
    <nav className="catalog-category-links scrollbar-none mb-5 flex gap-2 overflow-x-auto pb-2 text-xs md:mb-6 md:flex-wrap" aria-label={u(locale,"Browse categories")}>{categories.slice(0,8).map(cat=><Link className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-border bg-white px-3.5 py-1.5 text-ink/75 transition-colors hover:border-ink aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-white" href={categoryHref(cat)} key={cat._id} aria-current={selected===cat._id?'page':undefined}>{cat.name}</Link>)}</nav>
    <div className="catalog-layout grid min-w-0 gap-4 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start lg:gap-5 [&_.product-grid]:lg:grid-cols-3">
      <details id="catalog-filters" key={`${q}:${selected}:${inStock}:${minPrice}:${maxPrice}:${sort}`} className="catalog-filters rounded-2xl border border-border bg-surface lg:sticky lg:top-6" open={Boolean(activeFilters)||title==='Search'}><summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-ink"><Icon name="filter" />{u(locale,"Filters")}{activeFilters ? <span className="rounded-full bg-brand px-1.5 py-0.5 text-xs text-ink">{activeFilters}</span>:null}<span className="ml-auto text-xs font-normal">{u(locale,"Search, availability & price")}</span></summary>
      <form className="filters border-t border-border p-4 lg:border-0 lg:p-5" method="get" role="search" aria-label={u(locale,"Filter products")}><FieldGroup className="grid gap-4"><div className="filter-panel-heading flex items-center justify-between gap-3 border-b border-border pb-3"><h2 className="m-0 text-sm font-semibold text-ink">{u(locale,"Refine")}</h2>{activeFilters ? <Link className="filter-reset inline-flex min-h-11 items-center text-xs font-semibold text-teal" href="?">{u(locale,"Clear filters")}</Link>:null}</div>
      <Field><FieldLabel htmlFor="catalog-list-field-1">{u(locale,"Search products")}</FieldLabel><Input id="catalog-list-field-1" type="search" placeholder="Search products" name="q" defaultValue={q} maxLength={80} /></Field>
      <Field><FieldLabel htmlFor="catalog-list-field-2">{u(locale,"Category")}</FieldLabel><NativeSelect id="catalog-list-field-2" name="category" disabled={Boolean(category)} defaultValue={selected}><option value="">{u(locale,"All categories")}</option>{categories.map(cat=><option value={cat._id} key={cat._id}>{cat.name}</option>)}</NativeSelect></Field>
      {category ? <input type="hidden" name="category" value={category} />:null}
      <Field orientation="horizontal" className="min-h-11"><Checkbox id="catalog-list-field-3" name="inStock" value="true" defaultChecked={inStock} /><FieldLabel htmlFor="catalog-list-field-3" className="min-h-11 flex-1 cursor-pointer">{u(locale,"In stock")}</FieldLabel></Field>
      <fieldset className="grid grid-cols-2 gap-2"><legend className="mb-2 text-sm font-semibold text-ocean">{u(locale,"Price range (AED)")}</legend><Field><FieldLabel htmlFor="catalog-list-field-4">{u(locale,"From")}</FieldLabel><Input id="catalog-list-field-4" className="mt-1 w-full" type="number" inputMode="decimal" placeholder="Min" name="minPrice" min="0" max="999999" step="0.01" defaultValue={minPrice} /></Field><Field><FieldLabel htmlFor="catalog-list-field-5">{u(locale,"To")}</FieldLabel><Input id="catalog-list-field-5" className="mt-1 w-full" type="number" inputMode="decimal" placeholder="Max" name="maxPrice" min="0" max="999999" step="0.01" defaultValue={maxPrice} /></Field></fieldset>
      <Field><FieldLabel htmlFor="catalog-list-field-6">{u(locale,"Sort by")}</FieldLabel><NativeSelect id="catalog-list-field-6" name="sort" defaultValue={sort}><option value="relevance">{u(locale,"Recommended")}</option><option value="price-asc">{u(locale,"Price: low to high")}</option><option value="price-desc">{u(locale,"Price: high to low")}</option><option value="name">{u(locale,"Name")}</option></NativeSelect></Field>
      <Button type="submit">{u(locale,"Apply filters")}</Button>
      <div className="hidden flex-col gap-1 border-t border-border pt-4 lg:flex"><h3 className="mb-2 text-sm font-semibold text-ocean">{u(locale,"Explore categories")}</h3>{categories.map(cat=><Link className="flex min-h-9 items-center gap-2 text-xs text-ink/70" href={categoryHref(cat)} key={cat._id}><span className="size-1.5 shrink-0 rounded-full bg-border" />{cat.name}</Link>)}</div></FieldGroup></form></details>
      <div className="catalog-results min-w-0">{q ? <p className="catalog-result-label mb-4 text-sm text-ocean">{locale === "en" ? `Results for “${q}”` : `نتائج البحث عن «${q}»`}</p>:null}{offers && !result.products.length && !q && !selected ? <div className="rounded-2xl border border-border bg-white p-6 text-center md:p-10"><h2 className="mb-3 text-2xl font-semibold">{u(locale,"No current offers")}</h2><p className="mb-5 text-sm text-muted">{u(locale,"There are no active product offers to show right now. Explore the full range for your everyday essentials.")}</p><Link className="button rounded-full text-sm" href="/products">{u(locale,"Explore all products ")}<Icon name="arrow" /></Link></div> : <ProductGrid products={result.products} />}
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-border bg-page p-4 text-xs leading-relaxed text-muted"><Icon name="phone" /><p className="m-0">{u(locale,"Need help finding a product? ")}<Link className="font-semibold text-teal hover:text-teal" href="/contact">{u(locale,"Contact Al Mina Pharmacy")}</Link>{u(locale," for product and delivery enquiries.")}</p></div>
        {editorial ? <section className="mt-6 rounded-2xl border border-border bg-white p-5 md:p-7"><h2 className="mb-3 text-xl">{locale === "en" ? `Choosing your ${title.toLowerCase()} essentials` : `اختيار احتياجاتك من ${title}`}</h2><p className="max-w-prose text-sm leading-7 text-muted">{editorial.body}</p><nav className="my-4 flex flex-wrap gap-2" aria-label={u(locale,"Explore related searches")}>{editorial.topics.map(topic=><Link className="inline-flex min-h-11 items-center rounded-full border border-border bg-white px-4 text-xs transition-colors hover:border-ink" href={'/search?'+new URLSearchParams({q:topic,category:category!})} key={topic}>{topic}</Link>)}</nav>{editorial.faqs.map(faq=><details key={faq.question} className="border-t border-border py-3"><summary className="cursor-pointer text-sm font-medium">{faq.question}</summary><p className="mt-3 mb-0 text-sm leading-7 text-muted">{faq.answer}</p></details>)}</section> : null}
        <nav className="catalog-pagination mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border py-5 text-xs text-ocean" aria-label={u(locale,"Product pages")}><span>{locale === "en" ? `Page ${page} · ${result.products.length} products shown` : `الصفحة ${page} · عرض ${result.products.length} منتجات`}</span><div className="flex items-center gap-2">{page>1 ? <Link className="inline-flex min-h-11 items-center rounded-full border border-border bg-surface px-4" href={pageHref(page-1)}>{u(locale,"Previous page")}</Link>:null}<span className="rounded-full bg-ink px-4 py-2 font-semibold text-white">{page}</span>{result.hasNext ? <Link className="inline-flex min-h-11 items-center rounded-full border border-border bg-surface px-4" href={pageHref(page+1)}>{u(locale,"Next page ")}<Icon name="arrow" /></Link>:null}</div></nav>
      </div>
    </div>
  </div>;
}
