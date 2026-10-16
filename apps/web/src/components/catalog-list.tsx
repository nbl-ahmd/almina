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
  const [result, categories] = await Promise.all([getProducts({ page, q, offers, category: selected }), getCategories()]);
  function pageHref(next: number) {
    const query = new URLSearchParams();
    if (q) query.set('q', q);
    if (selected && !category) query.set('category', selected);
    query.set('page', String(next));
    return `?${query}`;
  }
  return <div className="catalog-page"><Breadcrumb title={title} parents={parents} /><div className="catalog-heading mb-4 flex items-start justify-between gap-3 border-b border-border pb-4 md:mb-6 md:pb-6"><div><span className="mb-3 hidden w-fit items-center gap-2 rounded-full border border-border bg-accent/20 px-3 py-1 text-xs text-teal md:flex"><Icon name="pin" />Al Mina Pharmacy · Ras Al Khaimah</span><div className="flex items-center gap-3"><Link className="flex min-h-11 min-w-8 items-center text-ink md:hidden" href="/products" aria-label="Back to products"><Icon name="back" /></Link><h1 className="mb-2 text-xl font-bold tracking-tight md:text-3xl">{title}</h1></div><p className="mb-0 hidden max-w-[70ch] text-sm leading-relaxed text-ocean md:block">Explore products for your health, care and daily routine.</p><span className="text-xs text-ocean md:hidden">Showing {result.products.length} products on this page</span></div><Link className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-subtle text-ocean md:hidden" href="/search" aria-label="Search products"><Icon name="search" /></Link><span className="hidden rounded-lg border border-border bg-surface px-4 py-2 text-sm text-ocean md:block">Page {page}</span></div>
    <nav className="catalog-category-links mb-4 flex gap-2 overflow-x-auto pb-2 text-xs md:mb-6 md:flex-wrap" aria-label="Browse categories">{categories.slice(0,8).map(cat=><Link className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-border bg-surface px-3 py-1.5 text-ocean aria-[current=page]:border-teal aria-[current=page]:bg-teal aria-[current=page]:text-white" href={categoryHref(cat)} key={cat._id} aria-current={selected===cat._id?'page':undefined}>{cat.name}</Link>)}</nav>
    <div className="catalog-layout grid min-w-0 gap-4 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start lg:gap-5 [&_.product-grid]:lg:grid-cols-3">
      <details id="catalog-filters" key={`${q}:${selected}`} className="catalog-filters rounded-lg border border-border bg-surface lg:sticky lg:top-6" open={Boolean(q||(!category&&selected))||title==='Search'}><summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 text-sm font-semibold text-ocean lg:hidden"><Icon name="filter" />Filters{q||selected ? <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] text-white">{Number(Boolean(q))+Number(Boolean(selected))}</span>:null}<span className="ml-auto text-xs font-normal">Search &amp; category</span></summary>
      <form className="filters grid gap-5 border-t border-border p-4 lg:border-0 lg:p-5" method="get" role="search" aria-label="Filter products"><div className="filter-panel-heading flex items-center justify-between gap-3 border-b border-border pb-3"><h2 className="m-0 flex items-center gap-2 text-lg font-semibold text-ocean"><Icon name="filter" />Filters</h2>{q||(!category&&selected) ? <Link className="filter-reset inline-flex min-h-11 items-center text-xs font-semibold text-brand" href="?">Clear filters</Link>:null}</div>
      <label className="text-sm font-semibold text-ocean">Search products<input className="rounded-lg border-border text-sm" type="search" placeholder="Search products" name="q" defaultValue={q} maxLength={80} /></label>
      <label className="text-sm font-semibold text-ocean">Category<select className="rounded-lg border-border text-sm" name="category" disabled={Boolean(category)} defaultValue={selected}><option value="">All categories</option>{categories.map(cat=><option value={cat._id} key={cat._id}>{cat.name}</option>)}</select></label><button className="min-h-11 rounded-full text-sm" type="submit">Apply</button>
      <div className="hidden flex-col gap-1 border-t border-border pt-4 lg:flex"><h3 className="mb-2 text-sm font-semibold text-ocean">Explore categories</h3>{categories.map(cat=><Link className="flex min-h-9 items-center gap-2 text-xs text-ocean" href={categoryHref(cat)} key={cat._id}><span className="size-3 shrink-0 rounded-sm border border-border bg-subtle" />{cat.name}</Link>)}</div></form></details>
      <div className="catalog-results min-w-0">{q ? <p className="catalog-result-label mb-4 text-sm text-ocean">Results for “{q}”</p>:null}<ProductGrid products={result.products} />
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-border bg-subtle p-4 text-xs leading-relaxed text-ocean"><Icon name="phone" /><p className="m-0">Need help finding a product? <Link className="font-semibold text-ocean underline" href="/contact">Contact Al Mina Pharmacy</Link> for product and delivery enquiries.</p></div>
        <nav className="catalog-pagination mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border py-5 text-xs text-ocean" aria-label="Product pages"><span>Page {page} · {result.products.length} products shown</span><div className="flex items-center gap-2">{page>1 ? <Link className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-3" href={pageHref(page-1)}>Previous page</Link>:null}<span className="rounded-lg bg-brand px-4 py-2 font-semibold text-white">{page}</span>{result.hasNext ? <Link className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-3" href={pageHref(page+1)}>Next page <Icon name="arrow" /></Link>:null}</div></nav>
      </div>
    </div>
  </div>;
}
