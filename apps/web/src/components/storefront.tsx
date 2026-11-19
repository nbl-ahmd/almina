import { ChevronRightIcon } from '@heroicons/react/24/outline';
import information from './storefront-information.module.css';
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
export async function CategoryGrid({ categories }: { categories: Category[] }) {
  const locale = await getLocale();
  return categories.length ? <div className={information.directory}>
    {categories.map(category => <CategoryTile key={category._id} category={category} />)}
  </div> : <div className={`${information.panel} ${information.state}`}>
    <h3>{u(locale, 'Categories are not available yet')}</h3>
    <Link className="inline-flex min-h-11 items-center text-sm font-medium text-teal hover:text-ink" href="/products">{u(locale, 'Browse products')}</Link>
  </div>;
}
export async function Breadcrumb({ title, parents = [] }: { title: string; parents?: { name: string; path: string }[] }) {
  const locale = await getLocale();
  const separator = <ChevronRightIcon className="size-3 shrink-0 rtl:rotate-180" aria-hidden="true" />;
  return (
    <nav className="breadcrumb mb-3 hidden text-xs text-muted md:block" aria-label={u(locale, 'Breadcrumb')}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-2 p-0">
        <li><Link className="inline-flex min-h-7 items-center text-ocean" href="/">{u(locale, 'Home')}</Link></li>
        {parents.map(item => (
          <li className="inline-flex min-h-7 min-w-0 items-center gap-2 wrap-anywhere" key={item.path}>
            {separator}
            <Link className="inline-flex min-h-7 items-center text-ocean" href={item.path}><bdi>{u(locale, item.name)}</bdi></Link>
          </li>
        ))}
        <li className="inline-flex min-h-7 min-w-0 items-center gap-2 wrap-anywhere" aria-current="page">
          {separator}
          <bdi>{title}</bdi>
        </li>
      </ol>
    </nav>
  );
}
