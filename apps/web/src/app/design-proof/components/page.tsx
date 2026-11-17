import type { ReactNode } from "react";
import { HeartIcon } from "@heroicons/react/24/outline";
import Link from "../../../components/app-link";
import {
  getProducts,
  getCategories,
  resolveProduct,
  getProductVariants,
  productImages,
} from "../../../lib/server/catalog";
import { getLocale } from "../../../lib/server/i18n";
import { displayPrice } from "../../../lib/catalog/model";
import {
  Card,
  CardFrame,
  requireProof,
  words,
} from "../../../components/design-proof/shared";
import {
  Campaign,
  CategoryLane,
} from "../../../components/design-proof/merchandising";
import { ProductOptions } from "../../../components/design-proof/options";
import {
  ProofGallery,
  Purchase,
  PurchaseDock,
  ResponsiveFilters,
} from "../../../components/design-proof/controls";
import { CartContinuation } from "../../../components/design-proof/cart";
import { CurrencyAmount } from "../../../components/currency-amount";
import { ControlStateExamples } from "../../../components/design-proof/style-contract";
import { FeedbackSamples } from "../../../components/design-proof/feedback-samples";
import { StorefrontMenu } from "../../../components/storefront-menu";
import { Button } from "../../../components/ui/button";
import s from "../../../components/design-proof/proof.module.css";
import c from "../../../components/design-proof/specimen.module.css";
function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={c.section} aria-labelledby={id + "-heading"}>
      <h2 id={id + "-heading"}>{title}</h2>
      {children}
    </section>
  );
}
export default async function Components() {
  requireProof();
  const [lang, catalog, categories, family] = await Promise.all([
    getLocale(),
    getProducts(),
    getCategories(),
    resolveProduct("sample--PD9901"),
  ]);
  const product = catalog.products[0];
  const variants = family ? await getProductVariants(family) : [];
  const groups = [
    [
      "context",
      "Header, search, location and navigation",
      "الرأس والبحث والموقع والتنقل",
    ],
    ["controls", "Actions and fields", "الإجراءات والحقول"],
    ["merchandising", "Campaign and categories", "الحملة والفئات"],
    ["cards", "Product cards and prices", "بطاقات المنتجات والأسعار"],
    ["product", "Gallery, options and quantity", "المعرض والخيارات والكمية"],
    ["disclosure", "Filters and disclosure", "الفلاتر والتفاصيل"],
    ["sheets", "Sheets and popovers", "اللوحات والقوائم"],
    [
      "feedback",
      "Loading, empty, error and success",
      "التحميل والنتائج الفارغة والخطأ والنجاح",
    ],
    ["cart", "Cart and purchase dock", "السلة وشريط الشراء"],
  ];
  return (
    <div className={c.specimen}>
      <h1>
        {words(lang, "Storefront component specimen", "نماذج مكونات المتجر")}
      </h1>
      <p>
        {words(
          lang,
          "Local component review. Real catalogue helpers and device cart; synthetic fixture prices/stock. State samples are labelled. No orders or payments.",
          "مراجعة محلية للمكونات. أدوات الكتالوج وسلة الجهاز الفعلية؛ الأسعار والمخزون تجريبيان. الحالات التوضيحية موسومة. دون طلبات أو مدفوعات.",
        )}
      </p>
      <nav
        className={c.index}
        aria-label={words(lang, "Component index", "فهرس المكونات")}
      >
        {groups.map(([id, en, ar]) => (
          <a key={id} href={"#" + id}>
            {words(lang, en!, ar!)}
          </a>
        ))}
      </nav>
      <Section id="context" title={words(lang, groups[0]![1]!, groups[0]![2]!)}>
        <p>
          {words(
            lang,
            "Use the working header above: open location, focus search, inspect suggestions and resize the navigation. Product/cart task modes are on their real routes.",
            "استخدم الرأس الفعلي أعلاه: افتح الموقع والبحث والاقتراحات وغيّر حجم الشاشة. أوضاع المنتج والسلة في مساراتها الفعلية.",
          )}
        </p>
        <Link href="/design-proof/products">
          {words(lang, "Open results", "افتح النتائج")}
        </Link>
      </Section>
      <Section
        id="controls"
        title={words(lang, groups[1]![1]!, groups[1]![2]!)}
      >
        <p>
          {words(
            lang,
            "Demonstration states for actual shared controls. Product cards below perform real server-checked device-cart actions.",
            "حالات توضيحية لعناصر التحكم المشتركة الفعلية. البطاقات أدناه تستخدم تحقق الخادم لسلة الجهاز.",
          )}
        </p>
        <ControlStateExamples lang={lang} />
      </Section>
      <Section
        id="merchandising"
        title={words(lang, groups[2]![1]!, groups[2]![2]!)}
      >
        <Campaign
          lang={lang}
          headingAs="h3"
          headingId="specimen-campaign"
          priority={false}
        />
        <CategoryLane
          categories={categories}
          lang={lang}
          headingAs="h3"
          headingId="specimen-categories"
        />
      </Section>
      <Section id="cards" title={words(lang, groups[3]![1]!, groups[3]![2]!)}>
        <div className={s.grid}>
          {catalog.products.map((item) => (
            <Card key={item._id} product={item} lang={lang} />
          ))}
          <CardFrame
            name={words(
              lang,
              "Layout sample — missing image and unknown price",
              "عينة تخطيط — صورة وسعر غير متاحين",
            )}
            price={null}
            stock={0}
            lang={lang}
            media={
              <span>
                {words(lang, "Photo unavailable", "الصورة غير متاحة")}
              </span>
            }
            save={
              <Button
                variant="ghost"
                disabled
                aria-label={words(
                  lang,
                  "Sample save unavailable",
                  "الحفظ غير متاح في العينة",
                )}
              >
                <HeartIcon aria-hidden="true" />
              </Button>
            }
            action={
              <Button disabled>
                {words(lang, "Unavailable sample", "عينة غير متاحة")}
              </Button>
            }
          />
        </div>
        <p>
          {words(
            lang,
            "Price-format samples only, not catalogue offers:",
            "عينات لتنسيق الأسعار فقط، وليست عروضاً في الكتالوج:",
          )}
        </p>
        <div className={c.prices}>
          <CurrencyAmount value={0} locale={lang} />
          <CurrencyAmount value={999999.99} locale={lang} />
        </div>
      </Section>
      <Section id="product" title={words(lang, groups[4]![1]!, groups[4]![2]!)}>
        {product && (
          <>
            <div className={`${s.gallery} ${c.gallery}`}>
              <ProofGallery
                images={productImages(product)}
                name={product.name}
                lang={lang}
              />
            </div>
            <Purchase product={product} lang={lang} detailed />
          </>
        )}
        {family && (
          <>
            <p>
              {words(
                lang,
                "Synthetic family — not for sale; image regions are labelled placeholders. Select a pack to open its actual proof route.",
                "عائلة تجريبية غير مخصصة للبيع؛ الصور مساحات توضيحية موسومة. اختر العبوة لفتح مسار المعاينة الفعلي.",
              )}
            </p>
            <div className={`${s.gallery} ${c.gallery}`}>
              <ProofGallery
                images={productImages(family)}
                name={family.name}
                lang={lang}
              />
            </div>
            <ProductOptions
              product={family}
              variants={variants}
              returnTo="/design-proof/products"
              lang={lang}
              headingAs="h3"
            />
          </>
        )}
      </Section>
      <Section
        id="disclosure"
        title={words(lang, groups[5]![1]!, groups[5]![2]!)}
      >
        <div className={s.filters}>
          <ResponsiveFilters
            label={words(lang, "Browse categories", "تصفح الفئات")}
          >
            {categories.map((item) => (
              <Link
                key={item._id}
                href={"/design-proof/products?category=" + item._id}
              >
                {item.name}
              </Link>
            ))}
          </ResponsiveFilters>
        </div>
      </Section>
      <Section id="sheets" title={words(lang, groups[6]![1]!, groups[6]![2]!)}>
        <StorefrontMenu
          locale={lang}
          categories={categories.map((item) => ({
            name: item.name,
            href: "/design-proof/products?category=" + item._id,
          }))}
        />
        <StorefrontMenu
          locale={lang}
          mobile
          categories={categories.map((item) => ({
            name: item.name,
            href: "/design-proof/products?category=" + item._id,
          }))}
        />
      </Section>
      <Section
        id="feedback"
        title={words(lang, groups[7]![1]!, groups[7]![2]!)}
      >
        <FeedbackSamples lang={lang} />
      </Section>
      <Section id="cart" title={words(lang, groups[8]![1]!, groups[8]![2]!)}>
        <p>
          {words(
            lang,
            "The dock below is embedded for inspection. Use a real product page to test screen-fixed buying. Cart content is your actual device cart in this preview.",
            "الشريط أدناه مضمّن للفحص. اختبر الشراء الثابت في صفحة المنتج الفعلية. محتوى السلة هو سلة جهازك في هذه المعاينة.",
          )}
        </p>
        {product && (
          <PurchaseDock embedded>
            <span>
              <small>{words(lang, "Product price", "سعر المنتج")}</small>
              <strong>
                <CurrencyAmount value={displayPrice(product)} locale={lang} />
              </strong>
            </span>
            <Purchase product={product} lang={lang} detailed />
          </PurchaseDock>
        )}
        <CartContinuation lang={lang} headingAs="h3" />
      </Section>
    </div>
  );
}
