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
import './storefront.css';
export default async function StorefrontLayout({ children }: { children: ReactNode }) {
 const env = getWebEnvironment();
 const locale = await getLocale();
 return <div lang={locale} dir={isRtl(locale) ? 'rtl' : 'ltr'} className="storefront-shell"><StructuredData data={organizationData(env.WEB_ORIGIN)} /><StructuredData data={websiteData(env.WEB_ORIGIN)} /><GoogleMerchantWidget config={googleCommerceConfiguration(process.env)} nonce={(await headers()).get('x-nonce')??undefined} /><Navigation locale={locale} /><main id="main-content" tabIndex={-1}>{children}</main><Footer telemetryEnabled={env.COMMERCE_TELEMETRY_ENABLED} locale={locale} /></div>;
}
