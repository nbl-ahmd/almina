import {headers} from 'next/headers';
import {GoogleMerchantWidget} from '../../components/google-customer-reviews';
import {googleCommerceConfiguration} from '../../lib/google/commerce';
import type { ReactNode } from 'react';
import { Navigation, Footer } from '../../components/navigation';
import { StructuredData } from '../../components/structured-data';
import { organizationData, websiteData } from '../../lib/seo';
import { getWebEnvironment } from '../../lib/server/env';
import { getLocale } from '../../lib/server/i18n';
import { isRtl } from '../../lib/i18n';
import { StorefrontInteractions } from '../../components/storefront-interactions';
import { storefrontLatin, storefrontArabic } from '../../lib/storefront-fonts';
import './storefront.css';
export default async function StorefrontLayout({ children }: { children: ReactNode }) {
 const env = getWebEnvironment();
 const locale = await getLocale();
 const referencePreview = process.env.NODE_ENV === 'development' && process.env.ALMINA_REFERENCE_PREVIEW === '1';
 return <div lang={locale} dir={isRtl(locale) ? 'rtl' : 'ltr'} className={`storefront-shell group/storefront min-h-dvh bg-page text-ink antialiased [&_a:hover]:no-underline [&_a]:transition-colors [&>main]:pt-5 md:[&>main]:pt-7 max-md:has-[.cart-page]:[&>main]:pt-2 ${locale === 'ar' ? storefrontArabic.className : storefrontLatin.className} ${storefrontArabic.variable} ${storefrontLatin.variable}`}><StorefrontInteractions /><StructuredData data={organizationData(env.WEB_ORIGIN)} /><StructuredData data={websiteData(env.WEB_ORIGIN)} /><GoogleMerchantWidget config={googleCommerceConfiguration(process.env)} nonce={(await headers()).get('x-nonce')??undefined} /><Navigation locale={locale} mobileShell />{referencePreview ? <aside className="sf-preview-notice" aria-label={locale === 'ar' ? 'معاينة التصميم' : 'Design preview'}>{locale === 'ar' ? 'معاينة التصميم · الأسعار والتوفر بيانات تجريبية' : 'Design preview · Prices and availability are sample data'}</aside> : null}<main id="main-content" tabIndex={-1}>{children}</main><Footer telemetryEnabled={env.COMMERCE_TELEMETRY_ENABLED} locale={locale} /></div>;
}
