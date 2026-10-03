import Image from 'next/image';
import Link from 'next/link';
import { categoryHref, productHref, money, displayPrice, type Category, type Product } from '../lib/catalog/model';
import { productImage, categoryImage } from '../lib/server/catalog';
import { AddToCart } from './cart-controls';
import { Icon } from './icon';
export function StockState({ stock }: { stock: number }) {
  return <p className={`stock-state ${stock > 0 ? 'in-stock' : 'out-stock'}`}>{stock > 0 ? <><Icon name="check" />In stock</> : 'Out of stock'}</p>;
}
export function ProductGrid({ products, headingLevel = 2 }: { products: Product[]; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 3 ? 'h3' : 'h2';
  return products.length ? <div className="product-grid">{products.map(product => <article className="product-card" key={product._id}>
    <div className="product-media">{product.sale ? <span className="badge sale-badge">{product.saleBadge || 'Sale'}</span> : product.featured ? <span className="badge">Featured</span> : null}
      <Link href={productHref(product)} aria-label={`View ${product.name}`}><Image src={productImage(product)} alt={product.name} width={240} height={240} sizes="(max-width: 767px) 45vw, (max-width: 1023px) 30vw, (max-width: 1439px) 23vw, 240px" /></Link></div>
    <div className="product-card-content"><Link className="category-name" href={categoryHref(product.category)}>{product.category.name}</Link>
      <Heading><Link href={productHref(product)}>{product.name}</Link></Heading>
      <p className="price"><span>{money(displayPrice(product))}</span>{product.salePrice ? <del>{money(product.price)}</del> : null}</p>
      <StockState stock={product.stock} /><AddToCart id={product._id} stock={product.stock} name={product.name} />
    </div></article>)}</div> : <div className="empty-state"><Icon name="search" /><Heading>No products found.</Heading><p>Try a different search or explore another category.</p><Link className="button button-secondary" href="/products">Browse all products</Link></div>;
}
export function CategoryGrid({ categories }: { categories: Category[] }) {
  return categories.length ? <div className="category-grid">{categories.map(category => <Link className="category-card" key={category._id} href={categoryHref(category)}>
    <div className="category-media">{category.image ? <Image src={categoryImage(category.image)} alt="" width={120} height={120} sizes="(max-width: 767px) 80px, 120px" /> : <Icon name="leaf" />}</div><span>{category.name}</span><Icon name="arrow" />
  </Link>)}</div> : <div className="empty-state"><h2>Categories are not available yet</h2><Link className="button button-secondary" href="/products">Browse all products</Link></div>;
}
export function Breadcrumb({ title, parents = [] }: { title: string; parents?: { name: string; path: string }[] }) {
  return <nav className="breadcrumb" aria-label="Breadcrumb"><ol><li><Link href="/">Home</Link></li>{parents.map(item => <li key={item.path}><Link href={item.path}>{item.name}</Link></li>)}<li aria-current="page">{title}</li></ol></nav>;
}
