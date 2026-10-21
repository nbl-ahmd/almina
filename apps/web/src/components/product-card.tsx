import { getLocale } from '../lib/server/i18n';
import { shopText as u } from '../lib/i18n-storefront';
import Link from "next/link";
import { ArrowRightIcon, ShoppingBagIcon } from "@heroicons/react/24/outline";
import { ProductImage } from "./product-image";
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
    <article className="product-card group flex min-w-0 flex-col rounded-2xl border border-border bg-white p-3 transition-[border-color,box-shadow] duration-200 hover:border-ink/20 hover:shadow-[0_18px_40px_-32px_rgba(21,23,26,0.35)] md:p-3">
      <Link
        href={productHref(product)}
        aria-label={locale === "en" ? `View ${product.name}` : `عرض ${product.name}`}
        className="product-media relative mb-3 block aspect-square overflow-hidden rounded-xl bg-subtle p-4"
      >
        <ProductPhoto product={product} />
        {saving > 0 ? (
          <span className="absolute top-2 left-2 rounded-full bg-care-peach px-2.5 py-1 text-xs font-semibold text-sale shadow-sm">
            {locale === "en" ? `Save ${money(saving,locale)}` : `وفّر ${money(saving,locale)}`}
          </span>
        ) : null}
      </Link>
      <Link
        href={brand ? `/search?q=${encodeURIComponent(brand)}` : categoryHref(product.category)}
        className="mb-1.5 text-xs leading-4 font-medium text-muted hover:text-teal"
      >
        {brand || product.category.name}
      </Link>
      <Heading className="mb-2 text-[14px] leading-5 font-medium tracking-[-0.015em] md:text-base md:leading-6">
        <Link className="text-ink hover:text-teal" href={productHref(product)}>
          {product.familyName || product.name}
        </Link>
      </Heading>
      {optionLabel ? (
        <p className="mb-2 text-xs leading-5 text-muted">{optionLabel}</p>
      ) : null}
      {options ? (
        <p className="mb-2 text-xs font-medium text-teal">
          {locale === "en" ? `${locale === "en" ? `${product.familyOptionCount} options` : `${product.familyOptionCount} خيارات`} available` : `${product.familyOptionCount} خيارات متاحة`}
        </p>
      ) : null}
      <div className="mt-auto">
        <p
          className={`mb-2 flex items-center gap-1.5 text-xs ${product.stock > 0 ? "text-teal" : "text-muted"}`}
        >
          <span
            className={`size-1.5 rounded-full ${product.stock > 0 ? "bg-brand" : "bg-muted"}`}
            aria-hidden="true"
          />
          {product.stock > 0 ? u(locale,"In stock") : u(locale,"Currently unavailable")}
        </p>
        <div className="mb-3 text-base md:text-lg">
          <ProductPrice product={product} />
        </div>
        {options ? (
          <Link
            className="button min-h-11 w-full rounded-xl px-2 text-sm text-ink"
            href={productHref(product)}
          >{u(locale,"Choose options")}</Link>
        ) : (
          <div className="[&_.purchase-control-row]:block [&_.add-label]:not-sr-only [&_.add-mobile]:hidden [&_.add-desktop]:hidden">
            <AddToCart
              locale={locale}
              id={product._id}
              stock={product.stock}
              name={product.name}
            />
          </div>
        )}
      </div>
    </article>
  );
}
export async function CompactProductCard({ product }: { product: Product }) {
  const locale = await getLocale();
  return (
    <article className="flex w-[272px] shrink-0 snap-start flex-col rounded-2xl border border-border bg-white p-3 md:w-auto">
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
