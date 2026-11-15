import { shopText as u } from '../lib/i18n-storefront';
import { getCategories } from '../lib/server/catalog';
import { categoryHref } from '../lib/catalog/model';
import { StorefrontMenu } from './storefront-menu';
import { SearchBox } from './search-box';
import Image from 'next/image';
import Link from './app-link';
import { PhoneIcon, UserCircleIcon, ArrowUpIcon } from '@heroicons/react/24/outline';
import { NavigationLinks } from './navigation-links';
import { CartLink } from './cart-link';
import { DeliveryLocation } from './delivery-location';
import { UsagePreferences } from './usage-preferences';
import { LanguageSwitcher } from './language-switcher';
import { t, type Locale, type MessageKey } from '../lib/i18n';
import { policyLinks } from '../lib/policies';

export async function Navigation({ locale = 'en' }: { locale?: Locale }) {
  const categories = (await getCategories().catch(() => [])).filter(category => !category.disabled).map(category => ({ name: u(locale, category.name), href: categoryHref(category) }));
  return <>
    <a className="skip-link fixed top-2 start-2 z-[100] -translate-y-[160%] rounded-xl bg-ink px-5 py-3 text-white focus:translate-y-0" href="#main-content">{t(locale, 'skipToContent')}</a>
    <header className="storefront-header">
      <div className="header-content sf-container">
        <Link href="/" aria-label={t(locale, 'homeAria')} className="brand-logo"><Image src="/logo.png" alt="Al Mina Pharmacy" width={2789} height={910} sizes="(max-width:767px) 116px, 160px" className="h-auto w-full" /></Link>
        <div className="header-mobile-menu"><StorefrontMenu categories={categories} locale={locale} mobile /></div>
        <div className="header-search"><SearchBox locale={locale} /></div>
        <DeliveryLocation locale={locale} />
        <Link href="/account" aria-label={t(locale, 'linkAccount')} className="header-account"><UserCircleIcon className="size-6" aria-hidden="true" /><span>{t(locale, 'navAccount')}</span></Link>
        <CartLink locale={locale} />
      </div>
      <div className="storefront-departments"><div className="sf-container"><StorefrontMenu categories={categories} locale={locale} /><LanguageSwitcher locale={locale} label={t(locale, 'language')} /></div></div>
      <NavigationLinks locale={locale} />
    </header>
  </>;
}
const shopLinks: [MessageKey, string][] = [
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

export function Footer({ telemetryEnabled = false, locale = 'en' }: { telemetryEnabled?: boolean; locale?: Locale }) {
 const groups: { title: MessageKey; aria: MessageKey; links: [MessageKey, string][] }[] = [{ title: 'footerShop', aria: 'footerShopAria', links: shopLinks }, { title: 'footerHelp', aria: 'footerHelpAria', links: helpLinks }, { title: 'footerAccount', aria: 'footerAccountAria', links: accountLinks }];
 return <footer className="storefront-footer"><div className="sf-container">
   <div className="sf-footer-columns"><div className="sf-footer-brand"><Link href="/" aria-label={t(locale, 'homeAria')}><Image src="/logo.png" alt="" width={2789} height={910} sizes="148px" className="h-auto w-36" /></Link><p>{t(locale, 'footerTagline')}</p><a href="tel:+971504825007" dir="ltr"><PhoneIcon className="size-4" aria-hidden="true" />+971 50 482 5007</a><a href="mailto:info@alminapharmacy.com">info@alminapharmacy.com</a></div>{groups.map(group => <nav key={group.title} aria-label={t(locale, group.aria)}><h3>{t(locale, group.title)}</h3>{group.links.map(([key, href]) => <Link key={key} href={href}>{t(locale, key)}</Link>)}</nav>)}<div><h3>{t(locale, 'footerVisit')}</h3><p>{t(locale, 'footerLocation')}</p><Link href="/map">{t(locale, 'footerMap')}</Link><Link href="/ras-al-khaimah">{t(locale, 'linkLocal')}</Link></div></div>
   <nav className="sf-footer-policies" aria-label={t(locale, 'footerPoliciesAria')}>{policyLinks.map(item => <Link key={item.path} href={item.path}>{t(locale, item.key)}</Link>)}</nav>
   {telemetryEnabled ? <UsagePreferences locale={locale} /> : null}
   <div className="sf-footer-bottom"><span>{t(locale, 'footerBottom')}</span><LanguageSwitcher locale={locale} label={t(locale, 'language')} size="default" /><a href="#top"><ArrowUpIcon className="size-4" aria-hidden="true" />{t(locale, 'backToTop')}</a></div>
 </div></footer>;
}
