import { connection } from 'next/server';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import { Navigation, Footer } from '../components/navigation';
import './globals.css';
const ptSans = localFont({ src: './fonts/PTSans-Regular.ttf', weight: '400', display: 'swap' });
export const metadata: Metadata = {
  title: { default: 'Al Mina Pharmacy', template: '%s | Al Mina Pharmacy' },
  description: 'Al Mina Pharmacy storefront verification environment.',
  robots: { index: false, follow: false },
};
export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection(); // Fresh nonce per render; HTML must never be shared from a cache.
  return <html lang="en"><body className={ptSans.className}><Navigation /><main id="main-content">{children}</main><Footer /></body></html>;
}
