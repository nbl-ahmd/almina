import Link from "../../../components/app-link";
import { getProducts, getCategories } from "../../../lib/server/catalog";
import { getLocale } from "../../../lib/server/i18n";
import {
  Card,
  requireProof,
  words,
} from "../../../components/design-proof/shared";
import { shopText } from "../../../lib/i18n-storefront";
import { ResponsiveFilters } from "../../../components/design-proof/controls";
import s from "../../../components/design-proof/proof.module.css";
export default async function Listing({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  requireProof();
  const params = await searchParams;
  const lang = await getLocale();
  const sort =
    params.sort === "price-asc" ||
    params.sort === "price-desc" ||
    params.sort === "name"
      ? params.sort
      : "relevance";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const [catalog, categories] = await Promise.all([
    getProducts({
      ...(params.q ? { q: params.q.slice(0, 80) } : {}),
      ...(params.category ? { category: params.category } : {}),
      sort,
      page,
      locale: lang,
    }),
    getCategories(),
  ]);
  const href = (values: Record<string, string>) =>
    `/design-proof/products?${new URLSearchParams({ ...params, ...values })}`;
  return (
    <>
      <p className={s.breadcrumb}>
        <Link href="/design-proof">{words(lang, "Home", "الرئيسية")}</Link> /{" "}
        {words(lang, "Products", "المنتجات")}
      </p>
      <div className={s.sectionHead}>
        <div>
          <h1>
            {params.q
              ? words(lang, `Results for “${params.q}”`, `نتائج «${params.q}»`)
              : words(lang, "Everyday essentials", "الأساسيات اليومية")}
          </h1>
          <p className={s.meta}>
            {catalog.products.length}{" "}
            {words(lang, "products on this page", "منتجات في هذه الصفحة")}
          </p>
        </div>
      </div>
      <div className={s.listLayout}>
        <aside className={s.filters}>
          <ResponsiveFilters label={words(lang, "Categories", "الفئات")}>
            <Link
              href={href({ category: "", page: "1" })}
              aria-current={!params.category ? "page" : undefined}
            >
              {words(lang, "All products", "جميع المنتجات")}
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat._id}
                href={href({ category: cat._id, page: "1" })}
                aria-current={params.category === cat._id ? "page" : undefined}
              >
                {shopText(lang, cat.name)}
              </Link>
            ))}
          </ResponsiveFilters>
        </aside>
        <section aria-label={words(lang, "Product results", "نتائج المنتجات")}>
          <form
            className={s.sortBar}
            method="get"
            action="/design-proof/products"
          >
            {params.q && <input type="hidden" name="q" value={params.q} />}
            {params.category && (
              <input type="hidden" name="category" value={params.category} />
            )}
            <label htmlFor="proof-sort">
              {words(lang, "Sort by", "ترتيب حسب")}
            </label>
            <select id="proof-sort" name="sort" defaultValue={sort}>
              <option value="relevance">
                {words(lang, "Relevance", "الصلة")}
              </option>
              <option value="price-asc">
                {words(lang, "Price: low to high", "السعر: تصاعدي")}
              </option>
              <option value="price-desc">
                {words(lang, "Price: high to low", "السعر: تنازلي")}
              </option>
              <option value="name">{words(lang, "Name", "الاسم")}</option>
            </select>
            <button type="submit">{words(lang, "Apply", "تطبيق")}</button>
          </form>
          {catalog.searchUnavailable ? (
            <div className={s.empty}>
              <h2>
                {words(
                  lang,
                  "Search is temporarily unavailable",
                  "البحث غير متاح مؤقتاً",
                )}
              </h2>
              <Link href="/design-proof/products">
                {words(lang, "Browse all products", "تصفح جميع المنتجات")}
              </Link>
            </div>
          ) : catalog.products.length ? (
            <div className={s.grid}>
              {catalog.products.map((product) => (
                <Card key={product._id} product={product} lang={lang} />
              ))}
            </div>
          ) : (
            <div className={s.empty}>
              <h2>{words(lang, "No products found", "لا توجد منتجات")}</h2>
              <p>
                {words(
                  lang,
                  "Try a product or brand name, or clear your filters.",
                  "جرب اسم المنتج أو العلامة التجارية أو أزل الفلاتر.",
                )}
              </p>
              <Link href="/design-proof/products">
                {words(lang, "Clear filters", "إزالة الفلاتر")}
              </Link>
            </div>
          )}
          <nav
            className={s.pagination}
            aria-label={words(lang, "Pagination", "الصفحات")}
          >
            {page > 1 && (
              <Link href={href({ page: String(page - 1) })}>
                {words(lang, "Previous", "السابق")}
              </Link>
            )}
            {catalog.hasNext && (
              <Link href={href({ page: String(page + 1) })}>
                {words(lang, "Next", "التالي")}
              </Link>
            )}
          </nav>
        </section>
      </div>
    </>
  );
}
