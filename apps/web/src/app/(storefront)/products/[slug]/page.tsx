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
    <Breadcrumb title={product.name} parents={[{ name: 'Categories', path: '/categories' }, { name: product.category.name, path: categoryHref(product.category) }]} /><div className="grid gap-8 md:grid-cols-2 lg:gap-12"><ProductGallery images={productImages(product)} name={product.name} />
    <div className="product-information min-w-0 [&_.stock-state]:mb-6 [&_.stock-state]:text-sm [&_.cart-controls]:max-w-[400px] [&_.cart-controls_label]:mb-4 [&_input]:max-w-[120px]"><Link className="eyebrow" href={categoryHref(product.category)}>{product.category.name}</Link><h1 className="mt-3 wrap-anywhere">{product.name}</h1><p className="price mt-6 mb-3 flex flex-wrap items-baseline gap-2 text-[2rem] font-bold leading-[1.3] text-ink tabular-nums [&_del]:text-sm [&_del]:font-normal [&_del]:text-muted">{money(displayPrice(product))} {product.sale && product.salePrice !== undefined && product.salePrice < product.price ? <del>{money(product.price)}</del> : null}</p><StockState stock={product.stock} /><AddToCart id={product._id} stock={product.stock} quantityPicker /><p className="my-4 text-sm text-muted">Availability is checked when you add to cart.</p><h2 className="mt-6 border-t border-border pt-6 text-xl">Product description</h2><p className="whitespace-pre-wrap text-muted wrap-anywhere">{product.description || 'No description available.'}</p></div></div>
    <div className="section-heading mt-12"><h2>Similar products</h2></div><ProductGrid headingLevel={3} products={related.products.filter(item => item._id !== product._id).slice(0, 10)} /></>;
}
