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

export function ProductPhoto({
  product,
  eager = false,
}: {
  product: Product;
  eager?: boolean;
}) {
  const src = productImage(product);
  return src === "/product-placeholder.svg" ? (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-2 text-center text-xs text-muted">
      <ShoppingBagIcon className="size-6" />
      <span>Photo coming soon</span>
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
export function ProductPrice({ product }: { product: Product }) {
  return (
    <p className="m-0 flex flex-wrap items-baseline gap-x-2 gap-y-1 font-semibold tabular-nums">
      <span>
        {product.familyPriceVaries ? "From " : ""}
        {money(displayPrice(product))}
      </span>
      {product.sale && displayPrice(product) < product.price ? (
        <del className="text-xs font-normal text-muted">
          {money(product.price)}
        </del>
      ) : null}
    </p>
  );
}
export function ProductCard({
  product,
  headingLevel = 3,
}: {
  product: Product;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const options = !!product.familyKey && (product.familyOptionCount ?? 0) > 1;
  const optionLabel = product.familyKey ? productOptionLabel(product) : "";
  const saving = product.sale
    ? Math.max(0, product.price - displayPrice(product))
    : 0;
  const brand = product.brand || product.familyBrand;
  return (
    <article className="product-card group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-white p-2.5 transition-[border-color,box-shadow] duration-200 hover:border-[#c8d0fa] hover:shadow-[0_8px_22px_-14px_rgba(37,65,120,0.25)] md:p-3.5">
      <Link
        href={productHref(product)}
        aria-label={`View ${product.name}`}
        className="product-media relative mb-3 block aspect-[5/4] overflow-hidden rounded-xl border border-[#f0f1f6] bg-white p-3"
      >
        <ProductPhoto product={product} />
        {saving > 0 ? (
          <span className="absolute top-2 left-2 rounded-md bg-[#fff0e8] px-2 py-1 text-[10px] font-semibold text-[#9b3d23]">
            Save {money(saving)}
          </span>
        ) : null}
      </Link>
      <Link
        href={brand ? `/search?q=${encodeURIComponent(brand)}` : categoryHref(product.category)}
        className="mb-1.5 text-[11px] leading-4 text-muted hover:text-brand"
      >
        {brand || product.category.name}
      </Link>
      <Heading className="mb-2 text-sm leading-5 font-medium tracking-[-0.01em] md:text-base md:leading-6">
        <Link className="text-ink hover:text-brand" href={productHref(product)}>
          {product.familyName || product.name}
        </Link>
      </Heading>
      {optionLabel ? (
        <p className="mb-2 text-xs leading-5 text-muted">{optionLabel}</p>
      ) : null}
      {options ? (
        <p className="mb-2 text-xs font-medium text-brand">
          {product.familyOptionCount} options available
        </p>
      ) : null}
      <div className="mt-auto">
        <p
          className={`mb-2 flex items-center gap-1.5 text-[11px] ${product.stock > 0 ? "text-[#326347]" : "text-muted"}`}
        >
          <span
            className={`size-1.5 rounded-full ${product.stock > 0 ? "bg-[#478262]" : "bg-muted"}`}
            aria-hidden="true"
          />
          {product.stock > 0 ? "In stock" : "Currently unavailable"}
        </p>
        <div className="mb-3 text-base md:text-lg">
          <ProductPrice product={product} />
        </div>
        {options ? (
          <Link
            className="button min-h-11 w-full rounded-xl px-2 text-xs"
            href={productHref(product)}
          >
            Choose options
          </Link>
        ) : (
          <div className="[&_button]:min-h-11 [&_button]:w-full [&_button]:rounded-xl [&_button]:px-2 [&_button]:text-xs [&_.purchase-control-row]:block [&_.add-label]:not-sr-only [&_.add-mobile]:hidden">
            <AddToCart
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
export function CompactProductCard({ product }: { product: Product }) {
  return (
    <article className="flex w-[275px] shrink-0 snap-start flex-col rounded-xl border border-border bg-white p-3 md:w-auto">
      <div className="mb-3 grid grid-cols-[64px_1fr] items-start gap-3">
        <Link
          href={productHref(product)}
          aria-label={`View ${product.name}`}
          className="flex size-16 items-center justify-center rounded-lg border border-border bg-white p-1"
        >
          {productImage(product) === "/product-placeholder.svg" ? (
            <ShoppingBagIcon className="size-5 text-muted" />
          ) : (
            <ProductPhoto product={product} />
          )}
        </Link>
        <div className="min-w-0">
          <p className="mb-1 text-[10px] text-muted">
            {product.brand || product.familyBrand || product.category.name}
          </p>
          <h3 className="mb-0 text-sm leading-5 font-medium">
            <Link
              className="text-ink hover:text-brand"
              href={productHref(product)}
            >
              {product.familyName || product.name}
            </Link>
          </h3>
          {product.familyKey && (product.familyOptionCount ?? 0) > 1 ? (
            <p className="mt-1 mb-0 text-[11px] text-brand">
              {product.familyOptionCount} options
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
          aria-label={`View ${product.name}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-subtle text-brand hover:bg-accent"
        >
          <ArrowRightIcon className="size-4" />
        </Link>
      </div>
    </article>
  );
}
