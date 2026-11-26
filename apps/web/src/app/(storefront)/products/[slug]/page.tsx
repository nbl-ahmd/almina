import { CurrencyAmount } from '../../../../components/currency-amount';
import { TruckIcon, ChevronRightIcon, ArrowReturnIcon } from '../../../../components/storefront-icons';
import { brandSlug } from '../../../../lib/catalog/merchandising';
import { ProductPurchaseDock } from '../../../../components/product-purchase-dock';
import { GrowthActivity } from '../../../../components/growth-activity';
import { getLocale } from '../../../../lib/server/i18n';
import { shopText as u } from '../../../../lib/i18n-storefront';
import { RecordProductView } from '../../../../components/recently-viewed';
import { ReminderSignup } from '../../../../components/customer-reminders';
import { ProductReviews } from '../../../../components/product-reviews';
import { SaveProduct } from '../../../../components/save-product';
import { ShareProduct } from '../../../../components/share-product';
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
import { ProductGrid, Breadcrumb, StockState } from '../../../../components/storefront';
import { Icon } from '../../../../components/storefront-icon';
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
  const images = productImages(product);
  const brand = product.brand || product.familyBrand;
  const pack = [...new Set([product.strength, product.packLabel, productOptionLabel(product)].filter(Boolean))].join(' · ');
  const suggested = related.filter(item => item._id !== product._id && (!product.familyKey || item.familyKey !== product.familyKey)).slice(0, 4);
  const saving = product.price > currentPrice && product.price > 0 ? Math.round((product.price - currentPrice) / product.price * 100) : 0;
  const structured=productData(origin, product, images,variants, Object.fromEntries(variants.map(member=>[member._id,productImages(member)])),shippingPolicy);
  const reviews_ = reviewListData(reviews);
  const productSchema={...structured,...(aggregateRatingData(reviews)??{}),...(reviews_.length?{review:reviews_}:{})};
  return <><RecordProductView id={product._id} /><StructuredData data={productSchema} />
    <StructuredData data={breadcrumbData(origin, [{ name: 'Home', path: '/' }, { name: u(locale,'Categories'), path: '/categories' }, { name: product.category.name, path: categoryHref(product.category) }, { name: product.name, path: productHref(product) }])} />
    <div className="pdp-page pb-24 md:pb-0">
      <Breadcrumb title={product.name} parents={[{ name: u(locale, 'Categories'), path: '/categories' }, { name: product.category.name, path: categoryHref(product.category) }]} />
      <div className="product-detail mb-8 grid min-w-0 items-start gap-5 md:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] md:gap-10">
        <div className="product-visual min-w-0">
          <ProductGallery
            locale={locale}
            images={images}
            name={product.name}
            cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME}
            actions={<>
              <SaveProduct locale={locale} id={product._id} name={product.name} iconOnly />
              <ShareProduct locale={locale} name={product.name} url={origin + productHref(product)} />
            </>}
          />
          {images.some(image => !image.startsWith('/')) && <PhotoCredit source={product.imageSource} />}
        </div>
        <div className="product-information min-w-0">
          <div className="mb-3">
            <div className="flex flex-wrap items-center gap-x-3 text-xs font-semibold">
              {brand && <Link className="inline-flex min-h-11 items-center" href={`/brands/${brandSlug(brand)}`}>{brand}</Link>}
              <Link className="inline-flex min-h-11 items-center text-muted" href={categoryHref(product.category)}>{product.category.name}</Link>
            </div>
            <h1 className="mb-2 wrap-anywhere">{product.name}</h1>
            {pack && <p className="m-0 text-sm text-muted">{pack}</p>}
            {reviews?.ratingCount && reviews.average !== null ? (
              <a className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold" href="#product-reviews">
                {locale === 'ar' ? `${reviews.average} من 5 · ${reviews.ratingCount} تقييم` : `${reviews.average} / 5 · ${reviews.ratingCount} reviews`}
              </a>
            ) : null}
          </div>

          <div className="mb-4 border-t border-x-0 border-b-0 border-solid border-border pt-3">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 tabular-nums">
              <p className="m-0 text-2xl font-bold md:text-3xl"><CurrencyAmount value={currentPrice} locale={locale} /></p>
              {saving > 0 && <>
                <del className="text-sm text-muted"><CurrencyAmount value={product.price} locale={locale} /></del>
                <span className="save-sticker">{locale === 'ar' ? `وفّر ${saving}%` : `Save ${saving}%`}</span>
              </>}
            </div>
            <div className="mt-2 [&_.stock-state]:m-0!">
              <StockState stock={product.stock} />
            </div>
          </div>
          <ProductOptions product={product} variants={variants} />
          <ProductPurchaseDock>
            <div className="pdp-purchase">
              <AddToCart locale={locale} key={product._id} id={product._id} name={product.name} stock={product.stock} quantityPicker />
            </div>
          </ProductPurchaseDock>
          {product.warnings && <p className="product-purchase-warnings text-sm leading-relaxed">{product.warnings}</p>}
          {product.summary && <p className="product-summary my-4 text-sm leading-relaxed">{product.summary}</p>}

          {/* 1mg product page: delivery and returns as two quiet rows, each opening its policy. */}
          <ul className="pdp-info-rows" aria-label={u(locale, 'Delivery & returns')}>
            <li><Link href="/shipping"><TruckIcon className="pdp-info-icon" aria-hidden="true" /><span><strong>{u(locale, 'Delivery in Ras Al Khaimah')}</strong><small>{u(locale, 'Delivery fee and final total are confirmed at checkout.')}</small></span><ChevronRightIcon className="pdp-info-chevron rtl:rotate-180" aria-hidden="true" /></Link></li>
            <li><Link href="/returns"><ArrowReturnIcon className="pdp-info-icon" aria-hidden="true" /><span><strong>{u(locale, 'Returns & refunds')}</strong><small>{u(locale, 'How returns work for pharmacy items.')}</small></span><ChevronRightIcon className="pdp-info-chevron rtl:rotate-180" aria-hidden="true" /></Link></li>
          </ul>
          {product.productType === 'general' && product.contentReviewed === true && <ReminderSignup locale={locale} key={product._id} productId={product._id} stock={product.stock} />}
        </div>
      </div>
      <ProductInformation product={product} />
      <div id="product-reviews" className="scroll-mt-6"><ProductReviews locale={locale} reviews={reviews} /></div>
      {suggested.length > 0 && <section className="border-t border-x-0 border-b-0 border-solid border-border pt-6">
        <div className="section-heading">
          <h2>{u(locale, 'Similar products')}</h2>
          <Link href={categoryHref(product.category)}>{u(locale, 'View category')}<Icon name="arrow" /></Link>
        </div>
        <ProductGrid headingLevel={3} products={suggested} />
      </section>}
    </div>
    <GrowthActivity kind="product" />
  </>;
}
