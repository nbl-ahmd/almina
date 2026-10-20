import { SearchBox } from "./search-box";
import Image from "next/image";
import Link from "next/link";
import {
  PhoneIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import { NavigationLinks } from "./navigation-links";
import { CartLink } from "./cart-link";
import { DeliveryAreaPrompt, DeliveryLocation } from "./delivery-location";
import { UsagePreferences } from "./usage-preferences";
import { LanguageSwitcher } from "./language-switcher";
import { t, type Locale, type MessageKey } from "../lib/i18n";

export function Navigation({ locale = 'en' }: { locale?: Locale }) {
  return (
    <>
      <a
        className="skip-link fixed top-2 left-2 z-[100] -translate-y-[160%] rounded-xl bg-white px-4 py-3 text-brand focus:translate-y-0"
        href="#main-content"
      >
        {t(locale, 'skipToContent')}
      </a>
      <header className="storefront-header border-b border-border bg-white">
        <div className="hidden bg-[#eef1ff] md:block">
          <div className="mx-auto flex min-h-8 max-w-[1344px] items-center justify-between px-6 text-[11px] text-[#3f4f83] lg:px-8">
            <span>{t(locale, 'announcement')}</span>
            <div className="flex items-center gap-4">
              <LanguageSwitcher locale={locale} label={t(locale, 'language')} />
              <a
                className="inline-flex items-center gap-2 text-[#3f4f83]"
                href="tel:+971504825007"
              >
                <PhoneIcon className="size-3.5" />
                +971 50 482 5007
              </a>
            </div>
          </div>
        </div>
        <div className="header-content mx-auto grid max-w-[1344px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 py-2.5 md:grid-cols-[auto_minmax(0,1fr)_auto_auto] md:gap-5 md:px-6 lg:px-8">
          <Link
            href="/"
            aria-label={t(locale, 'homeAria')}
            className="brand-logo inline-flex w-fit"
          >
            <Image
              className="h-auto w-[112px] object-contain md:w-[140px]"
              src="/logo.png"
              alt="Al Mina Pharmacy"
              width={2789}
              height={910}
              sizes="(max-width: 767px) 112px, 140px"
            />
          </Link>
          <SearchBox />
          <DeliveryLocation />
          <CartLink />
        </div>
        <div className="hidden border-t border-border md:block">
          <div className="mx-auto max-w-[1344px] px-6 lg:px-8">
            <NavigationLinks desktop locale={locale} />
          </div>
        </div>
        <DeliveryAreaPrompt />
        <NavigationLinks locale={locale} />
      </header>
      <nav
        aria-label={t(locale, 'quickContactAria')}
        className="floating-contact fixed right-4 bottom-[calc(80px+env(safe-area-inset-bottom))] z-30 md:right-6 md:bottom-6"
      >
        <Link
          href="/contact"
          aria-label={t(locale, 'contactAria')}
          className="flex size-12 items-center justify-center rounded-full bg-brand text-white shadow-raised transition-transform motion-safe:hover:-translate-y-0.5 md:size-14"
        >
          <ChatBubbleLeftRightIcon className="size-6" />
        </Link>
      </nav>
    </>
  );
}
const shopLinks: [MessageKey, string][] = [
  ["linkShopBrands", "/brands"],
  ["linkAccount", "/account"],
  ["linkSaved", "/saved"],
  ["linkAllProducts", "/products"],
  ["linkCategories", "/categories"],
  ["linkOffers", "/offers"],
  ["linkCart", "/cart"],
];
const helpLinks: [MessageKey, string][] = [
  ["linkLocal", "/ras-al-khaimah"],
  ["linkGuides", "/health-guides"],
  ["linkAbout", "/about"],
  ["linkContact", "/contact"],
  ["linkDelivery", "/contact"],
];
export function Footer({
  telemetryEnabled = false,
  locale = 'en',
}: {
  telemetryEnabled?: boolean;
  locale?: Locale;
}) {
  return (
    <footer className="storefront-footer mt-7 border-t border-border bg-[#f1f3fc] pt-7 pb-5">
      <div className="mx-auto max-w-[1344px] px-4 md:px-6 lg:px-8">
        <div className="grid gap-8 border-b border-[#dce0ef] pb-9 md:grid-cols-[1.5fr_1fr_1fr_1.3fr]">
          <div>
            <Link href="/" className="inline-flex">
              <Image
                className="h-auto w-[145px] object-contain"
                src="/logo.png"
                alt="Al Mina Pharmacy home"
                width={2789}
                height={910}
                sizes="145px"
              />
            </Link>
            <p className="mt-4 mb-3 max-w-xs text-sm leading-6 text-muted">
              {t(locale, 'footerTagline')}
            </p>
            <span className="text-xs text-muted">
              {t(locale, 'footerLocation')}
            </span>
          </div>
          <nav aria-label={t(locale, 'footerShopAria')}>
            <h2 className="mb-3 text-base font-semibold">
              {t(locale, 'footerShop')}
            </h2>
            {shopLinks.map(([key, path]) => (
              <Link
                key={path}
                className="flex min-h-10 items-center text-sm text-muted hover:text-brand"
                href={path!}
              >
                {t(locale, key)}
              </Link>
            ))}
          </nav>
          <nav aria-label={t(locale, 'footerHelpAria')}>
            <h2 className="mb-3 text-base font-semibold">{t(locale, 'footerHelp')}</h2>
            {helpLinks.map(([key, path]) => (
              <Link
                key={key}
                className="flex min-h-10 items-center text-sm text-muted hover:text-brand"
                href={path!}
              >
                {t(locale, key)}
              </Link>
            ))}
          </nav>
          <div>
            <h2 className="mb-3 text-base font-semibold">{t(locale, 'footerTalk')}</h2>
            <a
              href="tel:+971504825007"
              className="mb-2 flex min-h-11 items-center gap-2 text-sm font-medium text-brand"
            >
              <PhoneIcon className="size-4" />
              +971 50 482 5007
            </a>
            <a
              href="mailto:info@alminapharmacy.com"
              className="inline-flex min-h-11 items-center text-sm text-muted hover:text-brand"
            >
              info@alminapharmacy.com
            </a>
            <p className="mt-3 mb-0 text-xs leading-5 text-muted">
              {t(locale, 'footerSupport')}
            </p>
            <div className="mt-3 md:hidden">
              <LanguageSwitcher locale={locale} label={t(locale, 'language')} />
            </div>
          </div>
        </div>
        {telemetryEnabled ? <UsagePreferences /> : null}
        <div className="flex flex-wrap justify-between gap-3 pt-5 text-xs text-muted">
          <span>{t(locale, 'footerBottom')}</span>
          <span>{t(locale, 'footerCare')}</span>
        </div>
      </div>
    </footer>
  );
}
