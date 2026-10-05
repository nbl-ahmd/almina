import Link from 'next/link';
import { getCategories, getProducts } from '../lib/server/catalog';
import { ProductGrid, Breadcrumb } from './storefront';
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
  return <><Breadcrumb title={title} parents={parents} /><div className="page-heading"><p className="eyebrow">THE PHARMACY COLLECTION</p><h1>{title}</h1><p>Explore products for your health, care and daily routine.</p></div>
    {!category ? <form key={`${q}:${selected}`} className="filters mb-6 grid grid-cols-2 gap-4 rounded-xl border border-border bg-subtle p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end md:p-6" method="get" role="search" aria-label="Filter products"><label>Search products<input type="search" placeholder="What are you looking for?" name="q" defaultValue={q} maxLength={80} /></label>
      <label>Category<select name="category" defaultValue={selected}><option value="">All categories</option>{categories.map(cat => <option value={cat._id} key={cat._id}>{cat.name}</option>)}</select></label><button className="col-span-full md:col-span-1" type="submit">Apply</button>{q || selected ? <Link className="col-span-full flex min-h-11 items-center justify-center text-sm font-bold md:justify-start" href="?">Clear filters</Link> : null}</form> : null}
    {q ? <p className="text-muted">Results for “{q}”</p> : null}<ProductGrid products={result.products} />
    <nav className="my-8 flex flex-wrap items-center justify-center gap-4 text-sm [&_a]:inline-flex [&_a]:min-h-12 [&_a]:items-center [&_a]:rounded-lg [&_a]:border [&_a]:border-border [&_a]:bg-surface [&_a]:px-4 [&_a]:py-2" aria-label="Product pages">{page > 1 ? <Link href={pageHref(page - 1)}>Previous page</Link> : null}<span>Page {page}</span>{result.hasNext ? <Link href={pageHref(page + 1)}>Next page</Link> : null}</nav>
  </>;
}
