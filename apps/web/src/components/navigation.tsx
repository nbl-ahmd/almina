import { getCategories } from "../lib/server/catalog";
import { categoryHref } from "../lib/catalog/model";
import { StorefrontMenu } from "./storefront-menu";
import { SearchBox } from "./search-box";
import Image from "next/image";
import Link from "next/link";
import {
  PhoneIcon,
  UserCircleIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  MapPinIcon,
  ArrowUpRightIcon,
  ArrowUpIcon,
} from "@heroicons/react/24/outline";
import { NavigationLinks } from "./navigation-links";
import { CartLink } from "./cart-link";
import { DeliveryLocation } from "./delivery-location";
import { UsagePreferences } from "./usage-preferences";
import { LanguageSwitcher } from "./language-switcher";
import { t, type Locale, type MessageKey } from "../lib/i18n";

export async function Navigation({ locale = 'en' }: { locale?: Locale }) {
  const categories = (await getCategories().catch(()=>[])).filter(category=>!category.disabled).map(category=>({name:category.name,href:categoryHref(category)}));
  return (
    <>
      <a
        className="skip-link fixed top-2 left-2 z-[100] -translate-y-[160%] rounded-full bg-ink px-5 py-3 text-white focus:translate-y-0"
        href="#main-content"
      >
        {t(locale, 'skipToContent')}
      </a>
      <header className="storefront-header bg-surface">
        <div className="hidden bg-care-mint text-ink md:block">
          <div className="mx-auto flex min-h-11 max-w-[1344px] items-center justify-between gap-4 px-6 text-[13px] leading-5 text-ocean lg:px-8">
            <span className="truncate">{t(locale, 'announcement')}</span>
            <div className="flex shrink-0 items-center gap-2">
              <LanguageSwitcher locale={locale} label={t(locale, 'language')} />
              <span className="h-4 w-px bg-ink/15" aria-hidden="true" />
              <a
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-2 text-ink transition-colors hover:bg-white/60 hover:text-teal"
                href="tel:+971504825007"
                dir="ltr"
              >
                <PhoneIcon className="size-3.5" aria-hidden="true" />
                +971 50 482 5007
              </a>
            </div>
          </div>
        </div>
        <div className="border-b border-border bg-surface">
          <div className="header-content mx-auto grid max-w-[1344px] grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 px-4 py-2.5 md:grid-cols-[auto_minmax(0,1fr)_auto_auto] md:gap-x-3 md:px-6 md:py-3 lg:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] lg:gap-x-4 lg:px-8">
            <StorefrontMenu categories={categories} locale={locale} mobile />
            <Link
              href="/"
              aria-label={t(locale, 'homeAria')}
              className="brand-logo inline-flex w-fit"
            >
              <Image
                className="h-auto w-[88px] object-contain md:w-[120px] lg:w-[132px] xl:w-[144px]"
                src="/logo.png"
                alt="Al Mina Pharmacy"
                width={2789}
                height={910}
                sizes="(max-width: 767px) 88px, (max-width: 1023px) 120px, (max-width: 1279px) 132px, 144px"
              />
            </Link>
            <div className="col-span-full row-start-2 min-w-0 lg:col-auto lg:row-auto lg:mx-auto lg:w-full lg:max-w-[600px]">
              <SearchBox locale={locale} />
            </div>
            <DeliveryLocation locale={locale} />
            <Link
              href="/account"
              aria-label={t(locale, 'linkAccount')}
              className="hidden size-11 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:bg-subtle hover:text-teal md:inline-flex md:size-12 lg:gap-2 lg:px-3 xl:w-auto"
            >
              <UserCircleIcon className="size-[23px]" aria-hidden="true" />
              <span className="hidden text-sm font-medium xl:inline">{t(locale, 'linkAccount')}</span>
            </Link>
            <CartLink locale={locale} />
          </div>
        </div>
        <div className="hidden border-b border-border md:block">
          <div className="mx-auto flex max-w-[1344px] items-center justify-between gap-6 px-6 py-0.5 lg:px-8">
            <StorefrontMenu categories={categories} locale={locale} />
            <span className="hidden shrink-0 items-center gap-1.5 text-[13px] text-muted xl:flex">
              <MapPinIcon className="size-3.5" aria-hidden="true" />
              {t(locale, 'footerLocation')}
            </span>
          </div>
        </div>
        <NavigationLinks locale={locale} />
      </header>
      <nav
        aria-label={t(locale, 'quickContactAria')}
        className="floating-contact fixed right-4 bottom-[calc(84px+env(safe-area-inset-bottom))] z-30 md:right-6 md:bottom-6"
      >
        <Link
          href="/contact"
          aria-label={t(locale, 'contactAria')}
          className="flex size-12 items-center justify-center rounded-full bg-ink text-white shadow-raised transition-transform motion-safe:hover:-translate-y-0.5 md:size-14"
        >
          <ChatBubbleLeftRightIcon className="size-6" />
        </Link>
      </nav>
    </>
  );
}
const shopLinks: [MessageKey, string][] = [
  ["linkAllProducts", "/products"],
  ["linkCategories", "/categories"],
  ["linkOffers", "/offers"],
  ["linkShopBrands", "/brands"],
];
const helpLinks: [MessageKey, string][] = [
  ["linkGuides", "/health-guides"],
  ["linkAbout", "/about"],
  ["linkContact", "/contact"],
  ["linkDelivery", "/contact"],
];
const accountLinks: [MessageKey, string][] = [
  ["linkSaved", "/saved"],
  ["linkAccount", "/account"],
  ["linkCart", "/cart"],
];
const footerLinkClass = "group -mx-2 flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 text-[13px] text-ocean sm:text-sm transition-colors duration-200 hover:bg-subtle hover:text-ink focus-visible:bg-subtle";
const footerArrowClass = "hidden size-3.5 shrink-0 text-ink/20 transition-[color,transform] duration-200 group-hover:text-brand motion-safe:group-hover:translate-x-0.5 md:block md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100";
const footerVisitLinkClass = "group -mx-2 flex min-h-11 items-center justify-between gap-3 rounded-lg ps-8 pe-2 text-[13px] text-ocean sm:text-sm transition-colors duration-200 hover:bg-subtle hover:text-ink focus-visible:bg-subtle";
export function Footer({
  telemetryEnabled = false,
  locale = 'en',
}: {
  telemetryEnabled?: boolean;
  locale?: Locale;
}) {
  return (
    <footer className="storefront-footer mt-16 bg-care-blue pt-6 pb-[172px] text-ink md:pt-10 md:pb-24">
      <div className="mx-auto max-w-[1344px] px-3 md:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[20px] bg-surface shadow-raised">
          <div className="grid lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
            <div className="px-5 pt-7 pb-7 md:px-10 md:pt-10 md:pb-9 lg:py-12 lg:pr-12">
              <Link href="/" aria-label={t(locale, 'homeAria')} className="inline-flex w-fit">
                <Image
                  className="h-auto w-[140px] object-contain md:w-[184px]"
                  src="/logo.png"
                  alt=""
                  width={2789}
                  height={910}
                  sizes="(max-width: 767px) 140px, 184px"
                />
              </Link>
              <h2 className="mt-8 mb-0 max-w-[16ch] text-[clamp(2rem,3.6vw,3.35rem)] leading-[1.04] font-semibold tracking-[-0.03em] text-balance text-ink rtl:leading-[1.25] rtl:tracking-normal">
                {t(locale, 'footerCare')}
              </h2>
              <p className="mt-4 mb-0 max-w-[44ch] text-[15px] leading-6 text-ocean">
                {t(locale, 'footerTagline')}
              </p>
            </div>
            <div className="px-3 pb-3 md:px-4 md:pb-4 lg:py-4 lg:pr-4">
              <div className="flex h-full flex-col rounded-2xl bg-care-mint p-5 md:p-7">
                <h3 className="m-0 text-lg font-semibold text-ink">{t(locale, 'footerTalk')}</h3>
                <p className="mt-2 mb-0 max-w-[36ch] text-sm leading-6 text-ocean">{t(locale, 'footerSupport')}</p>
                <div className="mt-5 flex flex-col">
                  <a
                    href="tel:+971504825007"
                    className="group flex min-h-12 items-center gap-3 border-t border-ink/10 text-sm font-semibold text-ink transition-colors duration-200 hover:text-teal"
                  >
                    <PhoneIcon className="size-4 shrink-0 text-brand" aria-hidden="true" />
                    <span dir="ltr">+971 50 482 5007</span>
                    <ArrowUpRightIcon
                      className="ms-auto size-4 shrink-0 text-ink/20 transition-[color,transform] duration-200 group-hover:text-brand motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                  </a>
                  <a
                    href="mailto:info@alminapharmacy.com"
                    className="group flex min-h-12 items-center gap-3 border-t border-ink/10 text-sm text-ink transition-colors duration-200 hover:text-teal"
                  >
                    <EnvelopeIcon className="size-4 shrink-0 text-brand" aria-hidden="true" />
                    <span className="break-all">info@alminapharmacy.com</span>
                    <ArrowUpRightIcon
                      className="ms-auto size-4 shrink-0 text-ink/20 transition-[color,transform] duration-200 group-hover:text-brand motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                  </a>
                </div>
                <div className="mt-auto flex flex-col gap-2.5 pt-6 sm:flex-row">
                  <Link
                    href="/contact"
                    className="group inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold whitespace-nowrap text-ink transition-[background-color,transform] duration-200 hover:bg-brand-hover motion-safe:active:scale-[0.99]"
                  >
                    {t(locale, 'linkContact')}
                    <ArrowUpRightIcon
                      className="size-4 shrink-0 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                  <a
                    href="tel:+971504825007"
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full border border-ink/50 px-5 text-sm font-semibold whitespace-nowrap text-ink transition-[background-color,border-color,transform] duration-200 hover:border-ink/70 hover:bg-white/70 motion-safe:active:scale-[0.99]"
                  >
                    <PhoneIcon className="size-4 shrink-0 text-brand" aria-hidden="true" />
                    {t(locale, 'checkoutCallPharmacy')}
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-7 border-t border-border px-5 py-7 md:px-10 md:py-9 lg:grid-cols-4 lg:gap-8">
            <nav aria-label={t(locale, 'footerShopAria')}>
              <h3 className="mb-2 text-[13px] font-semibold text-muted">{t(locale, 'footerShop')}</h3>
              {shopLinks.map(([key, path]) => (
                <Link key={path} className={footerLinkClass} href={path!}>
                  <span>{t(locale, key)}</span>
                  <ArrowUpRightIcon className={footerArrowClass} aria-hidden="true" />
                </Link>
              ))}
            </nav>
            <nav aria-label={t(locale, 'footerHelpAria')}>
              <h3 className="mb-2 text-[13px] font-semibold text-muted">{t(locale, 'footerHelp')}</h3>
              {helpLinks.map(([key, path]) => (
                <Link key={key} className={footerLinkClass} href={path!}>
                  <span>{t(locale, key)}</span>
                  <ArrowUpRightIcon className={footerArrowClass} aria-hidden="true" />
                </Link>
              ))}
            </nav>
            <nav aria-label={t(locale, 'footerAccountAria')} className="col-span-2 sm:col-span-1">
              <h3 className="mb-2 text-[13px] font-semibold text-muted">{t(locale, 'footerAccount')}</h3>
              {accountLinks.map(([key, path]) => (
                <Link key={path} className={footerLinkClass} href={path!}>
                  <span>{t(locale, key)}</span>
                  <ArrowUpRightIcon className={footerArrowClass} aria-hidden="true" />
                </Link>
              ))}
            </nav>
            <div className="col-span-2 sm:col-span-1">
              <h3 className="mb-2 text-[13px] font-semibold text-muted">{t(locale, 'footerVisit')}</h3>
              <p className="mt-3 mb-0 flex items-start gap-2 text-sm leading-6 text-ocean">
                <MapPinIcon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                <span>{t(locale, 'footerLocation')}</span>
              </p>
              <Link key="map" className={footerVisitLinkClass} href="/map">
                <span>{t(locale, 'footerMap')}</span>
                <ArrowUpRightIcon className={footerArrowClass} aria-hidden="true" />
              </Link>
              <Link key="local" className={footerVisitLinkClass} href="/ras-al-khaimah">
                <span>{t(locale, 'linkLocal')}</span>
                <ArrowUpRightIcon className={footerArrowClass} aria-hidden="true" />
              </Link>
            </div>
          </div>
          {telemetryEnabled ? (
            <div className="px-5 md:px-10">
              <UsagePreferences />
            </div>
          ) : null}
          <div className="flex flex-col gap-4 border-t border-border bg-page px-5 py-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between md:px-10">
            <span>{t(locale, 'footerBottom')}</span>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <LanguageSwitcher locale={locale} label={t(locale, 'language')} size="default" />
              <a
                href="#top"
                className="group inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border px-3.5 text-xs font-medium text-ink transition-colors duration-200 hover:border-ink/30 hover:bg-subtle"
              >
                <ArrowUpIcon className="size-4 transition-transform duration-200 motion-safe:group-hover:-translate-y-0.5" aria-hidden="true" />
                {t(locale, 'backToTop')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
