import {cookies, headers} from 'next/headers';
import {GoogleMerchantWidget} from '../../components/google-customer-reviews';
import {googleCommerceConfiguration} from '../../lib/google/commerce';
import type { ReactNode } from 'react';
import type { Viewport } from 'next';
import { Navigation, Footer } from '../../components/navigation';
import { StructuredData } from '../../components/structured-data';
import { organizationData, websiteData } from '../../lib/seo';
import { getWebEnvironment } from '../../lib/server/env';
import { getLocale } from '../../lib/server/i18n';
import { isRtl } from '../../lib/i18n';
import './storefront.css';
import './storefront-pages.css';
import './purchase-flow.css';
import './storefront-chrome.css';
import { storefrontFontVariables } from '../../lib/storefront-fonts';
// viewport-fit=cover lets the installed app read real safe-area insets, which the fixed bottom bars already pad for.
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#ffffff' };
export default async function StorefrontLayout({ children }: { children: ReactNode }) {
 const env = getWebEnvironment();
 const locale = await getLocale();
 const session = (await cookies()).has(env.APP_ENV === 'development' ? 'almina_customer' : '__Host-almina_customer');
 return <div lang={locale} dir={isRtl(locale) ? 'rtl' : 'ltr'} data-customer-session={session ? '1' : '0'} className={`storefront-shell ${storefrontFontVariables}`}><StructuredData data={organizationData(env.WEB_ORIGIN)} /><StructuredData data={websiteData(env.WEB_ORIGIN)} /><GoogleMerchantWidget config={googleCommerceConfiguration(process.env)} nonce={(await headers()).get('x-nonce')??undefined} /><Navigation locale={locale} /><main id="main-content" tabIndex={-1}>{children}</main><Footer telemetryEnabled={env.COMMERCE_TELEMETRY_ENABLED} locale={locale} /></div>;
}
