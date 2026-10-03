import Image from 'next/image';
import Link from 'next/link';
import { categoryHref, productHref, money, displayPrice, type Category, type Product } from '../lib/catalog/model';
import { productImage, categoryImage } from '../lib/server/catalog';
import { AddToCart } from './cart-controls';

export function ProductGrid({ products }: { products: Product[] }) {
  return products.length ? <div className="product-grid">{products.map(product => <article className="product-card" key={product._id}>
    {product.sale ? <span className="badge">{product.saleBadge || 'Sale'}</span> : product.featured ? <span className="badge">Featured</span> : null}
    <Link href={productHref(product)}><Image src={productImage(product)} alt={product.name} width={240} height={240} sizes="(max-width: 600px) 45vw, (max-width: 1024px) 30vw, 240px" /></Link>
    <Link className="category-name" href={categoryHref(product.category)}>{product.category.name}</Link>
    <h2><Link href={productHref(product)}>{product.name}</Link></h2>
    <p className="price">{money(displayPrice(product))} {product.salePrice ? <del>{money(product.price)}</del> : null}</p>
    <AddToCart id={product._id} stock={product.stock} />
  </article>)}</div> : <p>No products found.</p>;
}
export function CategoryGrid({ categories }: { categories: Category[] }) {
  return <div className="category-grid">{categories.map(category => <Link className="category-card" key={category._id} href={categoryHref(category)}>
    <Image src={categoryImage(category.image)} alt="" width={120} height={120} sizes="120px" /><span>{category.name}</span>
  </Link>)}</div>;
}
export function Breadcrumb({ title, parents = [] }: { title: string; parents?: { name: string; path: string }[] }) {
  return <nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link>{parents.map(item => <span key={item.path}> / <Link href={item.path}>{item.name}</Link></span>)}<span aria-current="page"> / {title}</span></nav>;
}
