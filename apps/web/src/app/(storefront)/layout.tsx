import type { ReactNode } from 'react';
import { Navigation, Footer } from '../../components/navigation';
import { StructuredData } from '../../components/structured-data';
import { organizationData } from '../../lib/seo';
import { getWebEnvironment } from '../../lib/server/env';
import localFont from 'next/font/local';
import './storefront.css';
const jakarta = localFont({ src: '../fonts/PlusJakartaSans-Latin.woff2', weight: '400 800', display: 'swap' });
export default function StorefrontLayout({ children }: { children: ReactNode }) {
 const env = getWebEnvironment();
 return <div className={`storefront-shell group/storefront min-h-dvh bg-page text-ink antialiased [&_a:hover]:no-underline [&_a]:transition-colors [&>main]:pt-4 md:[&>main]:pt-4 has-[.home-page]:md:bg-surface has-[.cart-page]:md:bg-surface max-md:has-[.cart-page]:[&>main]:pt-2 ${jakarta.className}`}><StructuredData data={organizationData(env.WEB_ORIGIN)} /><Navigation /><main id="main-content" tabIndex={-1}>{children}</main><Footer telemetryEnabled={env.COMMERCE_TELEMETRY_ENABLED} /></div>;
}
