import { connection } from 'next/server';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import { IBM_Plex_Sans_Arabic, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { getWebEnvironment } from '../lib/server/env';
import { siteDescription, siteName } from '../lib/seo';
const jakarta = Plus_Jakarta_Sans({
  weight: ['400', '500', '600', '700'], subsets: ['latin'],
  variable: '--font-sans', display: 'swap', preload: false,
});
const plexArabic = IBM_Plex_Sans_Arabic({
  weight: ['400', '500', '600', '700'], subsets: ['arabic'],
  variable: '--font-arabic', display: 'swap', preload: false,
});
// Retained admin/base face loads only if used.
const ptSans = localFont({ src: './fonts/PTSans-Regular.woff2', weight: '400', display: 'swap', preload: false });
export function generateMetadata(): Metadata {
  const env = getWebEnvironment();
  return { metadataBase: new URL(env.WEB_ORIGIN),
    title: { default: siteName, template: `%s | ${siteName}` }, description: siteDescription, manifest: '/manifest.json',
    ...(env.GOOGLE_SITE_VERIFICATION ? { verification: { google: env.GOOGLE_SITE_VERIFICATION } } : {}),
    icons: { icon: [{ url: '/favicon.ico' }, { url: '/favicon-32x32.png', sizes: '32x32' }, { url: '/favicon-16x16.png', sizes: '16x16' }], apple: '/apple-touch-icon.png' },
    robots: { index: false, follow: env.APP_ENV === 'production' } };
}
export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection(); // Fresh nonce per render; HTML must never be shared from a cache.
  return <html lang="en"><body id="top" className={`${ptSans.className} ${jakarta.variable} ${plexArabic.variable}`}>{children}</body></html>;
}
