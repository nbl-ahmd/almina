import { CurrencyAmount } from './currency-amount';
import { getLocale } from '../lib/server/i18n';
import { shopText as u } from '../lib/i18n-storefront';
import { cn } from 'cn';
import Link from './app-link';
import { ArrowRightIcon, ShoppingBagIcon } from './storefront-icons';
import { ProductImage } from './product-image';
import { AddToCart } from './cart-controls';
import { productSignal } from '../lib/analytics/policy';
import { SaveProduct } from './save-product';
import { productImage } from '../lib/server/catalog';
import { getWebEnvironment } from '../lib/server/env';
import { cartQuantities } from '../lib/server/cart-quantities';
import { displayPrice, productHref, productOptionLabel, type Product } from '../lib/catalog/model';

export async function ProductPhoto({ product, eager = false }: { product: Product; eager?: boolean }) {
  const locale = await getLocale();
  const src = productImage(product);
  if (src === '/product-placeholder.svg') {
    return <span className="product-photo-fallback">
      <ShoppingBagIcon aria-hidden="true" />
      <span>{locale === 'ar' ? 'الصورة غير متاحة' : 'Image unavailable'}</span>
    </span>;
  }
  return <ProductImage
    cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME}
    src={src}
    alt={product.name}
    locale={locale}
    width={480}
    height={480}
    sizes="(max-width:599px) 42vw, (max-width:1199px) 26vw, 240px"
    loading={eager ? 'eager' : 'lazy'}
    className="product-pack"
  />;
}

export async function ProductPrice({ product }: { product: Product }) {
  const locale = await getLocale();
  return <p className="product-price" data-price>
    <span>{product.familyPriceVaries ? u(locale, 'From ') : ''}<CurrencyAmount value={displayPrice(product)} locale={locale} /></span>
    {product.sale && displayPrice(product) < product.price ? <del><CurrencyAmount value={product.price} locale={locale} /></del> : null}
  </p>;
}

export async function ProductCard({ product, headingLevel = 3, className }: {
  product: Product;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const locale = await getLocale();
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const options = Boolean(product.familyKey && (product.familyOptionCount ?? 0) > 1);
  const pack = productOptionLabel(product) || product.packLabel;
  const saving = product.sale ? Math.max(0, product.price - displayPrice(product)) : 0;
  const discount = product.price > 0 ? Math.floor(saving / product.price * 100 + 1e-8) : 0;

  return <article
    data-product-id={product._id}
    className={cn('product-card relative flex min-w-0 flex-col gap-2', className)}
  >
    <div className="product-tile-media relative aspect-square shrink-0">
      <Link href={productHref(product)} aria-label={locale === 'ar' ? `عرض ${product.name}` : `View ${product.name}`} className="product-media absolute inset-0 rounded-card bg-surface">
        <div className="absolute inset-[11%] grid grid-rows-[minmax(0,1fr)] place-items-center">
          <ProductPhoto product={product} />
        </div>
      </Link>
      <div className="pointer-events-none absolute start-1 top-1 flex max-w-[calc(100%-52px)] flex-wrap items-start gap-1">
        {/* Availability badge only when it changes the decision; available stock is the default state. */}
        {product.stock <= 0 ? <span className="rounded-badge bg-canvas px-1.5 py-0.5 text-[11px] leading-tight font-semibold text-muted">{u(locale, 'Currently unavailable')}</span> : null}
        {/* Talabat-style deal sticker: the real saving in dirhams (sale price vs former price). */}
        {saving > 0 && <span className="save-sticker" data-discount={discount > 0 ? discount : undefined}>{locale === 'ar' ? 'وفّر ' : 'Save '}<CurrencyAmount value={saving} locale={locale} /></span>}
      </div>
      <div className="absolute end-0 top-0">
        <SaveProduct id={product._id} name={product.name} locale={locale} iconOnly />
      </div>
    </div>
    <div className="product-card-identity grid min-w-0 gap-1">
      <Heading><Link href={productHref(product)}>{product.name}</Link></Heading>
      {(pack || product.brand) && <p className="product-tile-meta">{pack || product.brand}</p>}
      {options && <p className="product-tile-meta">{locale === 'ar' ? `${product.familyOptionCount} خيارات متاحة` : `${product.familyOptionCount} options available`}</p>}
    </div>
    <div className="product-card-purchase mt-auto pt-1">
      <div className="product-card-buy-row">
        <ProductPrice product={product} />
        {options ? <Link className="tile-options" href={productHref(product)}>{u(locale, 'Choose options')}</Link> : <AddToCart locale={locale} signal={productSignal(product, displayPrice(product))} id={product._id} stock={product.stock} name={product.name} compact initialInCart={(await cartQuantities()).get(product._id) ?? 0} />}
      </div>
    </div>
  </article>;
}

export async function CompactProductCard({ product }: { product: Product }) {
  const locale = await getLocale();
  return <article className="compact-product-card">
    <Link href={productHref(product)} className="compact-product-media" aria-label={locale === 'ar' ? `عرض ${product.name}` : `View ${product.name}`}><ProductPhoto product={product} /></Link>
    <div className="compact-product-identity">
      <h3><Link href={productHref(product)}>{product.name}</Link></h3>
      <ProductPrice product={product} />
    </div>
    <Link href={productHref(product)} className="compact-product-open" aria-label={locale === 'ar' ? `عرض ${product.name}` : `View ${product.name}`}><ArrowRightIcon aria-hidden="true" /></Link>
  </article>;
}
