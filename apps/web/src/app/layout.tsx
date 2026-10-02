import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Al Mina Pharmacy — Foundation', template: '%s | Al Mina Pharmacy' },
  description: 'Al Mina Pharmacy modernization verification environment.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
