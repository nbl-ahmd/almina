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
  money,
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
        {money(displayPrice(product),locale)}
      </span>
      {product.sale && displayPrice(product) < product.price ? (
        <del className="text-xs font-normal text-muted">
          {money(product.price,locale)}
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
  const optionLabel = product.familyKey ? productOptionLabel(product) : "";
  const saving = product.sale
    ? Math.max(0, product.price - displayPrice(product))
    : 0;
  const brand = product.brand || product.familyBrand;
  return (
    <article data-product-id={product._id} className="product-card group">
      <div className="product-card-visual">
        <Link href={productHref(product)} aria-label={locale === 'en' ? `View ${product.name}` : `عرض ${product.name}`} className="product-media">
          <ProductPhoto product={product} />
        </Link>
        <span className={`product-stock ${product.stock > 0 ? '' : 'is-unavailable'}`}>{product.stock > 0 ? u(locale, 'In stock') : u(locale, 'Currently unavailable')}</span>
        <div className="product-card-save"><SaveProduct locale={locale} id={product._id} name={product.name} compact /></div>
      </div>
      <div className="product-card-tags"><Link href={brand ? `/search?q=${encodeURIComponent(brand)}` : categoryHref(product.category)}>{brand || product.category.name}</Link>{optionLabel ? <span>{optionLabel}</span> : null}</div>
      <Heading className="product-card-title"><Link href={productHref(product)}>{product.familyName || product.name}</Link></Heading>
      {options ? <p className="product-card-options">{locale === 'en' ? `${product.familyOptionCount} options available` : `${product.familyOptionCount} خيارات متاحة`}</p> : null}
      {saving > 0 ? <p className="product-card-saving">{locale === 'en' ? `Save ${money(saving, locale)}` : `وفّر ${money(saving, locale)}`}</p> : null}
      <div className="product-card-bottom"><ProductPrice product={product} />{options ? <Link className="product-option-link" href={productHref(product)}>{u(locale, 'Choose options')}<ArrowRightIcon className="size-4 rtl:rotate-180" /></Link> : <AddToCart locale={locale} id={product._id} stock={product.stock} name={product.name} compact />}</div>
    </article>
  );
}

export async function CompactProductCard({ product }: { product: Product }) {
  const locale = await getLocale();
  return (
    <article className="compact-product-card flex w-[272px] shrink-0 snap-start flex-col rounded-2xl border border-border bg-white p-3 md:w-auto">
      <div className="mb-3 grid grid-cols-[64px_1fr] items-start gap-3">
        <Link
          href={productHref(product)}
          aria-label={locale === "en" ? `View ${product.name}` : `عرض ${product.name}`}
          className="flex size-16 items-center justify-center rounded-[14px] bg-subtle p-1.5"
        >
          {productImage(product) === "/product-placeholder.svg" ? (
            <ShoppingBagIcon className="size-5 text-muted" />
          ) : (
            <ProductPhoto product={product} />
          )}
        </Link>
        <div className="min-w-0">
          <p className="mb-1 text-xs font-medium tracking-[0.05em] text-muted uppercase">
            {product.brand || product.familyBrand || product.category.name}
          </p>
          <h3 className="mb-0 text-sm leading-5 font-medium">
            <Link
              className="text-ink hover:text-teal"
              href={productHref(product)}
            >
              {product.familyName || product.name}
            </Link>
          </h3>
          {product.familyKey && (product.familyOptionCount ?? 0) > 1 ? (
            <p className="mt-1 mb-0 text-xs text-teal">
              {locale === "en" ? `${product.familyOptionCount} options` : `${product.familyOptionCount} خيارات`}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <div className="text-base">
          <ProductPrice product={product} />
        </div>
        <Link
          href={productHref(product)}
          aria-label={locale === "en" ? `View ${product.name}` : `عرض ${product.name}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-white text-ink transition-colors hover:border-ink hover:bg-ink hover:text-white"
        >
          <ArrowRightIcon className="rtl:rotate-180 size-4" />
        </Link>
      </div>
    </article>
  );
}
