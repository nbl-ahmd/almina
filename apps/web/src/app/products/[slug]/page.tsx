import { ProductGallery } from '../../../components/product-gallery';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { resolveProduct, getProducts, productImages } from '../../../lib/server/catalog';
import { categoryHref, productHref, money, displayPrice } from '../../../lib/catalog/model';
import { ProductGrid, Breadcrumb } from '../../../components/storefront';
import { AddToCart } from '../../../components/cart-controls';
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const product = await resolveProduct((await params).slug);
  return { title: product?.name ?? 'Product not found', description: product?.description?.slice(0, 160), alternates: product ? { canonical: productHref(product) } : undefined };
}
export default async function ProductPage({ params }: Props) {
  const product = await resolveProduct((await params).slug);
  if (!product) notFound();
  const related = await getProducts({ category: product.category._id });
  return <><Breadcrumb title={product.name} /><div className="product-detail"><ProductGallery images={productImages(product)} name={product.name} />
    <div><h1>{product.name}</h1><Link href={categoryHref(product.category)}>{product.category.name}</Link><p className="price">{money(displayPrice(product))} {product.salePrice ? <del>{money(product.price)}</del> : null}</p><AddToCart id={product._id} stock={product.stock} quantityPicker /><h2>Product description</h2><p className="description">{product.description || 'No description available.'}</p></div></div>
    <h2>Similar products</h2><ProductGrid products={related.products.filter(item => item._id !== product._id).slice(0, 10)} /></>;
}
