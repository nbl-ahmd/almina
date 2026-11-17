import Link from "../../components/app-link";
import { getProducts, getCategories } from "../../lib/server/catalog";
import { getLocale } from "../../lib/server/i18n";
import {
  Card,
  requireProof,
  words,
} from "../../components/design-proof/shared";
import {
  Campaign,
  CategoryLane,
} from "../../components/design-proof/merchandising";
import s from "../../components/design-proof/proof.module.css";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; columns?: string; campaign?: string }>;
}) {
  requireProof();
  const [params, lang, catalog, categories] = await Promise.all([
    searchParams,
    getLocale(),
    getProducts(),
    getCategories(),
  ]);
  const missingCampaign = params.campaign === "none";
  const split = params.lead === "split" && !missingCampaign;
  const columns = params.columns === "4" ? 4 : 5;
  return (
    <div data-proof-columns={columns}>
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
          href={`/design-proof?lead=full&columns=${columns}`}
          aria-current={!split ? "page" : undefined}
        >
          {words(lang, "A · Full campaign", "A · بانر كامل")}
        </Link>
        <Link
          href={`/design-proof?lead=split&columns=${columns}`}
          aria-current={split ? "page" : undefined}
        >
          {words(lang, "B · Split discovery", "B · اكتشاف جانبي")}
        </Link>
        <Link
          href={`/design-proof?lead=${split ? "split" : "full"}&columns=4`}
          aria-current={columns === 4 ? "page" : undefined}
        >
          {words(lang, "4 columns", "٤ أعمدة")}
        </Link>
        <Link
          href={`/design-proof?lead=${split ? "split" : "full"}&columns=5`}
          aria-current={columns === 5 ? "page" : undefined}
        >
          {words(lang, "5 columns", "٥ أعمدة")}
        </Link>
        <Link href="/design-proof/stress">
          {words(lang, "Stress samples", "عينات الاختبار")}
        </Link>
        <small>
          {words(lang, "Same mobile sequence", "نفس الترتيب على الهاتف")}
        </small>
      </nav>
      <div className={split ? s.leadSplit : s.leadFull}>
        {missingCampaign ? (
          <h1>{words(lang, "Everyday essentials", "الأساسيات اليومية")}</h1>
        ) : (
          <Campaign lang={lang} />
        )}
        <CategoryLane categories={categories} lang={lang} />
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
    </div>
  );
}
