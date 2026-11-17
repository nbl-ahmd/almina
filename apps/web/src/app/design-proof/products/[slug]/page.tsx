import { notFound } from "next/navigation";
import Link from "../../../../components/app-link";
import {
  resolveProduct,
  productImages,
  getProductVariants,
  getProductRecommendations,
} from "../../../../lib/server/catalog";
import { getLocale } from "../../../../lib/server/i18n";
import {
  displayPrice,
  productOptionLabel,
} from "../../../../lib/catalog/model";
import {
  Card,
  requireProof,
  words,
  proofHref,
} from "../../../../components/design-proof/shared";
import {
  Purchase,
  Save,
  PurchaseDock,
  ReturnToResults,
  ProofGallery,
} from "../../../../components/design-proof/controls";
import { proofListingReturn } from "../../../../lib/design-proof-navigation";
import { sameFamilyIdentity } from "@almina/contracts";
import { CurrencyAmount } from "../../../../components/currency-amount";
import s from "../../../../components/design-proof/proof.module.css";
export default async function Detail({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  requireProof();
  const product = await resolveProduct((await params).slug);
  if (!product) notFound();
  const lang = await getLocale();
  const returnTo = proofListingReturn((await searchParams).returnTo);
  const [variants, related] = await Promise.all([
    getProductVariants(product),
    getProductRecommendations(product),
  ]);
  const members = variants.filter((member) =>
    sameFamilyIdentity(product, member),
  );
  return (
    <>
      <p className={s.breadcrumb}>
        <ReturnToResults href={returnTo} lang={lang} /> / {product.brand}
      </p>
      <div className={s.pdp}>
        <div className={s.gallery}>
          <Save id={product._id} lang={lang} name={product.name} />
          <ProofGallery
            key={product._id}
            images={productImages(product)}
            name={product.name}
            lang={lang}
          />
        </div>
        <section className={s.buyColumn}>
          <h1>{product.name}</h1>
          {productOptionLabel(product) && <p>{productOptionLabel(product)}</p>}
          <span className={product.stock > 0 ? s.stock : s.unavailable}>
            {words(
              lang,
              product.stock > 0 ? "In stock" : "Currently unavailable",
              product.stock > 0 ? "متوفر" : "غير متوفر حالياً",
            )}
          </span>
          <p className={s.detailPrice}>
            <CurrencyAmount value={displayPrice(product)} locale={lang} />
          </p>
          {members.length > 1 && (
            <div className={s.options}>
              <h2>{words(lang, "Choose your pack", "اختر العبوة")}</h2>
              {members.map((item) => (
                <Link
                  key={item._id}
                  href={
                    proofHref(item) +
                    "?returnTo=" +
                    encodeURIComponent(returnTo)
                  }
                  aria-current={item._id === product._id ? "page" : undefined}
                >
                  {productOptionLabel(item) || item.name}
                </Link>
              ))}
            </div>
          )}
          <PurchaseDock>
            <span>
              <small>{words(lang, "Price", "السعر")}</small>
              <strong>
                <CurrencyAmount value={displayPrice(product)} locale={lang} />
              </strong>
            </span>
            <Purchase
              key={product._id}
              product={product}
              lang={lang}
              detailed
            />
          </PurchaseDock>
          <div className={s.facts}>
            <h2>{words(lang, "Product information", "معلومات المنتج")}</h2>
            <dl>
              <div>
                <dt>{words(lang, "Brand", "العلامة")}</dt>
                <dd>{product.brand || "—"}</dd>
              </div>
              <div>
                <dt>{words(lang, "Product code", "رمز المنتج")}</dt>
                <dd dir="ltr">{product.product_id}</dd>
              </div>
            </dl>
            <p>
              {words(
                lang,
                "Detailed product information is not included in this sample catalogue. Check with Al Mina before choosing if you need more information.",
                "لا يتضمن الكتالوج التجريبي معلومات تفصيلية. تواصل مع الميناء قبل الاختيار إذا كنت تحتاج إلى معلومات إضافية.",
              )}
            </p>
            <Link href="/contact">
              {words(
                lang,
                "Contact the pharmacy (existing site)",
                "تواصل مع الصيدلية (الموقع الحالي)",
              )}
            </Link>
          </div>
        </section>
      </div>
      {related.length > 0 && (
        <section className={s.shelf}>
          <div className={s.sectionHead}>
            <h2>
              {words(
                lang,
                "Explore more care",
                "اكتشف المزيد من منتجات العناية",
              )}
            </h2>
          </div>
          <div className={s.grid}>
            {related.map((item) => (
              <Card key={item._id} product={item} lang={lang} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
