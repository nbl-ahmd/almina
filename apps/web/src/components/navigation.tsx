import Image from 'next/image';
import Link from './app-link';
import { getCategories } from '../lib/server/catalog';
import { categoryHref } from '../lib/catalog/model';
import { t, type Locale, type MessageKey } from '../lib/i18n';
import { businessContact, policyLinks } from '../lib/policies';
import { StorefrontMenu } from './storefront-menu';
import { SearchBox } from './search-box';
import { NavigationLinks } from './navigation-links';
import { CartLink } from './cart-link';
import { DeliveryLocation } from './delivery-location';
import { UsagePreferences } from './usage-preferences';
import { LanguageSwitcher } from './language-switcher';
import { PhoneIcon, UserCircleIcon, EnvelopeIcon, ArrowUpIcon, ChatBubbleLeftRightIcon } from './storefront-icons';

export async function Navigation({ locale = 'en' }: { locale?: Locale }) {
  const categories = (await getCategories().catch(() => []))
    .filter(category => !category.disabled)
    .map(category => ({ name: category.name, href: categoryHref(category) }));

  return <>
    <a className="skip-link" href="#main-content">{t(locale, 'skipToContent')}</a>
    <header className="storefront-header">
      <div className="storefront-utility-bar">
        <div className="chrome-container utility-content">
          <span>{t(locale, 'announcement')}</span>
          <LanguageSwitcher locale={locale} label={t(locale, 'language')} />
        </div>
      </div>
      <div className="header-identity">
        <div className="header-content chrome-container">
          <Link href="/" aria-label={t(locale, 'homeAria')} className="brand-logo">
            <Image src="/logo.png" alt="Al Mina Pharmacy" width={2789} height={910} sizes="(max-width:899px) 120px, 152px" />
          </Link>
          <div className="header-search"><SearchBox locale={locale} /></div>
          <DeliveryLocation locale={locale} />
          <div className="header-menu"><StorefrontMenu categories={categories} locale={locale} mobile /></div>
          <Link href="/account" aria-label={t(locale, 'linkAccount')} className="header-account">
            <UserCircleIcon aria-hidden="true" /><span>{t(locale, 'linkAccount')}</span>
          </Link>
          <div className="header-cart"><CartLink locale={locale} /></div>
        </div>
      </div>
      <div className="header-departments chrome-container">
        <StorefrontMenu categories={categories} locale={locale} />
      </div>
      <NavigationLinks locale={locale} />
    </header>
  </>;
}

const groups: { title: MessageKey; aria: MessageKey; links: [MessageKey, string][] }[] = [
  { title: 'footerShop', aria: 'footerShopAria', links: [['linkCategories', '/categories'], ['linkOffers', '/offers'], ['linkShopBrands', '/brands']] },
  { title: 'footerHelp', aria: 'footerHelpAria', links: [['linkGuides', '/health-guides'], ['linkAbout', '/about'], ['linkContact', '/contact'], ['linkDelivery', '/contact#delivery']] },
  { title: 'footerAccount', aria: 'footerAccountAria', links: [['linkSaved', '/saved'], ['linkAccount', '/account'], ['linkCart', '/cart']] },
];

export function Footer({ telemetryEnabled = false, analytics, locale = 'en' }: { telemetryEnabled?: boolean; analytics?: { cookieless: boolean } | undefined; locale?: Locale }) {
  return <footer className="storefront-footer">
    <div className="chrome-container footer-content">
      <div className="footer-intro">
        <Link href="/" aria-label={t(locale, 'homeAria')}>
          <Image src="/logo.png" alt="" width={2789} height={910} sizes="144px" />
        </Link>
        <p>{t(locale, 'footerTagline')}</p>
        <span>{t(locale, 'footerLocation')}</span>
        <Link href="/map">{t(locale, 'footerMap')}</Link>
      </div>
      {groups.map(group => <nav key={group.title} aria-label={t(locale, group.aria)}>
        <h2>{t(locale, group.title)}</h2>
        {group.links.map(([key, href]) => <Link href={href} key={key}>{t(locale, key)}</Link>)}
      </nav>)}
      <div className="footer-contact">
        <h2>{t(locale, 'footerTalk')}</h2>
        <a href={`tel:${businessContact.telephone}`}><PhoneIcon aria-hidden="true" /><span dir="ltr">+971 50 482 5007</span></a>
        <a href={`mailto:${businessContact.email}`}><EnvelopeIcon aria-hidden="true" />{businessContact.email}</a>
        <a href={businessContact.whatsapp} rel="noopener noreferrer"><ChatBubbleLeftRightIcon aria-hidden="true" />{locale === 'ar' ? 'تواصل عبر واتساب' : 'Chat on WhatsApp'}</a>
      </div>
      <nav className="footer-policy" aria-label={t(locale, 'footerPoliciesAria')}>
        {policyLinks.map(policy => <Link href={policy.path} key={policy.path}>{t(locale, policy.key)}</Link>)}
      </nav>
      <div className="footer-bottom">
        <span>{t(locale, 'footerBottom')}</span>
        <LanguageSwitcher locale={locale} label={t(locale, 'language')} />
        <a href="#top"><ArrowUpIcon aria-hidden="true" />{t(locale, 'backToTop')}</a>
      </div>
      {telemetryEnabled || analytics ? <UsagePreferences locale={locale} reporting={telemetryEnabled} analytics={analytics} /> : null}
    </div>
  </footer>;
}
