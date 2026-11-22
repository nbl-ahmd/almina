import { getLocale } from '../lib/server/i18n';
import { shopText as u } from '../lib/i18n-storefront';
import { cn } from 'cn';
import Link from './app-link';
import { ArrowRightIcon, ShoppingBagIcon } from './storefront-icons';
import { ProductImage } from './product-image';
import { AddToCart } from './cart-controls';
import { productImage } from '../lib/server/catalog';
import { getWebEnvironment } from '../lib/server/env';
import { displayPrice, money, productHref, productOptionLabel, type Product } from '../lib/catalog/model';

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
    <span>{product.familyPriceVaries ? u(locale, 'From ') : ''}<bdi>{money(displayPrice(product), locale)}</bdi></span>
    {product.sale && displayPrice(product) < product.price ? <del><bdi>{money(product.price, locale)}</bdi></del> : null}
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

  return <article data-product-id={product._id} className={cn('product-card', className)}>
    <Link href={productHref(product)} aria-label={locale === 'ar' ? `عرض ${product.name}` : `View ${product.name}`} className="product-media">
      <ProductPhoto product={product} />
      {saving > 0 ? <span className="product-offer">{locale === 'ar' ? `وفّر ${money(saving, locale)}` : `Save ${money(saving, locale)}`}</span> : null}
    </Link>
    <div className="product-card-identity">
      <Heading><Link href={productHref(product)}>{product.name}</Link></Heading>
      {pack ? <p className="product-pack-label">{pack}</p> : null}
      {!pack && product.brand ? <p className="product-pack-label">{product.brand}</p> : null}
      {options ? <p className="product-pack-label">{locale === 'ar' ? `${product.familyOptionCount} خيارات متاحة` : `${product.familyOptionCount} options available`}</p> : null}
    </div>
    <div className="product-card-purchase">
      <p className={product.stock > 0 ? 'product-stock' : 'product-stock unavailable'}>{product.stock > 0 ? u(locale, 'In stock') : u(locale, 'Currently unavailable')}</p>
      <div className="product-card-buy-row">
      <ProductPrice product={product} />
      {options ? <Link className="button" href={productHref(product)}>{u(locale, 'Choose options')}</Link> : <AddToCart locale={locale} id={product._id} stock={product.stock} name={product.name} />}
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
