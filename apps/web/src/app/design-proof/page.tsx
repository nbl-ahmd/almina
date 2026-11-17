import Image from "next/image";
import { ArrowUpRightIcon } from "@heroicons/react/24/outline";
import Link from "../../components/app-link";
import { getProducts, getCategories } from "../../lib/server/catalog";
import { getLocale } from "../../lib/server/i18n";
import {
  Card,
  requireProof,
  words,
} from "../../components/design-proof/shared";
import { shopText } from "../../lib/i18n-storefront";
import s from "../../components/design-proof/proof.module.css";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string }>;
}) {
  requireProof();
  const [params, lang, catalog, categories] = await Promise.all([
    searchParams,
    getLocale(),
    getProducts(),
    getCategories(),
  ]);
  const split = params.lead === "split";
  return (
    <>
      <nav
        className={s.comparison}
        aria-label={words(
          lang,
          "Compare desktop layouts",
          "مقارنة تخطيطات سطح المكتب",
        )}
      >
        <span>{words(lang, "Desktop lead", "بداية سطح المكتب")}</span>
        <Link
          href="/design-proof?lead=full"
          aria-current={!split ? "page" : undefined}
        >
          {words(lang, "A · Full campaign", "A · بانر كامل")}
        </Link>
        <Link
          href="/design-proof?lead=split"
          aria-current={split ? "page" : undefined}
        >
          {words(lang, "B · Split discovery", "B · اكتشاف جانبي")}
        </Link>
        <small>
          {words(lang, "Same mobile sequence", "نفس الترتيب على الهاتف")}
        </small>
      </nav>
      <div className={split ? s.leadSplit : s.leadFull}>
        <section className={s.campaign} aria-labelledby="campaign-heading">
          <div>
            <h1 id="campaign-heading">
              {words(
                lang,
                "Everyday care.\nOne easy stop.",
                "عنايتك اليومية.\nفي مكان واحد.",
              )}
            </h1>
            <p>
              {words(
                lang,
                "Find your skincare and daily essentials.",
                "اكتشف منتجات العناية والبضائع اليومية.",
              )}
            </p>
            <Link className={s.primary} href="/design-proof/products">
              {words(lang, "Shop essentials", "تسوق الأساسيات")}
              <ArrowUpRightIcon aria-hidden="true" />
            </Link>
          </div>
          <Image
            src="/design/campaigns/almina-care-courier.png"
            alt=""
            width={500}
            height={500}
            priority
            className={s.courier}
          />
        </section>
        <section className={s.categories} aria-labelledby="categories-heading">
          <div className={s.sectionHead}>
            <h2 id="categories-heading">
              {words(lang, "Shop by category", "تسوق حسب الفئة")}
            </h2>
            <Link href="/design-proof/products">
              {words(lang, "View all", "عرض الكل")}
            </Link>
          </div>
          <div className={s.categoryList}>
            {categories.map((category, index) => (
              <Link
                key={category._id}
                href={`/design-proof/products?category=${category._id}`}
                className={s.category}
              >
                <span className={s.categoryArt}>
                  <Image
                    src="/design/categories/pharmacy-categories.png"
                    alt=""
                    width={1536}
                    height={1024}
                    style={{
                      left: `-${(index % 3) * 100}%`,
                      top: `-${Math.floor(index / 3) * 100}%`,
                    }}
                  />
                </span>
                <span>{shopText(lang, category.name)}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <section className={s.shelf}>
        <div className={s.sectionHead}>
          <div>
            <h2>
              {words(
                lang,
                "Care worth coming back for",
                "عناية تستحق العودة إليها",
              )}
            </h2>
          </div>
          <Link href="/design-proof/products">
            {words(lang, "All products", "جميع المنتجات")}
          </Link>
        </div>
        <div className={s.grid}>
          {catalog.products.map((product) => (
            <Card key={product._id} product={product} lang={lang} />
          ))}
        </div>
      </section>
    </>
  );
}
