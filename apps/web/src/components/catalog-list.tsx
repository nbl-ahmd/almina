import Link from 'next/link';
import { getCategories, getProducts } from '../lib/server/catalog';
import { ProductGrid, Breadcrumb } from './storefront';
export type SearchParams = Record<string, string | string[] | undefined>;
export function scalar(value: string | string[] | undefined) { return typeof value === 'string' ? value : ''; }
export async function CatalogList({ title, params, offers = false, category, parents = [] }: { title: string; params: SearchParams; offers?: boolean; category?: string; parents?: { name: string; path: string }[] }) {
  const pageValue = Number(scalar(params.page));
  const page = Number.isInteger(pageValue) && pageValue > 0 && pageValue <= 1000 ? pageValue : 1;
  const q = scalar(params.q).trim().slice(0, 100);
  const selected = category ?? scalar(params.category);
  const [result, categories] = await Promise.all([getProducts({ page, q, offers, category: selected }), getCategories()]);
  function pageHref(next: number) {
    const query = new URLSearchParams();
    if (q) query.set('q', q);
    if (selected && !category) query.set('category', selected);
    query.set('page', String(next));
    return `?${query}`;
  }
  return <><Breadcrumb title={title} parents={parents} /><h1>{title}</h1>
    {!category ? <form className="filters" method="get"><label>Search products<input name="q" defaultValue={q} maxLength={100} /></label>
      <label>Category<select name="category" defaultValue={selected}><option value="">All categories</option>{categories.map(cat => <option value={cat._id} key={cat._id}>{cat.name}</option>)}</select></label><button>Apply</button></form> : null}
    {q ? <p>Results for “{q}”</p> : null}<ProductGrid products={result.products} />
    <nav className="pagination" aria-label="Product pages">{page > 1 ? <Link href={pageHref(page - 1)}>Previous page</Link> : null}<span>Page {page}</span>{result.hasNext ? <Link href={pageHref(page + 1)}>Next page</Link> : null}</nav>
  </>;
}
