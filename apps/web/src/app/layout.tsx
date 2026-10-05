import { connection } from 'next/server';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import './globals.css';
import { getWebEnvironment } from '../lib/server/env';
import { siteDescription, siteName } from '../lib/seo';
const ptSans = localFont({ src: './fonts/PTSans-Regular.woff2', weight: '400', display: 'swap' });
export function generateMetadata(): Metadata {
  const env = getWebEnvironment();
  return { metadataBase: new URL(env.WEB_ORIGIN),
    title: { default: siteName, template: `%s | ${siteName}` }, description: siteDescription, manifest: '/manifest.json',
    icons: { icon: [{ url: '/favicon.ico' }, { url: '/favicon-32x32.png', sizes: '32x32' }, { url: '/favicon-16x16.png', sizes: '16x16' }], apple: '/apple-touch-icon.png' },
    robots: { index: false, follow: env.APP_ENV === 'production' } };
}
export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection(); // Fresh nonce per render; HTML must never be shared from a cache.
  return <html lang="en"><body className={ptSans.className}>{children}</body></html>;
}
