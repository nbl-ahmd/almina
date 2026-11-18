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
import { ProductReturnLink } from '../../../../components/product-return-link';
import { ProductPurchaseDock } from '../../../../components/product-purchase-dock';
import styles from '../../../../components/product-detail.module.css';
import boundary from '../../../../components/storefront-system/boundary.module.css';
import system from '../../../../components/storefront-system/tokens.module.css';
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
  const categoryPath = categoryHref(product.category);
  const brand = product.brand || product.familyBrand;
  const alternatives = related.filter(item => item._id !== product._id && (!product.familyKey || item.familyKey !== product.familyKey)).slice(0, 4);
  const photos = productImages(product).filter(image => image !== '/product-placeholder.svg');
  const mobileControls = (
    <div className={`pdp-mobile-toolbar ${styles.overlay}`}>
      <ProductReturnLink className={styles.back} categoryHref={categoryPath} locale={locale} />
      <SaveProduct locale={locale} id={product._id} name={product.name} compact card />
      <CartLink locale={locale} />
    </div>
  );
  return <><RecordProductView id={product._id} /><StructuredData data={productSchema} />
    <StructuredData data={breadcrumbData(origin, [{ name: 'Home', path: '/' }, { name: u(locale,'Categories'), path: '/categories' }, { name: product.category.name, path: categoryPath }, { name: product.name, path: productHref(product) }])} />
    <div lang={locale} className={`pdp-page ${system.system} ${boundary.boundary} ${styles.detail}`}>
      <div className={styles.container}>
        <div className={styles.trail}>
          <Breadcrumb title={product.name} parents={[{ name: u(locale, 'Categories'), path: '/categories' }, { name: product.category.name, path: categoryPath }]} />
          <ProductReturnLink contextOnly className={styles.desktopBack} categoryHref={categoryPath} locale={locale} />
        </div>
        <div className={styles.lead}>
          <div className={styles.visual}>
            <ProductGallery key={product._id} locale={locale} images={photos} name={product.name}
              controls={mobileControls} cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME} />
            {photos.length ? <div className={styles.credit}><PhotoCredit source={product.imageSource} /></div> : null}
          </div>
          <div className={styles.buying}>
            <h1><bdi>{product.name}</bdi></h1>
            <div className={styles.identity}>
              {brand ? <Link href={'/search?' + new URLSearchParams({ q: brand })}><bdi>{brand}</bdi></Link> : null}
              <Link href={categoryPath}>{u(locale, product.category.name)}</Link>
            </div>
            <StockState stock={product.stock} />
            <div className={styles.price}>
              <span className="sr-only">{u(locale, 'Price')}</span>
              <CurrencyAmount value={currentPrice} locale={locale} />
              {product.price > currentPrice ? <del><CurrencyAmount value={product.price} locale={locale} /></del> : null}
              {saving ? <span className={styles.saving}>{locale === 'en' ? `Save ${saving}%` : `وفّر ${saving}%`}</span> : null}
            </div>
            <ProductOptions product={product} variants={variants} />
            <ProductPurchaseDock>
              <AddToCart locale={locale} key={product._id} id={product._id} name={product.name} stock={product.stock}
                quantityPicker priceLabel={<CurrencyAmount value={currentPrice} locale={locale} />} />
            </ProductPurchaseDock>
            <div className={styles.desktopSave}><SaveProduct locale={locale} id={product._id} name={product.name} card /></div>
            {product.productType === 'general' && product.contentReviewed === true
              ? <ReminderSignup locale={locale} key={product._id} productId={product._id} stock={product.stock} /> : null}
          </div>
        </div>
        <div className={styles.secondary}>
          <ProductInformation product={product} locale={locale} />
          <ProductReviews key={product._id} locale={locale} productId={product._id} reviews={reviews} />
          {alternatives.length ? (
            <section className="related-products">
              <div className="sf-section-heading">
                <h2>{u(locale, 'Similar products')}</h2>
                <Link href={categoryPath}>{u(locale, 'View category')}<Icon name="arrow" /></Link>
              </div>
              <div className="related-product-list">
                {alternatives.map(item => <CompactProductCard key={item._id} product={item} />)}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div><GrowthActivity kind="product" /></>;
}
