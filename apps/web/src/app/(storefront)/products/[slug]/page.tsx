import { GrowthActivity } from '../../../../components/growth-activity';
import { getLocale } from '../../../../lib/server/i18n';
import { shopText as u } from '../../../../lib/i18n-storefront';
import { RecordProductView } from '../../../../components/recently-viewed';
import { ReminderSignup } from '../../../../components/customer-reminders';
import { ProductReviews } from '../../../../components/product-reviews';
import { SaveProduct } from '../../../../components/save-product';
import { ProductInformation } from '../../../../components/product-information';
import { ProductOptions } from '../../../../components/product-options';
import { ProductGallery } from '../../../../components/product-gallery';
import { PhotoCredit } from '../../../../components/photo-credit';
import Link from '../../../../components/app-link';
import { permanentRedirect } from 'next/navigation';
import { getProductVariants, getProductRecommendations, productImages } from '../../../../lib/server/catalog';
import { resolveProductRoute } from '../../../../lib/server/product-route';
import { getProductReviews, getShippingPolicy } from '../../../../lib/server/growth';
import { metadataFor } from '../../../../lib/server/seo';
import { getWebEnvironment } from '../../../../lib/server/env';
import { aggregateRatingData, breadcrumbData, productData, reviewListData, type Query } from '../../../../lib/seo';
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
  const locale = await getLocale();
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
  const [related,variants,reviews,shippingPolicy] = await Promise.all([getProductRecommendations(product),getProductVariants(product),getProductReviews(product._id),getShippingPolicy()]);
  const origin = getWebEnvironment().WEB_ORIGIN;
  const currentPrice = displayPrice(product);
  const saving = product.price > currentPrice && product.price > 0 ? Math.round((product.price - currentPrice) / product.price * 100) : 0;
  const structured=productData(origin, product, productImages(product),variants, Object.fromEntries(variants.map(member=>[member._id,productImages(member)])),shippingPolicy);
  const reviews_ = reviewListData(reviews);
  const productSchema={...structured,...(aggregateRatingData(reviews)??{}),...(reviews_.length?{review:reviews_}:{})};
  return <><RecordProductView id={product._id} /><StructuredData data={productSchema} />
    <StructuredData data={breadcrumbData(origin, [{ name: 'Home', path: '/' }, { name: u(locale,'Categories'), path: '/categories' }, { name: product.category.name, path: categoryHref(product.category) }, { name: product.name, path: productHref(product) }])} />
    <div className="pdp-page pb-24 md:pb-0"><Breadcrumb title={product.name} parents={[{ name: u(locale,'Categories'), path: '/categories' }, { name: product.category.name, path: categoryHref(product.category) }]} />
    <div className="product-detail mb-8 grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-6">
      <div className="product-visual min-w-0 md:sticky md:top-6"><ProductGallery locale={locale} images={productImages(product)} name={product.name} cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} />

        {productImages(product).some(image => !image.startsWith('/')) ? <PhotoCredit source={product.imageSource} /> : null}
      </div>
      <div className="product-information min-w-0 rounded-2xl border border-border bg-white p-4 md:p-7"><h1 className="mb-3 text-[26px] leading-[1.12] font-semibold tracking-[-0.035em] wrap-anywhere md:text-[34px]">{product.name}</h1><div className="product-identity mb-4 flex flex-wrap items-center gap-2 text-xs"><Link className="rounded-full bg-[#eaf1ec] px-3 py-1.5 font-medium text-teal" href={categoryHref(product.category)}>{product.category.name}</Link>{product.brand || product.familyBrand ? <Link className="inline-flex min-h-9 items-center px-1 text-muted hover:text-teal" href={`/search?q=${encodeURIComponent(product.brand || product.familyBrand || '')}`}>{product.brand || product.familyBrand}</Link> : null}</div>{product.summary || product.description ? <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-ocean">{product.summary || product.description?.split('\n')[0]}</p> : null}
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-3 [&_.stock-state]:mb-0"><StockState stock={product.stock} /><span className="text-xs text-muted">{locale === "en" ? "SKU: " : "رمز المنتج: "}{product.product_id}</span></div>
        <ProductOptions product={product} variants={variants} />
        <div className="product-price-panel mb-5 flex flex-wrap items-baseline gap-3 rounded-2xl bg-[#f1f4ef] p-4 md:p-5"><div className="w-full text-xs font-semibold text-ocean md:w-auto">{u(locale,"Price")}</div><p className="price m-0 text-3xl font-semibold text-ink tabular-nums md:text-3xl">{money(currentPrice,locale)}</p>{saving ? <><del className="text-sm text-muted">{money(product.price,locale)}</del><span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-ink">{locale === "en" ? `Save ${saving}%` : `وفّر ${saving}%`}</span></> : null}</div>
        <div className="mb-5 flex items-start gap-3 border-y border-border py-4"><span className="rounded-lg bg-accent p-2 text-teal"><Icon name="pin" /></span><div><h2 className="mb-1 text-base font-bold">{u(locale,"Delivery in Ras Al Khaimah")}</h2><p className="m-0 text-sm leading-relaxed text-ocean">{u(locale,"Checkout confirms the delivery charge and final total before you place an order.")}</p><div className="flex flex-wrap gap-x-4"><Link className="inline-flex min-h-9 items-center text-xs text-teal" href="/shipping">{u(locale,"Delivery & shipping")} <Icon name="arrow" /></Link><Link className="inline-flex min-h-9 items-center text-xs text-teal" href="/returns">{u(locale,"Returns & refunds")} <Icon name="arrow" /></Link><Link className="inline-flex min-h-9 items-center text-xs text-teal" href="/contact#delivery">{u(locale,"Delivery enquiries")} <Icon name="arrow" /></Link></div></div></div>
        <div className="pdp-purchase mobile-action-bar md:mb-4"><AddToCart locale={locale} key={product._id} id={product._id} name={product.name} stock={product.stock} quantityPicker priceLabel={money(currentPrice,locale)} /></div>
        <div className="mb-4"><SaveProduct locale={locale} id={product._id} name={product.name} /></div>
        {product.productType === 'general' && product.contentReviewed === true ? <ReminderSignup locale={locale} key={product._id} productId={product._id} stock={product.stock} /> : null}
        <div className="mb-4 grid grid-cols-2 gap-2"><Link className="product-contact flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-white px-3 text-xs font-semibold text-ink transition-colors hover:border-ink" href="/cart"><Icon name="bag" />{u(locale,"View your cart")}</Link><Link className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-white px-3 text-xs font-semibold text-ink transition-colors hover:border-ink" href="/contact"><Icon name="phone" />{u(locale,"Contact pharmacy")}</Link></div>

      </div>
    </div>
    <ProductInformation product={product} /><ProductReviews locale={locale} productId={product._id} reviews={reviews} />
    {related.length?<section><div className="mb-4 flex items-end justify-between gap-3"><div><h2 className="mb-1 text-xl font-semibold tracking-[-0.02em]">{u(locale,"Similar products")}</h2><p className="mb-0 text-xs text-ocean">{locale === "en" ? `Explore more in ${product.category.name}.` : `استكشف المزيد في ${product.category.name}.`}</p></div><Link className="inline-flex min-h-11 items-center gap-1 text-xs text-ocean" href={categoryHref(product.category)}>{u(locale,"View category")} <Icon name="arrow" /></Link></div><ProductGrid headingLevel={3} products={related.filter(item => item._id !== product._id && (!product.familyKey || item.familyKey !== product.familyKey)).slice(0, 4)} /></section>:null}</div><GrowthActivity kind="product"/></>;
}
