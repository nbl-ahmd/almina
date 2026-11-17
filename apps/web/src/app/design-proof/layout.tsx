import type { Metadata, Viewport } from "next";
import Image from "next/image";
import Link from "../../components/app-link";
import { getLocale } from "../../lib/server/i18n";
import { storefrontLatin, storefrontArabic } from "../../lib/storefront-fonts";
import { requireProof, words } from "../../components/design-proof/shared";
import { ProofLocaleProvider } from "../../components/design-proof/locale";
import { ProofChrome } from "../../components/design-proof/controls";
import boundary from "../../components/storefront-system/boundary.module.css";
import system from "../../components/storefront-system/tokens.module.css";
import s from "../../components/design-proof/proof.module.css";
export function generateMetadata(): Metadata {
  requireProof();
  return {
    title: "Al Mina — isolated design proof",
    robots: { index: false, follow: false },
    alternates: { canonical: null },
  };
}
export function generateViewport(): Viewport {
  requireProof();
  return { width: "device-width", initialScale: 1, viewportFit: "cover" };
}
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  requireProof();
  const lang = await getLocale();
  return (
    <div
      className={`${system.system} ${boundary.boundary} ${s.root} ${storefrontLatin.variable} ${storefrontArabic.variable}`}
      dir={lang === "ar" ? "rtl" : "ltr"}
      lang={lang}
      data-proof-root
    >
      <a className={s.skip} href="#proof-content">
        {words(lang, "Skip to products", "انتقل إلى المنتجات")}
      </a>
      <ProofChrome lang={lang} />
      <main id="proof-content" className={s.main}>
        <ProofLocaleProvider value={lang}>{children}</ProofLocaleProvider>
      </main>
      <footer className={s.footer}>
        <Image src="/logo.png" alt="Al Mina Pharmacy" width={142} height={46} />
        <p>
          {words(
            lang,
            "Browse with confidence. Ask us when you need help choosing.",
            "تصفح بثقة. تواصل معنا للمساعدة في الاختيار.",
          )}
        </p>
        <nav aria-label={words(lang, "Footer", "التذييل")}>
          <Link href="/design-proof/products">
            {words(lang, "All products", "جميع المنتجات")}
          </Link>
          <Link href="/design-proof/account">
            {words(lang, "Account preview", "معاينة الحساب")}
          </Link>
          <Link href="/contact">
            {words(
              lang,
              "Contact Al Mina (existing site)",
              "تواصل مع الميناء (الموقع الحالي)",
            )}
          </Link>
        </nav>
        <small>
          {words(
            lang,
            "Local direction proof · no orders or payments",
            "معاينة محلية للتصميم · دون طلبات أو مدفوعات",
          )}
        </small>
      </footer>
    </div>
  );
}
