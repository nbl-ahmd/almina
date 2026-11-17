import Link from "../../../components/app-link";
import { requireProof, words } from "../../../components/design-proof/shared";
import { getLocale } from "../../../lib/server/i18n";
import s from "../../../components/design-proof/proof.module.css";
export default async function Checkout() {
  requireProof();
  const lang = await getLocale();
  return (
    <section className={s.modePanel}>
      <h1>
        {words(
          lang,
          "Checkout is unavailable in this preview",
          "إتمام الطلب غير متاح في هذه المعاينة",
        )}
      </h1>
      <p>
        {words(
          lang,
          "Ordering and payment are disabled here. Your device cart is preserved. No order has been created.",
          "الطلب والدفع غير مفعّلين هنا. سلة جهازك محفوظة. لم يتم إنشاء طلب.",
        )}
      </p>
      <p className={s.meta}>
        {words(
          lang,
          "This screen demonstrates the unavailable checkout mode. Real quotes and enabled checkout are verified separately in the isolated test harness.",
          "توضح هذه الشاشة وضع عدم توفر إتمام الطلب. يتم التحقق من عروض السعر وإتمام الطلب المفعّل بشكل منفصل في بيئة اختبار معزولة.",
        )}
      </p>
      <Link href="/design-proof/cart" className={s.primary}>
        {words(lang, "Return to cart", "العودة إلى السلة")}
      </Link>
    </section>
  );
}
