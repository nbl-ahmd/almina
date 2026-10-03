import { ProductGallery } from '../../../../components/product-gallery';
import Link from 'next/link';
import { permanentRedirect } from 'next/navigation';
import { getProducts, productImages } from '../../../../lib/server/catalog';
import { resolveProductRoute } from '../../../../lib/server/product-route';
import { metadataFor } from '../../../../lib/server/seo';
import { getWebEnvironment } from '../../../../lib/server/env';
import { breadcrumbData, productData, type Query } from '../../../../lib/seo';
import { StructuredData } from '../../../../components/structured-data';
import { categoryHref, productHref, money, displayPrice } from '../../../../lib/catalog/model';
import { ProductGrid, Breadcrumb, StockState } from '../../../../components/storefront';
import { AddToCart } from '../../../../components/cart-controls';
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Query> };
export async function generateMetadata({ params, searchParams }: Props) {
  const product = await resolveProductRoute((await params).slug);
  const image = productImages(product).find(image => !image.startsWith('/'));
  return metadataFor(product.name, product.description?.slice(0, 160) || `Explore ${product.name} in ${product.category.name} at Al Mina Pharmacy.`, productHref(product), await searchParams, image);
}
export default async function ProductPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const product = await resolveProductRoute(slug);
  if (`/products/${slug}` !== productHref(product) && getWebEnvironment().STOREFRONT_REDIRECTS_VERIFIED) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
      if (typeof value === 'string') query.append(key, value);
      else if (Array.isArray(value)) for (const item of value) query.append(key, item);
    }
    permanentRedirect(`${productHref(product)}${query.size ? `?${query}` : ''}`);
  }
  const related = await getProducts({ category: product.category._id });
  const origin = getWebEnvironment().WEB_ORIGIN;
  return <><StructuredData data={productData(origin, product, productImages(product).filter(image => !image.startsWith('/')))} />
    <StructuredData data={breadcrumbData(origin, [{ name: 'Home', path: '/' }, { name: 'Categories', path: '/categories' }, { name: product.category.name, path: categoryHref(product.category) }, { name: product.name, path: productHref(product) }])} />
    <Breadcrumb title={product.name} parents={[{ name: 'Categories', path: '/categories' }, { name: product.category.name, path: categoryHref(product.category) }]} /><div className="product-detail"><ProductGallery images={productImages(product)} name={product.name} />
    <div className="product-information"><Link className="eyebrow" href={categoryHref(product.category)}>{product.category.name}</Link><h1>{product.name}</h1><p className="price">{money(displayPrice(product))} {product.salePrice ? <del>{money(product.price)}</del> : null}</p><StockState stock={product.stock} /><AddToCart id={product._id} stock={product.stock} quantityPicker /><p className="purchase-note">Availability is checked when you add to cart.</p><h2>Product description</h2><p className="description">{product.description || 'No description available.'}</p></div></div>
    <div className="section-heading related-heading"><h2>Similar products</h2></div><ProductGrid headingLevel={3} products={related.products.filter(item => item._id !== product._id).slice(0, 10)} /></>;
}
