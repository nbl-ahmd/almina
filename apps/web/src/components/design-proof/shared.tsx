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
import { Purchase, Save, ProofProductLink } from "./controls";
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
  returnTo,
  memoryKey = "proof-sample",
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
  returnTo?: string;
  memoryKey?: string;
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
          <ProofProductLink
            href={href}
            {...(returnTo ? { returnTo } : {})}
            memoryKey={memoryKey + "-photo"}
            className={s.photoLink}
            name={name ?? ""}
          >
            {media}
          </ProofProductLink>
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
          <ProofProductLink
            href={href}
            {...(returnTo ? { returnTo } : {})}
            memoryKey={memoryKey + "-name"}
            className={s.productName}
            name={name ?? ""}
          >
            <bdi>{visible}</bdi>
          </ProofProductLink>
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
export function Card({
  product,
  lang,
  returnTo,
}: {
  product: Product;
  lang: Lang;
  returnTo?: string;
}) {
  return (
    <CardFrame
      name={product.name}
      {...(product.brand ? { brand: product.brand } : {})}
      price={displayPrice(product)}
      stock={product.stock}
      media={<Photo product={product} />}
      save={<Save id={product._id} lang={lang} name={product.name} />}
      action={<Purchase product={product} lang={lang} />}
      href={
        proofHref(product) +
        (returnTo ? "?returnTo=" + encodeURIComponent(returnTo) : "")
      }
      {...(returnTo ? { returnTo } : {})}
      memoryKey={"proof-product-" + product._id}
      lang={lang}
    />
  );
}
