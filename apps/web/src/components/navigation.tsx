import { FooterGroup } from './footer-group';
import { shopText as u } from '../lib/i18n-storefront';
import { getCategories } from '../lib/server/catalog';
import { categoryHref } from '../lib/catalog/model';
import { StorefrontMenu } from './storefront-menu';
import { SearchBox } from './search-box';
import Image from 'next/image';
import Link from './app-link';
import { PhoneIcon, UserCircleIcon, ArrowUpIcon, ChatBubbleOvalLeftEllipsisIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { NavigationLinks } from './navigation-links';
import { CartLink } from './cart-link';
import { DeliveryLocation } from './delivery-location';
import { UsagePreferences } from './usage-preferences';
import { LanguageSwitcher } from './language-switcher';
import { t, type Locale, type MessageKey } from '../lib/i18n';
import { businessContact, policyLinks } from '../lib/policies';
import system from './storefront-system/tokens.module.css';

export async function Navigation({ locale = 'en', mobileShell = false }: { locale?: Locale; mobileShell?: boolean }) {
  const categories = (await getCategories().catch(() => [])).filter(category => !category.disabled).map(category => ({ name: u(locale, category.name), href: categoryHref(category) }));
  return <>
    <a className="skip-link fixed top-2 start-2 z-[100] -translate-y-[160%] rounded-xl bg-ink px-5 py-3 text-white focus:translate-y-0" href="#main-content">{t(locale, 'skipToContent')}</a>
    <header className={mobileShell ? `storefront-header ${system.system}` : "storefront-header"} data-mobile-shell={mobileShell || undefined} data-storefront-chrome={mobileShell ? "header" : undefined} lang={locale}>
      <div className="header-content sf-container">
        <div className="header-mobile-menu"><StorefrontMenu categories={categories} locale={locale} mobile /></div>
        <Link href="/" aria-label={t(locale, 'homeAria')} className="brand-logo"><Image src="/logo.png" alt="Al Mina Pharmacy" width={2789} height={910} sizes={mobileShell ? "(max-width: 767px) 86px, 124px" : "(max-width: 767px) 116px, 160px"} className="h-auto w-full" /></Link>
        <div className="header-search"><SearchBox locale={locale} mobileShell={mobileShell} /></div>
        <DeliveryLocation locale={locale} />
        <Link href="/account" aria-label={t(locale, 'linkAccount')} className="header-account"><UserCircleIcon className="size-6" aria-hidden="true" /><span>{t(locale, 'navAccount')}</span></Link>
        <CartLink locale={locale} />
        {mobileShell && <Link className="mobile-cart-return" href="/products">{t(locale, 'cartContinueShopping')}</Link>}
      </div>
      <div className="storefront-departments"><div className="sf-container"><StorefrontMenu categories={categories} locale={locale} acceptedChrome={mobileShell} /><LanguageSwitcher locale={locale} label={t(locale, 'language')} /></div></div>
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

export function FloatingPharmacySupport({ locale }: { locale: Locale }) {
  return <a className="floating-contact" href={businessContact.whatsapp} target="_blank" rel="noopener noreferrer"
    aria-label={locale === 'ar' ? 'تواصل مع الصيدلية عبر واتساب' : 'Chat with the pharmacy on WhatsApp'}>
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15s-.77.97-.94 1.17c-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.79.37s-1.04 1.02-1.04 2.48 1.06 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.27.49 1.7.63.71.23 1.36.19 1.88.11.57-.08 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35ZM12 21.8a9.78 9.78 0 0 1-4.98-1.36l-.36-.21-3.73.98 1-3.64-.23-.37A9.8 9.8 0 1 1 12 21.8Zm0-21.6A11.8 11.8 0 0 0 1.8 17.9L.13 24l6.24-1.64A11.8 11.8 0 1 0 12 .2Z" />
    </svg>
  </a>;
}

export function Footer({ telemetryEnabled = false, locale = 'en', acceptedChrome = false }: { telemetryEnabled?: boolean; locale?: Locale; acceptedChrome?: boolean }) {
 const groups: { title: MessageKey; aria: MessageKey; links: [MessageKey, string][] }[] = [{ title: 'footerShop', aria: 'footerShopAria', links: shopLinks }, { title: 'footerHelp', aria: 'footerHelpAria', links: helpLinks }, { title: 'footerAccount', aria: 'footerAccountAria', links: accountLinks }];
 return <footer className={acceptedChrome ? `storefront-footer ${system.system}` : "storefront-footer"} data-storefront-chrome={acceptedChrome ? "footer" : undefined} lang={locale}><div className="sf-container">
   {acceptedChrome ? <section className="sf-footer-support" aria-label={locale === 'ar' ? 'مساعدة الصيدلية' : 'Pharmacy support'}>
     <div><h2>{locale === 'ar' ? 'كيف يمكننا مساعدتك؟' : 'How can we help?'}</h2>
     <p>{locale === 'ar' ? 'تواصل مع الصيدلية أو اعثر على أقرب فرع.' : 'Talk to the pharmacy or find a branch near you.'}</p></div>
     <a href={businessContact.whatsapp} target="_blank" rel="noopener noreferrer"><ChatBubbleOvalLeftEllipsisIcon aria-hidden="true" />WhatsApp</a>
     <Link href="/map"><MapPinIcon aria-hidden="true" />{t(locale, 'footerMap')}</Link>
   </section> : null}
   <div className="sf-footer-columns"><div className="sf-footer-brand"><Link href="/" aria-label={t(locale, 'homeAria')}><Image src="/logo.png" alt="" width={2789} height={910} sizes="148px" className="h-auto w-36" /></Link><p>{t(locale, 'footerTagline')}</p><a href="tel:+971504825007" dir="ltr"><PhoneIcon className="size-4" aria-hidden="true" />+971 50 482 5007</a><a href="mailto:info@alminapharmacy.com">info@alminapharmacy.com</a></div>{groups.map(group => <FooterGroup key={group.title} title={t(locale,group.title)}><nav aria-label={t(locale, group.aria)}>{group.links.map(([key, href]) => <Link key={key} href={href}>{t(locale, key)}</Link>)}</nav></FooterGroup>)}<FooterGroup title={t(locale,'footerVisit')}><p>{t(locale, 'footerLocation')}</p>{!acceptedChrome ? <Link href="/map">{t(locale, 'footerMap')}</Link> : null}<Link href="/ras-al-khaimah">{t(locale, 'linkLocal')}</Link></FooterGroup></div>
   <nav className="sf-footer-policies" aria-label={t(locale, 'footerPoliciesAria')}>{policyLinks.map(item => <Link key={item.path} href={item.path}>{t(locale, item.key)}</Link>)}</nav>
   {telemetryEnabled ? <UsagePreferences locale={locale} /> : null}
   <div className="sf-footer-bottom"><span>{t(locale, 'footerBottom')}</span><LanguageSwitcher locale={locale} label={t(locale, 'language')} size="default" /><a href="#top"><ArrowUpIcon className="size-4" aria-hidden="true" />{t(locale, 'backToTop')}</a></div>
 </div></footer>;
}
