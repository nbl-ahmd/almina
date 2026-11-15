import { getLocale } from '../lib/server/i18n';
import { shopText as u } from '../lib/i18n-storefront';
import { CategoryTile } from './category-tile';
import { ProductCard } from './product-card';
import Link from './app-link';
import { type Category, type Product } from '../lib/catalog/model';
import { Icon } from './icon';

export async function StockState({ stock }: { stock: number }) {
  const locale = await getLocale();
  return <p className={`stock-state mb-3 flex items-center gap-1.5 text-xs leading-relaxed ${stock > 0 ? 'in-stock text-teal' : 'out-stock text-warning'}`}>{stock > 0 ? <><span className="stock-dot size-1.5 shrink-0 rounded-full bg-teal" />{u(locale,"In stock")}</> : u(locale,"Out of stock")}</p>;
}
export async function ProductGrid({ products, headingLevel = 2, variant: _variant = 'catalog' }: { products: Product[]; headingLevel?: 2 | 3; variant?: 'catalog' | 'home' }) {
  const locale = await getLocale();
  void _variant;
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  return products.length ? <div className="product-grid grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">{products.map(product=><ProductCard key={product._id} product={product} headingLevel={headingLevel} />)}</div> : <div className="empty-state rounded-2xl"><Icon name="search" /><Heading>{u(locale,"No products found.")}</Heading><p>{u(locale,"Try a different search or explore another category.")}</p><Link className="button button-secondary" href="/categories">{u(locale,"Browse categories")}</Link></div>;
}
export async function CategoryGrid({ categories, rail = false }: { categories: Category[]; rail?: boolean }) {
  const locale = await getLocale();
  return categories.length ? <div className={rail ? 'scrollbar-none grid auto-cols-[160px] grid-flow-col grid-rows-2 gap-3 overflow-x-auto pb-2 md:auto-cols-[220px]' : 'grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4'}>{categories.map(category => <CategoryTile key={category._id} category={category} headingLevel={2} />)}</div> : <div className="empty-state rounded-2xl"><h2>{u(locale,"Categories are not available yet")}</h2><Link className="button button-secondary" href="/categories">{u(locale,"Browse categories")}</Link></div>;
}
export async function Breadcrumb({ title, parents = [] }: { title: string; parents?: { name: string; path: string }[] }) {
  const locale = await getLocale();
  return <nav className="breadcrumb mb-3 hidden text-xs text-muted md:block" aria-label={u(locale,"Breadcrumb")}><ol className="m-0 flex list-none flex-wrap gap-2 p-0"><li><Link className="inline-flex min-h-7 items-center text-ocean" href="/">{u(locale,"Home")}</Link></li>{parents.map(item => <li className="wrap-anywhere before:mr-2 before:content-['›']" key={item.path}><Link className="inline-flex min-h-7 items-center text-ocean" href={item.path}>{u(locale,item.name)}</Link></li>)}<li className="inline-flex min-h-7 items-center wrap-anywhere before:mr-2 before:content-['›']" aria-current="page">{title}</li></ol></nav>;
}
