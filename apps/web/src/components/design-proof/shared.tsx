import "server-only";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { directionProofAllowed } from "../../lib/design-proof-gate";
import {
  productSlug,
  displayPrice,
  type Product,
} from "../../lib/catalog/model";
import { productImage } from "../../lib/server/catalog";
import { ProductImage } from "../product-image";
import { CurrencyAmount } from "../currency-amount";
import Link from "../app-link";
import { Purchase, Save } from "./controls";
import s from "./proof.module.css";
export function requireProof() {
  if (!directionProofAllowed(process.env)) notFound();
}
export const proofHref = (product: Product) =>
  `/design-proof/products/${productSlug(product)}`;
export type Lang = "en" | "ar";
export const words = (lang: Lang, en: string, ar: string) =>
  lang === "ar" ? ar : en;
export function Photo({
  product,
  large = false,
}: {
  product: Product;
  large?: boolean;
}) {
  return (
    <ProductImage
      src={productImage(product)}
      alt={product.name}
      fill
      sizes={
        large
          ? "(min-width: 900px) 500px, 90vw"
          : "(min-width: 900px) 240px, 42vw"
      }
      className={s.pack}
    />
  );
}
/** One presentation frame for real catalogue cards and explicitly noncommercial layout samples. */
export function CardFrame({
  name,
  brand,
  pack,
  price,
  stock,
  media,
  save,
  action,
  href,
  lang,
}: {
  name: string;
  brand?: string;
  pack?: string;
  price: number | null;
  stock: number;
  media: ReactNode;
  save: ReactNode;
  action: ReactNode;
  href?: string;
  lang: Lang;
}) {
  const visible =
    brand &&
    name.toLocaleLowerCase().startsWith(brand.toLocaleLowerCase() + " ")
      ? name.slice(brand.length).trimStart()
      : name;
  return (
    <article className={s.card}>
      <div className={s.cardMedia}>
        <span className={stock > 0 ? s.stock : s.unavailable}>
          {words(
            lang,
            stock > 0 ? "In stock" : "Unavailable",
            stock > 0 ? "متوفر" : "غير متوفر",
          )}
        </span>
        {save}
        {href ? (
          <Link href={href} className={s.photoLink} aria-label={name}>
            {media}
          </Link>
        ) : (
          <div className={s.photoLink}>{media}</div>
        )}
      </div>
      <div className={s.cardBody}>
        {brand && (
          <p className={s.meta}>
            <bdi>{brand}</bdi>
          </p>
        )}
        {href ? (
          <Link href={href} className={s.productName} aria-label={name}>
            <bdi>{visible}</bdi>
          </Link>
        ) : (
          <h3 className={s.productName}>
            <bdi>{visible}</bdi>
          </h3>
        )}
        {pack && (
          <p className={s.meta}>
            <bdi>{pack}</bdi>
          </p>
        )}
        <div className={s.cardBuy}>
          <strong>
            {price === null ? (
              <span className={s.priceUnknown}>
                {words(lang, "Price unavailable", "السعر غير متاح")}
              </span>
            ) : (
              <CurrencyAmount value={price} locale={lang} />
            )}
          </strong>
          {action}
        </div>
      </div>
    </article>
  );
}
export function Card({ product, lang }: { product: Product; lang: Lang }) {
  return (
    <CardFrame
      name={product.name}
      {...(product.brand ? { brand: product.brand } : {})}
      price={displayPrice(product)}
      stock={product.stock}
      media={<Photo product={product} />}
      save={<Save id={product._id} lang={lang} />}
      action={<Purchase product={product} lang={lang} />}
      href={proofHref(product)}
      lang={lang}
    />
  );
}
