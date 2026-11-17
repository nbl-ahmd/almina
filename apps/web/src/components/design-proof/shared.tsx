import "server-only";
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
export function Card({ product, lang }: { product: Product; lang: Lang }) {
  return (
    <article className={s.card}>
      <div className={s.cardMedia}>
        <span className={product.stock > 0 ? s.stock : s.unavailable}>
          {words(
            lang,
            product.stock > 0 ? "In stock" : "Unavailable",
            product.stock > 0 ? "متوفر" : "غير متوفر",
          )}
        </span>
        <Save id={product._id} lang={lang} />
        <Link href={proofHref(product)} className={s.photoLink}>
          <Photo product={product} />
        </Link>
      </div>
      <div className={s.cardBody}>
        <p className={s.meta}>{product.brand}</p>
        <Link href={proofHref(product)} className={s.productName}>
          {product.name}
        </Link>
        <div className={s.cardBuy}>
          <strong>
            <CurrencyAmount value={displayPrice(product)} locale={lang} />
          </strong>
          <Purchase product={product} lang={lang} />
        </div>
      </div>
    </article>
  );
}
