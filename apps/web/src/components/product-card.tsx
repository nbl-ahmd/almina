import { ArrowRightIcon } from '@heroicons/react/24/outline';
import Link from './app-link';
import { AddToCart } from './cart-controls';
import { CurrencyAmount } from './currency-amount';
import { ProductImage } from './product-image';
import { SaveProduct } from './save-product';
import styles from './product-card.module.css';
import boundary from './storefront-system/boundary.module.css';
import system from './storefront-system/tokens.module.css';
import { categoryHref, displayPrice, literalPackFromName, productHref, productOptionLabel, type Product } from '../lib/catalog/model';
import { shopText as u } from '../lib/i18n-storefront';
import type { Locale } from '../lib/i18n';
import { productImage } from '../lib/server/catalog';
import { getWebEnvironment } from '../lib/server/env';
import { getLocale } from '../lib/server/i18n';

function photoFallback(locale: Locale) {
  return (
    <span className={styles.placeholder}>
      <span>{u(locale, 'Photo coming soon')}</span>
    </span>
  );
}

export async function ProductPhoto({ product, eager = false, sizes = '(max-width: 599px) 45vw, (max-width: 1023px) 30vw, 260px' }: {
  product: Product;
  sizes?: string;
  eager?: boolean;
}) {
  const locale = await getLocale();
  const src = productImage(product);
  const fallback = photoFallback(locale);
  return src === '/product-placeholder.svg' ? fallback : (
    <ProductImage
      cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME}
      src={src}
      alt={product.name}
      width={480}
      height={480}
      sizes={sizes}
      loading={eager ? "eager" : "lazy"}
      className={styles.photo}
      fallback={fallback}
    />
  );
}

function CardPrice({ product, locale }: { product: Product; locale: Locale }) {
  const price = displayPrice(product);
  const ar = locale === 'ar';
  return (
    <div className={styles.price}>
      <span className={styles.amount}>
        <span className="sr-only">{ar ? 'السعر الحالي: ' : 'Current price: '}</span>
        <CurrencyAmount value={price} locale={locale} />
      </span>
      {product.sale && price < product.price ? (
        <span className={styles.previous}>
          <span className="sr-only">{ar ? 'السعر السابق: ' : 'Previous price: '}</span>
          <del><CurrencyAmount value={product.price} locale={locale} /></del>
        </span>
      ) : null}
    </div>
  );
}

function Stock({ product, locale, grouped = false }: { product: Product; locale: Locale; grouped?: boolean }) {
  const available = product.stock > 0;
  const label = available ? u(locale, 'In stock') : u(locale, 'Out of stock');
  return <span className={`product-stock ${styles.stock}`} data-grouped={grouped || undefined} data-stock={available ? 'available' : 'unavailable'}>
    {grouped ? (locale === 'ar' ? 'العبوة المعروضة: ' : 'Shown pack: ') : null}{label}
  </span>;
}

export async function ProductCard({ product, headingLevel = 3, eagerPhoto = false }: {
  product: Product;
  headingLevel?: 2 | 3;
  eagerPhoto?: boolean;
}) {
  const locale = await getLocale();
  const ar = locale === 'ar';
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const options = Boolean(product.familyKey && (product.familyOptionCount ?? 0) > 1);
  const recordedPack = product.packLabel || (product.familyKey ? productOptionLabel(product) : '');
  const brand = product.brand || product.familyBrand;
  const name = product.name.trim();
  const withoutBrand = brand && name.toLowerCase().startsWith(brand.toLowerCase() + ' ')
    ? name.slice(brand.length).trim() : name;
  const literalPack = literalPackFromName(withoutBrand);
  const pack = recordedPack || literalPack?.label;
  const cardName = literalPack && pack === literalPack.label ? literalPack.prefix : withoutBrand;
  const href = productHref(product);

  return (
    <article lang={locale} data-product-id={product._id} className={`product-card ${system.system} ${boundary.boundary} ${styles.card}`}>
      <div className={styles.visual}>
        <Link href={href} data-product-entry="image" aria-label={ar ? `عرض ${name}` : `View ${name}`} className={`product-media ${styles.media}`}>
          <ProductPhoto product={product} eager={eagerPhoto} />
        </Link>
        <Stock product={product} locale={locale} grouped={options} />
        <SaveProduct locale={locale} id={product._id} name={name} compact card />
      </div>
      <div className={`product-card-tags ${styles.tags}`}>
        <Link href={brand ? '/search?' + new URLSearchParams({ q: brand }) : categoryHref(product.category)}>
          <bdi>{brand || u(locale, product.category.name)}</bdi>
        </Link>
        {pack ? <><span aria-hidden="true">·</span><bdi>{pack}</bdi></> : null}
      </div>
      <Heading className={`product-card-title ${styles.title}`}><Link href={href} data-product-entry="title" aria-label={name}><bdi>{cardName || name}</bdi></Link></Heading>
      {options ? <p className={styles.optionNote}>
        {product.familyPriceVaries
          ? (ar ? 'السعر يختلف حسب الخيار' : 'Price varies by option')
          : (ar ? 'خيارات أخرى متاحة' : 'Other options available')}
      </p> : null}
      <div className={`product-card-bottom ${styles.buy}`}>
        <CardPrice product={product} locale={locale} />
        {options ? <Link className={`product-option-link ${styles.choose}`} href={href} data-product-entry="options">
          {u(locale, 'Choose options')}<ArrowRightIcon className="rtl:rotate-180" aria-hidden="true" />
        </Link> : <AddToCart locale={locale} id={product._id} stock={product.stock} name={name} compact />}
      </div>
    </article>
  );
}

export async function CompactProductCard({ product }: { product: Product }) {
  const locale = await getLocale();
  const pack = product.packLabel || (product.familyKey ? productOptionLabel(product) : '');
  return (
    <article lang={locale} className={`related-product-row ${system.system} ${boundary.boundary} ${styles.compact}`}>
      <Link href={productHref(product)} className={styles.compactLink}>
        <span className={styles.compactPhoto}><ProductPhoto product={product} sizes="72px" /></span>
        <div className={styles.compactText}>
          <h3 className={styles.title}><bdi>{product.name}</bdi></h3>
          {product.brand || product.familyBrand ? <bdi className={styles.optionNote}>{product.brand || product.familyBrand}</bdi> : null}
          {pack ? <bdi className={styles.optionNote}>{pack}</bdi> : null}
          <Stock product={product} locale={locale} />
          <CardPrice product={product} locale={locale} />
        </div>
        <ArrowRightIcon className={`${styles.compactArrow} rtl:rotate-180`} aria-hidden="true" />
      </Link>
    </article>
  );
}
