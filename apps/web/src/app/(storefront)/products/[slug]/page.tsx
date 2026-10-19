import { RecordProductView } from '../../../../components/recently-viewed';
import { ProductReviews } from '../../../../components/product-reviews';
import { getProductReviews } from '../../../../lib/server/growth';
import { SaveProduct } from '../../../../components/save-product';
import { ProductInformation } from '../../../../components/product-information';
import { ProductOptions } from '../../../../components/product-options';
import { ProductGallery } from '../../../../components/product-gallery';
import { PhotoCredit } from '../../../../components/photo-credit';
import Link from 'next/link';
import { permanentRedirect } from 'next/navigation';
import { catalogAvailabilityConfirmed, getProductVariants, getProducts, productImages } from '../../../../lib/server/catalog';
import { resolveProductRoute } from '../../../../lib/server/product-route';
import { metadataFor } from '../../../../lib/server/seo';
import { getWebEnvironment } from '../../../../lib/server/env';
import { breadcrumbData, productData, type Query } from '../../../../lib/seo';
import { StructuredData } from '../../../../components/structured-data';
import { categoryHref, productOptionLabel, productHref, money, displayPrice } from '../../../../lib/catalog/model';
import { ProductGrid, Breadcrumb, StockState } from '../../../../components/storefront';
import { Icon } from '../../../../components/icon';
import { AddToCart } from '../../../../components/cart-controls';
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Query> };
export async function generateMetadata({ params, searchParams }: Props) {
  const product = await resolveProductRoute((await params).slug);
  const image = productImages(product).find(image => !image.startsWith('/'));
  const optionLabel = productOptionLabel(product);
  const title = `${(product.seoTitle || product.name).replace(/\s*\|\s*Al Mina Pharmacy\s*$/i, '')}${optionLabel ? ` — ${optionLabel}` : ''}`;
  return metadataFor(title, `${optionLabel ? `${optionLabel}. ` : ''}${product.seoDescription || product.summary || product.description || `Explore ${product.name} in ${product.category.name} at Al Mina Pharmacy.`}`.slice(0,160), productHref(product), await searchParams, image);
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
  const [related,variants,availabilityConfirmed,reviews] = await Promise.all([getProducts({ category: product.category._id }),getProductVariants(product),catalogAvailabilityConfirmed(),getProductReviews(product._id)]);
  const origin = getWebEnvironment().WEB_ORIGIN;
  const currentPrice = displayPrice(product);
  const saving = product.price > currentPrice && product.price > 0 ? Math.round((product.price - currentPrice) / product.price * 100) : 0;
  const structured=productData(origin, product, productImages(product).filter(image => !image.startsWith('/')),variants, Object.fromEntries(variants.map(member=>[member._id,productImages(member).filter(image=>!image.startsWith('/'))])),availabilityConfirmed && getWebEnvironment().CHECKOUT_ENABLED);
  return <><RecordProductView id={product._id} /><StructuredData data={{...structured,...(reviews?.ratingCount?{aggregateRating:{'@type':'AggregateRating',ratingValue:reviews.average,reviewCount:reviews.ratingCount,bestRating:5,worstRating:1}}:{})}} />
    <StructuredData data={breadcrumbData(origin, [{ name: 'Home', path: '/' }, { name: 'Categories', path: '/categories' }, { name: product.category.name, path: categoryHref(product.category) }, { name: product.name, path: productHref(product) }])} />
    <div className="pdp-page pb-24 md:pb-0"><Breadcrumb title={product.name} parents={[{ name: 'Categories', path: '/categories' }, { name: product.category.name, path: categoryHref(product.category) }]} />
    <div className="product-detail mb-8 grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-10">
      <div className="product-visual min-w-0 md:sticky md:top-6"><ProductGallery images={productImages(product)} name={product.name} cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} />

        {productImages(product).some(image => !image.startsWith('/')) ? <PhotoCredit source={product.imageSource} /> : null}
      </div>
      <div className="product-information min-w-0 rounded-2xl bg-white p-4 md:p-6"><div className="product-identity mb-3 flex flex-wrap items-center gap-2 text-xs"><Link className="rounded-full bg-subtle px-3 py-1.5 text-brand" href={categoryHref(product.category)}>{product.category.name}</Link>{product.brand || product.familyBrand ? <Link className="inline-flex min-h-9 items-center px-1 text-muted hover:text-brand" href={`/search?q=${encodeURIComponent(product.brand || product.familyBrand || '')}`}>{product.brand || product.familyBrand}</Link> : null}</div><h1 className="mb-3 text-2xl leading-tight font-semibold tracking-tight wrap-anywhere md:text-[32px]">{product.name}</h1>{product.summary || product.description ? <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-ocean">{product.summary || product.description?.split('\n')[0]}</p> : null}
        <div className="mb-4 flex items-center justify-between border-b border-border pb-3 [&_.stock-state]:mb-0"><StockState stock={product.stock} /><span className="text-xs text-muted">SKU: {product.product_id}</span></div>
        <ProductOptions product={product} variants={variants} />
        <div className="product-price-panel mb-5 flex flex-wrap items-baseline gap-3 rounded-2xl bg-[#f2f1fd] p-4"><div className="w-full text-xs font-semibold text-ocean md:w-auto">Price</div><p className="price m-0 text-3xl font-semibold text-ink tabular-nums md:text-3xl">{money(currentPrice)}</p>{saving ? <><del className="text-sm text-muted">{money(product.price)}</del><span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white">Save {saving}%</span></> : null}</div>
        <div className="mb-5 flex items-start gap-3 border-y border-border py-4"><span className="rounded-lg bg-accent p-2 text-teal"><Icon name="pin" /></span><div><h2 className="mb-1 text-base font-bold">Delivery in Ras Al Khaimah</h2><p className="m-0 text-sm leading-relaxed text-ocean">Choose your delivery address at checkout to review available delivery and the final total.</p><Link className="inline-flex min-h-9 items-center text-xs text-teal" href="/contact#delivery">Delivery enquiries <Icon name="arrow" /></Link></div></div>
        <div className="pdp-purchase fixed inset-x-0 bottom-[calc(62px+env(safe-area-inset-bottom))] z-[19] border-t border-border bg-subtle px-4 pt-3 pb-3 shadow-nav md:static md:mb-4 md:border-0 md:bg-transparent md:p-0 md:shadow-none"><AddToCart key={product._id} id={product._id} name={product.name} stock={product.stock} quantityPicker priceLabel={money(currentPrice)} /></div>
        <div className="mb-4"><SaveProduct id={product._id} name={product.name} /></div>
        <div className="mb-4 grid grid-cols-2 gap-2"><Link className="product-contact flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 text-xs font-semibold text-ocean" href="/cart"><Icon name="bag" />View your cart</Link><Link className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 text-xs font-semibold text-ocean" href="/contact"><Icon name="phone" />Contact pharmacy</Link></div>

      </div>
    </div>
    <ProductInformation product={product} /><ProductReviews productId={product._id} reviews={reviews} />
    <section><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="mb-1 text-xl font-bold">Similar products</h2><p className="mb-0 text-xs text-ocean">Explore more in {product.category.name}.</p></div><Link className="inline-flex min-h-11 items-center gap-1 text-xs text-ocean" href={categoryHref(product.category)}>View category <Icon name="arrow" /></Link></div><ProductGrid headingLevel={3} products={related.products.filter(item => item._id !== product._id && (!product.familyKey || item.familyKey !== product.familyKey)).slice(0, 4)} /></section></div></>;
}
