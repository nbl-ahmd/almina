import Link from "../../../components/app-link";
import { requireProof, words } from "../../../components/design-proof/shared";
import { getLocale } from "../../../lib/server/i18n";
import s from "../../../components/design-proof/proof.module.css";
export default async function Account() {
  requireProof();
  const lang = await getLocale();
  return (
    <section className={s.modePanel}>
      <h1>{words(lang, "Your account", "حسابك")}</h1>
      <p>
        {words(
          lang,
          "Account sign-in is not connected to this visual proof. Saved products and cart changes here are stored on this device only.",
          "تسجيل الدخول غير متصل بمعاينة التصميم هذه. المنتجات المحفوظة وتغييرات السلة هنا مخزنة على هذا الجهاز فقط.",
        )}
      </p>
      <p>
        {words(
          lang,
          "Existing sign-in, recovery and account features stay on the current site. No customer session is simulated here.",
          "تظل ميزات تسجيل الدخول والاسترداد والحساب على الموقع الحالي. لا تتم محاكاة جلسة عميل هنا.",
        )}
      </p>
      <div className={s.modeActions}>
        <Link href="/account" className={s.primary}>
          {words(
            lang,
            "Open account on existing site",
            "فتح الحساب على الموقع الحالي",
          )}
        </Link>
        <Link href="/design-proof/products">
          {words(lang, "Continue as guest", "تابع كزائر")}
        </Link>
      </div>
    </section>
  );
}
