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
import { categoryHref, productOptionLabel, productHref, displayPrice } from '../../../../lib/catalog/model';
import { Breadcrumb, StockState } from '../../../../components/storefront';
import { Icon } from '../../../../components/icon';
import { CompactProductCard } from '../../../../components/product-card';
import { CurrencyAmount } from '../../../../components/currency-amount';
import { CartLink } from '../../../../components/cart-link';
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
    <div className="pdp-page pb-24 md:pb-0"><div className="pdp-mobile-toolbar"><Link className="pdp-back" href={categoryHref(product.category)} aria-label={locale==='ar'?'العودة إلى الفئة':'Back to category'}><Icon name="back" /></Link><Link href="/search" aria-label={u(locale,'Search products')}><Icon name="search" /></Link><SaveProduct locale={locale} id={product._id} name={product.name} compact /><CartLink locale={locale} /></div><Breadcrumb title={product.name} parents={[{ name: u(locale,'Categories'), path: '/categories' }, { name: product.category.name, path: categoryHref(product.category) }]} />
    <div className="product-detail mb-8 grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-6">
      <div className="product-visual min-w-0 md:sticky md:top-6"><ProductGallery locale={locale} images={productImages(product)} name={product.name} cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} />

        {productImages(product).some(image => !image.startsWith('/')) ? <PhotoCredit source={product.imageSource} /> : null}
      </div>
      <div className="product-information min-w-0"><h1>{product.name}</h1><div className="product-identity">{product.brand || product.familyBrand ? <Link href={`/search?q=${encodeURIComponent(product.brand || product.familyBrand || '')}`}>{product.brand || product.familyBrand}</Link> : null}<Link href={categoryHref(product.category)}>{u(locale,product.category.name)}</Link></div>
        <div className="product-price-panel"><span>{u(locale,'Price')}</span><p className="price"><CurrencyAmount value={currentPrice} locale={locale} /></p>{saving ? <><del><CurrencyAmount value={product.price} locale={locale} /></del><span className="pdp-saving">{locale==='en'?`Save ${saving}%`:`وفّر ${saving}%`}</span></> : null}</div>
        <ProductOptions product={product} variants={variants} />
        <div className="pdp-stock-line"><StockState stock={product.stock} /></div>
        <div className="pdp-purchase"><AddToCart locale={locale} key={product._id} id={product._id} name={product.name} stock={product.stock} quantityPicker priceLabel=<CurrencyAmount value={currentPrice} locale={locale} /> /></div>

        <div className="pdp-save-secondary"><SaveProduct locale={locale} id={product._id} name={product.name} /></div>
        {product.productType === 'general' && product.contentReviewed === true ? <ReminderSignup locale={locale} key={product._id} productId={product._id} stock={product.stock} /> : null}
      </div>
    </div>
    {related.length?<section className="related-products"><div className="sf-section-heading"><h2>{u(locale,'Similar products')}</h2><Link href={categoryHref(product.category)}>{u(locale,'View category')}<Icon name="arrow" /></Link></div><div className="related-product-list">{related.filter(item=>item._id!==product._id&&(!product.familyKey||item.familyKey!==product.familyKey)).slice(0,4).map(item=><CompactProductCard key={item._id} product={item} />)}</div></section>:null}<div className="pdp-secondary-info">{product.summary ? <p>{product.summary}</p> : null}<p>{u(locale,'Checkout confirms the delivery charge and final total before you place an order.')}</p><div><Link href="/shipping">{u(locale,'Delivery & shipping')}</Link><Link href="/returns">{u(locale,'Returns & refunds')}</Link><Link href="/contact">{u(locale,'Contact pharmacy')}</Link></div><span>{locale==='en'?'SKU: ':'رمز المنتج: '}{product.product_id}</span></div><ProductInformation product={product} /><ProductReviews locale={locale} productId={product._id} reviews={reviews} /></div><GrowthActivity kind="product"/></>;
}
