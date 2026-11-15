import { CurrencyAmount } from './currency-amount';
import { getLocale } from '../lib/server/i18n';
import { shopText as u } from '../lib/i18n-storefront';
import Link from './app-link';
import { ArrowRightIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";
import { ProductImage } from "./product-image";
import { SaveProduct } from "./save-product";
import { AddToCart } from "./cart-controls";
import { productImage } from "../lib/server/catalog";
import { getWebEnvironment } from "../lib/server/env";
import {
  categoryHref,
  displayPrice,
  productHref,
  productOptionLabel,
  type Product,
} from "../lib/catalog/model";

export async function ProductPhoto({
  product,
  eager = false,
}: {
  product: Product;
  eager?: boolean;
}) {
  const locale = await getLocale();
  const src = productImage(product);
  return src === "/product-placeholder.svg" ? (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-2 text-center text-xs text-muted">
      <ShoppingBagIcon className="size-6" />
      <span>{u(locale,"Photo coming soon")}</span>
    </div>
  ) : (
    <ProductImage
      cloudName={getWebEnvironment().CLOUDINARY_CLOUD_NAME}
      src={src}
      alt={product.name}
      width={480}
      height={480}
      sizes={
        eager
          ? "(max-width: 767px) 45vw, 360px"
          : "(max-width: 767px) 43vw, 260px"
      }
      loading={eager ? "eager" : "lazy"}
      className="h-full w-full object-contain transition-transform duration-300 motion-safe:group-hover:scale-[1.035]"
    />
  );
}
export async function ProductPrice({ product }: { product: Product }) {
  const locale = await getLocale();
  return (
    <p className="m-0 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-semibold tabular-nums">
      <span>
        {product.familyPriceVaries ? u(locale,"From ") : ""}
        <CurrencyAmount value={displayPrice(product)} locale={locale} />
      </span>
      {product.sale && displayPrice(product) < product.price ? (
        <del className="text-xs font-normal text-muted">
          <CurrencyAmount value={product.price} locale={locale} />
        </del>
      ) : null}
    </p>
  );
}
export async function ProductCard({
  product,
  headingLevel = 3,
}: {
  product: Product;
  headingLevel?: 2 | 3;
}) {
  const locale = await getLocale();
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const options = !!product.familyKey && (product.familyOptionCount ?? 0) > 1;
  // A literal size from the existing name is a display hint, never a new pack fact.
  const namedSize = [...product.name.matchAll(/\b\d+(?:[.,]\d+)?\s*(?:ml|kg|g|litres?|liters?)\b/gi)].at(-1)?.[0];
  const optionLabel = product.packLabel || (product.familyKey ? productOptionLabel(product) : "") || namedSize || "";
  const saving = product.sale
    ? Math.max(0, product.price - displayPrice(product))
    : 0;
  const brand = product.brand || product.familyBrand;
  const fullName = product.familyName || product.name;
  const withoutBrand = brand && fullName.toLowerCase().startsWith(brand.toLowerCase() + ' ') ? fullName.slice(brand.length).trim() : fullName;
  const withoutPack = optionLabel && withoutBrand.toLowerCase().endsWith(optionLabel.toLowerCase()) ? withoutBrand.slice(0, -optionLabel.length).trim().replace(/[,–-]$/, '').trim() : withoutBrand;
  const cardName = withoutPack || fullName;
  return (
    <article data-product-id={product._id} className="product-card group">
      <div className="product-card-visual">
        <Link href={productHref(product)} aria-label={locale === 'en' ? `View ${product.name}` : `عرض ${product.name}`} className="product-media">
          <ProductPhoto product={product} />
        </Link>
        <span className={`product-stock ${product.stock > 0 ? '' : 'is-unavailable'}`}>{product.stock > 0 ? u(locale, 'In stock') : u(locale, 'Currently unavailable')}</span>
        <div className="product-card-save"><SaveProduct locale={locale} id={product._id} name={product.name} compact /></div>
      </div>
      <div className="product-card-tags"><Link href={brand ? `/search?q=${encodeURIComponent(brand)}` : categoryHref(product.category)}>{brand || product.category.name}</Link>{optionLabel ? <span dir={/[a-z]/i.test(optionLabel) ? "ltr" : "auto"}>{optionLabel}</span> : null}</div>
      <Heading className="product-card-title"><Link href={productHref(product)} aria-label={fullName}>{cardName}</Link></Heading>
      {options ? <p className="product-card-options">{locale === 'en' ? `${product.familyOptionCount} options available` : `${product.familyOptionCount} خيارات متاحة`}</p> : null}
      {saving > 0 ? <p className="product-card-saving">{locale === 'en' ? 'Save ' : 'وفّر '}<CurrencyAmount value={saving} locale={locale} /></p> : null}
      <div className="product-card-bottom"><ProductPrice product={product} />{options ? <Link className="product-option-link" href={productHref(product)}>{u(locale, 'Choose options')}<ArrowRightIcon className="size-4 rtl:rotate-180" /></Link> : <AddToCart locale={locale} id={product._id} stock={product.stock} name={product.name} compact />}</div>
    </article>
  );
}

export async function CompactProductCard({ product }: { product: Product }) {
 const locale=await getLocale();
 return <article className="related-product-row"><Link href={productHref(product)} className="related-product-photo" aria-label={locale==='ar'?`عرض ${product.name}`:`View ${product.name}`}><ProductPhoto product={product} /></Link><div className="related-product-copy"><h3><Link href={productHref(product)}>{product.familyName||product.name}</Link></h3><p>{product.brand||product.familyBrand||u(locale,product.category.name)}</p></div><div className="related-product-price"><ProductPrice product={product} /><Link href={productHref(product)} aria-label={locale==='ar'?`عرض ${product.name}`:`View ${product.name}`}><ArrowRightIcon className="size-4 rtl:rotate-180" aria-hidden="true" /></Link></div></article>;
}
