'use client';
import Script from 'next/script';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { surveyPayload, type GoogleCommerceConfiguration, type ReviewReceipt } from '../lib/google/commerce';
import type { Locale } from '../lib/i18n';

type GoogleWindow = Window & {
  ___gcfg?: { lang: string };
  gapi?: { load: (module: string, ready: () => void) => void; surveyoptin?: { render: (payload: NonNullable<ReturnType<typeof surveyPayload>>) => void } };
  merchantwidget?: { start: (options: Record<string, string | number>) => void };
};

/** Google owns the optional survey choice. No products, GTINs, prices or medical details are sent. */
export function GoogleCustomerReviews({ config, receipt, nonce, locale }: { config: GoogleCommerceConfiguration; receipt: ReviewReceipt | null; nonce?: string | undefined; locale: Locale }) {
  const rendered = useRef(false);
  const payload = surveyPayload(config, receipt);
  if (!payload) return null;
  function offer() {
    const google = window as GoogleWindow;
    google.___gcfg = { lang: locale };
    google.gapi?.load('surveyoptin', () => {
      if (rendered.current || !google.gapi?.surveyoptin) return;
      try {
        const key = `almina.google-review.offered.${payload!.order_id}`;
        try { if (sessionStorage.getItem(key)) return; } catch { /* Per-mount dedup still works. */ }
        google.gapi.surveyoptin.render(payload!);
        rendered.current = true;
        try { sessionStorage.setItem(key, '1'); } catch { /* Never block a confirmed order. */ }
      } catch { /* The optional provider cannot change checkout success. */ }
    });
  }
  return <Script id="google-customer-reviews" src="https://apis.google.com/js/platform.js" nonce={nonce} strategy="afterInteractive" referrerPolicy="origin" onReady={offer} />;
}

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
      const widget = (window as GoogleWindow).merchantwidget;
      if (!widget) return;
      widget.start({ merchant_id: config.merchantId, position: 'LEFT_BOTTOM', region: 'AE',
        sideMargin: 24, bottomMargin: 24, mobileSideMargin: 16, mobileBottomMargin: 100 });
      started.current = true;
    } catch { /* Optional store quality UI must never block shopping. */ }
  }
  return <Script id="google-merchant-widget" src="https://www.gstatic.com/shopping/merchant/merchantwidget.js" nonce={nonce} strategy="lazyOnload" referrerPolicy="origin" onReady={start} />;
}
