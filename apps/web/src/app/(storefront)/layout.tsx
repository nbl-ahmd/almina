import type { ReactNode } from 'react';
import { Navigation, Footer } from '../../components/navigation';
import { StructuredData } from '../../components/structured-data';
import { organizationData, websiteData } from '../../lib/seo';
import { getWebEnvironment } from '../../lib/server/env';
import { getLocale } from '../../lib/server/i18n';
import { isRtl } from '../../lib/i18n';
import localFont from 'next/font/local';
import './storefront.css';
const outfit = localFont({ src: '../fonts/Outfit-Latin.woff2', weight: '400 700', display: 'swap' });
export default async function StorefrontLayout({ children }: { children: ReactNode }) {
 const env = getWebEnvironment();
 const locale = await getLocale();
 return <div lang={locale} dir={isRtl(locale) ? 'rtl' : 'ltr'} className={`storefront-shell group/storefront min-h-dvh bg-page text-ink antialiased [&_a:hover]:no-underline [&_a]:transition-colors [&>main]:pt-4 md:[&>main]:pt-4 has-[.home-page]:md:bg-surface has-[.cart-page]:md:bg-surface max-md:has-[.cart-page]:[&>main]:pt-2 ${outfit.className}`}><StructuredData data={organizationData(env.WEB_ORIGIN)} /><StructuredData data={websiteData(env.WEB_ORIGIN)} /><Navigation locale={locale} /><main id="main-content" tabIndex={-1}>{children}</main><Footer telemetryEnabled={env.COMMERCE_TELEMETRY_ENABLED} locale={locale} /></div>;
}
