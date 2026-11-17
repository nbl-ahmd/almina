import Link from "../../../components/app-link";
import { PlusIcon, HeartIcon } from "@heroicons/react/24/outline";
import {
  requireProof,
  CardFrame,
  words,
} from "../../../components/design-proof/shared";
import { getLocale } from "../../../lib/server/i18n";
import {
  PurchaseDock,
  SampleGallery,
} from "../../../components/design-proof/controls";
import { CurrencyAmount } from "../../../components/currency-amount";
import s from "../../../components/design-proof/proof.module.css";

/** Layout-only cases never pass fabricated identities/prices to catalogue or commerce helpers. */
export default async function Stress({
  searchParams,
}: {
  searchParams: Promise<{ columns?: string; sample?: string; pack?: string }>;
}) {
  requireProof();
  const lang = await getLocale(),
    params = await searchParams,
    columns = params.columns === "5" ? 5 : 4;
  const cases = [
    {
      name: "Example very long daily essentials collection with multiple distinguishing details and a large family pack — layout sample only",
      brand: "Example",
      pack: "Sample pack · 2 × 500 ml",
      price: 999999.99,
      stock: 8,
    },
    {
      name: "مثال اسم طويل جداً لاختبار وضوح معلومات العبوة والتمييز بين الخيارات المختلفة مع العناية اليومية — عينة تخطيط فقط",
      brand: "مثال",
      pack: "عبوة تجريبية · ٢ × ٥٠٠ مل",
      price: 82.5,
      stock: 8,
    },
    {
      name: "Example ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ — اختبار مختلط",
      brand: "Example",
      pack: "Mixed-script sample · 30 ml",
      price: 0,
      stock: 8,
    },
    {
      name: "Example unknown-price sample",
      brand: "Example",
      pack: "Price is not zero",
      price: null,
      stock: 8,
    },
    {
      name: "Example unavailable sample",
      brand: "Example",
      pack: "No purchase",
      price: 79,
      stock: 0,
    },
    {
      name: "No brand or pack metadata supplied — layout sample",
      price: 68,
      stock: 8,
    },
  ];
  const pdp = params.sample === "pdp",
    complete = params.sample === "complete";
  return (
    <div data-proof-columns={columns}>
      <h1>{words(lang, "Layout stress samples", "عينات اختبار التخطيط")}</h1>
      <p className={s.labNotice}>
        {words(
          lang,
          "Synthetic layout data, not saleable products. No medical facts, pack photography or working purchase actions.",
          "بيانات تخطيط اصطناعية وليست منتجات للبيع. لا معلومات طبية أو صور لعبوات أو إجراءات شراء مفعلة.",
        )}
      </p>
      <nav
        className={s.densityTools}
        aria-label={words(
          lang,
          "Layout sample controls",
          "أدوات عينات التخطيط",
        )}
      >
        {[
          ["4", "4 columns", "٤ أعمدة"],
          ["5", "5 columns", "٥ أعمدة"],
        ].map(([value, en, ar]) => (
          <Link
            key={value}
            aria-current={String(columns) === value ? "page" : undefined}
            href={`/design-proof/stress?columns=${value}`}
          >
            {words(lang, en!, ar!)}
          </Link>
        ))}
        <Link href="/design-proof/stress?sample=pdp">
          {words(lang, "Missing-content detail", "تفاصيل بمحتوى ناقص")}
        </Link>
        <Link href="/design-proof/stress?sample=complete">
          {words(lang, "Populated detail sample", "تفاصيل تجريبية مكتملة")}
        </Link>
        <Link href="/design-proof">
          {words(lang, "Real-photo proof", "معاينة الصور الفعلية")}
        </Link>
      </nav>
      {pdp || complete ? (
        <div className={s.pdp}>
          {complete ? (
            <SampleGallery lang={lang} />
          ) : (
            <div className={`${s.gallery} ${s.sampleMedia}`}>
              {words(
                lang,
                "Image not supplied — layout sample",
                "لم تُرفق صورة — عينة تخطيط",
              )}
            </div>
          )}
          <section className={s.buyColumn}>
            <h2>{words(lang, cases[0]!.name, cases[1]!.name)}</h2>
            <p className={s.labNotice}>
              {words(
                lang,
                "Synthetic identity for wrapping tests only",
                "هوية اصطناعية لاختبار التفاف النص فقط",
              )}
            </p>
            <p className={s.detailPrice}>
              <CurrencyAmount value={999999.99} locale={lang} />
            </p>
            <div className={s.options}>
              <h2>
                {words(lang, "Example pack labels", "مسميات عبوات تجريبية")}
              </h2>
              {[
                "30 ml",
                "50 ml",
                "100 ml — Extra long example pack label / عبوة اختبار طويلة جداً",
              ].map((label) => (
                <Link
                  key={label}
                  data-store-control="option" aria-current={params.pack === label ? "page" : undefined}
                  href={`/design-proof/stress?sample=${complete ? "complete" : "pdp"}&pack=${encodeURIComponent(label)}`}
                >
                  {label}
                </Link>
              ))}
            </div>
            <PurchaseDock>
              <span>
                <small>{words(lang, "Sample price", "سعر تجريبي")}</small>
                <strong>
                  <CurrencyAmount value={999999.99} locale={lang} />
                </strong>
              </span>
              <div className={s.purchaseDetail}>
                <button className={s.add} data-store-control="purchase" disabled>
                  {words(lang, "Sample only", "عينة فقط")}
                </button>
              </div>
            </PurchaseDock>
            <div className={s.facts}>
              <h2>{words(lang, "Example information", "معلومات تجريبية")}</h2>
              {complete ? (
                <>
                  <dl>
                    <div>
                      <dt>{words(lang, "Reference", "المرجع")}</dt>
                      <dd>
                        LAYOUT-SAMPLE-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789
                      </dd>
                    </div>
                    <div>
                      <dt>{words(lang, "Pack label", "مسمى العبوة")}</dt>
                      <dd>
                        {words(
                          lang,
                          "Synthetic family pack label for wrapping checks",
                          "مسمى عبوة اصطناعي لاختبار التفاف النص",
                        )}
                      </dd>
                    </div>
                  </dl>
                  <p>
                    {words(
                      lang,
                      "This nonmedical text tests a populated information area. It describes the layout exercise only and makes no product or service claim.",
                      "هذا نص غير طبي لاختبار مساحة معلومات مكتملة. يصف تمرين التخطيط فقط ولا يقدم أي ادعاء عن منتج أو خدمة.",
                    )}
                  </p>
                </>
              ) : (
                <p>
                  {words(
                    lang,
                    "Information is not supplied in this layout sample.",
                    "لم تُرفق معلومات في عينة التخطيط هذه.",
                  )}
                </p>
              )}
            </div>
          </section>
        </div>
      ) : (
        <div className={s.grid}>
          {cases.map((item, index) => (
            <CardFrame
              key={index}
              {...item}
              lang={lang}
              media={
                <div className={s.sampleMedia}>
                  {words(lang, "No sample image", "دون صورة تجريبية")}
                </div>
              }
              save={
                <button
                  className={s.save} data-store-control="save"
                  disabled
                  aria-label={words(
                    lang,
                    "Sample save disabled",
                    "حفظ العينة غير مفعّل",
                  )}
                >
                  <HeartIcon />
                </button>
              }
              action={
                <button
                  className={s.add} data-store-control="purchase"
                  disabled
                  aria-label={words(
                    lang,
                    "Sample purchase disabled",
                    "شراء العينة غير مفعّل",
                  )}
                >
                  <PlusIcon />
                </button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
