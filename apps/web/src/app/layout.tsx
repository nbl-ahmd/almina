import { connection } from 'next/server';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import { Navigation, Footer } from '../components/navigation';
import './globals.css';
import { getWebEnvironment } from '../lib/server/env';
import { siteDescription, siteName, organizationData } from '../lib/seo';
import { StructuredData } from '../components/structured-data';
const ptSans = localFont({ src: './fonts/PTSans-Regular.ttf', weight: '400', display: 'swap' });
export function generateMetadata(): Metadata {
  const env = getWebEnvironment();
  return { metadataBase: new URL(env.WEB_ORIGIN),
    title: { default: siteName, template: `%s | ${siteName}` }, description: siteDescription,
    robots: { index: false, follow: env.APP_ENV === 'production' } };
}
export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection(); // Fresh nonce per render; HTML must never be shared from a cache.
  return <html lang="en"><body className={ptSans.className}><StructuredData data={organizationData(getWebEnvironment().WEB_ORIGIN)} /><Navigation /><main id="main-content">{children}</main><Footer /></body></html>;
}
