'use client';
import Script from 'next/script';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import type { GoogleCommerceConfiguration } from '../lib/google/commerce';

// Mounted by the storefront layout on every page, so it imports only types: the survey helpers (and zod)
// stay with GoogleCustomerReviews on the order-complete screens.
type MerchantWindow = Window & { merchantwidget?: { start: (options: Record<string, string | number>) => void } };

/** Public discovery pages only; never load a rating widget in account or purchase flows. */
export function GoogleMerchantWidget({ config, nonce }: { config: GoogleCommerceConfiguration; nonce?: string | undefined }) {
  const pathname = usePathname();
  const started = useRef(false);
  const allowed = config.widget && ['/', '/categories', '/brands'].includes(pathname);
  useEffect(() => () => {
    if (started.current) {
      // This wrapper ID is owned by Google's published merchantwidget.js.
      // Remove the entire cross-origin frame when leaving discovery pages.
      document.getElementById('google-merchantwidget-iframe-wrapper')?.remove();
      started.current = false;
    }
  }, [allowed]);
  if (!allowed) return null;
  function start() {
    if (started.current || !['/', '/categories', '/brands'].includes(window.location.pathname)) return;
    try {
      const widget = (window as MerchantWindow).merchantwidget;
      if (!widget) return;
      widget.start({ merchant_id: config.merchantId, position: 'LEFT_BOTTOM', region: 'AE',
        sideMargin: 24, bottomMargin: 24, mobileSideMargin: 16, mobileBottomMargin: 100 });
      started.current = true;
    } catch { /* Optional store quality UI must never block shopping. */ }
  }
  return <Script id="google-merchant-widget" src="https://www.gstatic.com/shopping/merchant/merchantwidget.js" nonce={nonce} strategy="lazyOnload" referrerPolicy="origin" onReady={start} />;
}
