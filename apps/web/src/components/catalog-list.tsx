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
  return <div className="catalog-page"><Breadcrumb title={title} parents={parents} /><StorefrontIntro title={title} description={offers ? 'Explore current offers from Al Mina. Real savings, with the current price shown on every product.' : q ? `Find the right match for “${q}”. Browse the results or narrow your search.` : editorial?.description ?? 'Explore products for your health, care and daily routine.'} artwork={offers ? 'care' : /baby/i.test(title) ? 'family' : /skin|cosmetic/i.test(title) ? 'skin' : 'none'}><span className="text-xs text-muted">Page {page} · {result.products.length} products shown</span></StorefrontIntro>
    <nav className="catalog-category-links scrollbar-none mb-4 flex gap-2 overflow-x-auto pb-2 text-xs md:mb-6 md:flex-wrap" aria-label="Browse categories">{categories.slice(0,8).map(cat=><Link className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-border bg-surface px-3 py-1.5 text-ocean aria-[current=page]:border-teal aria-[current=page]:bg-teal aria-[current=page]:text-white" href={categoryHref(cat)} key={cat._id} aria-current={selected===cat._id?'page':undefined}>{cat.name}</Link>)}</nav>
    <div className="catalog-layout grid min-w-0 gap-4 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start lg:gap-5 [&_.product-grid]:lg:grid-cols-3">
      <details id="catalog-filters" key={`${q}:${selected}:${inStock}:${minPrice}:${maxPrice}:${sort}`} className="catalog-filters rounded-2xl border border-border bg-surface lg:sticky lg:top-6" open={Boolean(activeFilters)||title==='Search'}><summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 text-sm font-semibold text-ocean"><Icon name="filter" />Filters{activeFilters ? <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] text-white">{activeFilters}</span>:null}<span className="ml-auto text-xs font-normal">Search, availability &amp; price</span></summary>
      <form className="filters grid gap-5 border-t border-border p-4 lg:border-0 lg:p-5" method="get" role="search" aria-label="Filter products"><div className="filter-panel-heading flex items-center justify-between gap-3 border-b border-border pb-3"><h2 className="m-0 flex items-center gap-2 text-lg font-semibold text-ocean"><Icon name="filter" />Filters</h2>{activeFilters ? <Link className="filter-reset inline-flex min-h-11 items-center text-xs font-semibold text-brand" href="?">Clear filters</Link>:null}</div>
      <label className="text-sm font-semibold text-ocean">Search products<input className="rounded-lg border-border text-sm" type="search" placeholder="Search products" name="q" defaultValue={q} maxLength={80} /></label>
      <label className="text-sm font-semibold text-ocean">Category<select className="rounded-lg border-border text-sm" name="category" disabled={Boolean(category)} defaultValue={selected}><option value="">All categories</option>{categories.map(cat=><option value={cat._id} key={cat._id}>{cat.name}</option>)}</select></label>
      {category ? <input type="hidden" name="category" value={category} />:null}
      <label className="flex min-h-10 items-center gap-2 text-sm text-ocean"><input className="size-4 rounded border-border" type="checkbox" name="inStock" value="true" defaultChecked={inStock} />In stock</label>
      <fieldset className="grid grid-cols-2 gap-2"><legend className="mb-2 text-sm font-semibold text-ocean">Price range (AED)</legend><label className="text-xs text-muted">From<input className="mt-1 w-full rounded-lg border-border text-sm" type="number" name="minPrice" min="0" max="999999" step="0.01" defaultValue={minPrice} /></label><label className="text-xs text-muted">To<input className="mt-1 w-full rounded-lg border-border text-sm" type="number" name="maxPrice" min="0" max="999999" step="0.01" defaultValue={maxPrice} /></label></fieldset>
      <label className="text-sm font-semibold text-ocean">Sort by<select className="rounded-lg border-border text-sm" name="sort" defaultValue={sort}><option value="relevance">Recommended</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name</option></select></label>
      <button className="min-h-11 rounded-full text-sm" type="submit">Apply filters</button>
      <div className="hidden flex-col gap-1 border-t border-border pt-4 lg:flex"><h3 className="mb-2 text-sm font-semibold text-ocean">Explore categories</h3>{categories.map(cat=><Link className="flex min-h-9 items-center gap-2 text-xs text-ocean" href={categoryHref(cat)} key={cat._id}><span className="size-3 shrink-0 rounded-sm border border-border bg-subtle" />{cat.name}</Link>)}</div></form></details>
      <div className="catalog-results min-w-0">{q ? <p className="catalog-result-label mb-4 text-sm text-ocean">Results for “{q}”</p>:null}{offers && !result.products.length && !q && !selected ? <div className="rounded-2xl border border-border bg-white p-6 text-center md:p-10"><h2 className="mb-3 text-2xl font-semibold">No current offers</h2><p className="mb-5 text-sm text-muted">There are no active product offers to show right now. Explore the full range for your everyday essentials.</p><Link className="button rounded-full text-sm" href="/products">Explore all products <Icon name="arrow" /></Link></div> : <ProductGrid products={result.products} />}
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-border bg-[#eeedfc] p-4 text-xs leading-relaxed text-ocean"><Icon name="phone" /><p className="m-0">Need help finding a product? <Link className="font-semibold text-brand hover:text-brand-hover" href="/contact">Contact Al Mina Pharmacy</Link> for product and delivery enquiries.</p></div>
        {editorial ? <section className="mt-6 rounded-2xl bg-white p-5 md:p-7"><h2 className="mb-3 text-xl">Choosing your {title.toLowerCase()} essentials</h2><p className="max-w-prose text-sm leading-7 text-muted">{editorial.body}</p><nav className="my-4 flex flex-wrap gap-2" aria-label="Explore related searches">{editorial.topics.map(topic=><Link className="inline-flex min-h-11 items-center rounded-full border border-border px-4 text-xs" href={'/search?'+new URLSearchParams({q:topic,category:category!})} key={topic}>{topic}</Link>)}</nav>{editorial.faqs.map(faq=><details key={faq.question} className="border-t border-border py-3"><summary className="cursor-pointer text-sm font-medium">{faq.question}</summary><p className="mt-3 mb-0 text-sm leading-7 text-muted">{faq.answer}</p></details>)}</section> : null}
        <nav className="catalog-pagination mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border py-5 text-xs text-ocean" aria-label="Product pages"><span>Page {page} · {result.products.length} products shown</span><div className="flex items-center gap-2">{page>1 ? <Link className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-3" href={pageHref(page-1)}>Previous page</Link>:null}<span className="rounded-lg bg-brand px-4 py-2 font-semibold text-white">{page}</span>{result.hasNext ? <Link className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-3" href={pageHref(page+1)}>Next page <Icon name="arrow" /></Link>:null}</div></nav>
      </div>
    </div>
  </div>;
}
