import Image from 'next/image';
import Link from 'next/link';
import { categoryHref, productHref, money, displayPrice, type Category, type Product } from '../lib/catalog/model';
import { productImage, categoryImage } from '../lib/server/catalog';
import { AddToCart } from './cart-controls';
import { Icon } from './icon';
export function StockState({ stock }: { stock: number }) {
  return <p className={`stock-state mb-3 flex items-center gap-1 text-xs font-bold [&_.icon]:size-4 ${stock > 0 ? 'in-stock text-brand' : 'out-stock text-warning'}`}>{stock > 0 ? <><Icon name="check" />In stock</> : 'Out of stock'}</p>;
}
export function ProductGrid({ products, headingLevel = 2 }: { products: Product[]; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  return products.length ? <div className="product-grid grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 lg:gap-6 min-[1440px]:grid-cols-5">{products.map(product => <article className="product-card flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface" key={product._id}>
    <div className="product-media relative border-b border-subtle bg-surface p-3 [&_a]:block [&_img]:block [&_img]:aspect-square [&_img]:h-auto [&_img]:w-full [&_img]:object-contain">{product.sale ? <span className="badge sale-badge absolute top-2 left-2 z-10 max-w-[calc(100%_-_1rem)] rounded bg-sale-surface px-2 py-1 text-xs font-bold text-sale wrap-anywhere">{product.saleBadge || 'Sale'}</span> : product.featured ? <span className="badge absolute top-2 left-2 z-10 max-w-[calc(100%_-_1rem)] rounded bg-subtle px-2 py-1 text-xs font-bold text-brand wrap-anywhere">Featured</span> : null}
      <Link href={productHref(product)} aria-label={`View ${product.name}`}><Image src={productImage(product)} alt={product.name} width={240} height={240} sizes="(max-width: 767px) 45vw, (max-width: 1023px) 30vw, (max-width: 1439px) 23vw, 240px" /></Link></div>
    <div className="product-card-content flex flex-1 flex-col p-3 md:p-4"><Link className="category-name" href={categoryHref(product.category)}>{product.category.name}</Link>
      <Heading className="my-2 mb-3 text-base leading-snug wrap-anywhere [&_a]:block [&_a]:min-h-11 [&_a]:text-ink"><Link href={productHref(product)}>{product.name}</Link></Heading>
      <p className="price"><span>{money(displayPrice(product))}</span>{product.sale && product.salePrice !== undefined && product.salePrice < product.price ? <del>{money(product.price)}</del> : null}</p>
      <StockState stock={product.stock} /><AddToCart id={product._id} stock={product.stock} name={product.name} />
    </div></article>)}</div> : <div className="empty-state"><Icon name="search" /><Heading>No products found.</Heading><p>Try a different search or explore another category.</p><Link className="button button-secondary" href="/products">Browse all products</Link></div>;
}
export function CategoryGrid({ categories }: { categories: Category[] }) {
  return categories.length ? <div className="category-grid grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4 min-[1440px]:grid-cols-5">{categories.map(category => <Link className="category-card relative flex min-h-24 min-w-0 items-center gap-3 rounded-xl border border-line bg-surface p-3 font-bold text-ink hover:bg-subtle" key={category._id} href={categoryHref(category)}>
    <div className="category-media flex size-10 shrink-0 items-center justify-center sm:size-14 [&>.icon]:size-8 [&>.icon]:text-brand [&_img]:size-full [&_img]:object-contain">{category.image ? <Image src={categoryImage(category.image)} alt="" width={120} height={120} sizes="(max-width: 639px) 40px, 56px" /> : <Icon name="leaf" />}</div><span className="min-w-0 text-sm leading-snug wrap-anywhere">{category.name}</span>
  </Link>)}</div> : <div className="empty-state"><h2>Categories are not available yet</h2><Link className="button button-secondary" href="/products">Browse all products</Link></div>;
}
export function Breadcrumb({ title, parents = [] }: { title: string; parents?: { name: string; path: string }[] }) {
  return <nav className="breadcrumb" aria-label="Breadcrumb"><ol><li><Link href="/">Home</Link></li>{parents.map(item => <li key={item.path}><Link href={item.path}>{item.name}</Link></li>)}<li aria-current="page">{title}</li></ol></nav>;
}
