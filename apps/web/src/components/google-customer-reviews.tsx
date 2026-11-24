'use client';
import Script from 'next/script';
import { useRef } from 'react';
import { surveyPayload, type GoogleCommerceConfiguration, type ReviewReceipt } from '../lib/google/commerce';
import type { Locale } from '../lib/i18n';

type GoogleWindow = Window & {
  ___gcfg?: { lang: string };
  gapi?: { load: (module: string, ready: () => void) => void; surveyoptin?: { render: (payload: NonNullable<ReturnType<typeof surveyPayload>>) => void } };
};

/** Google owns the optional survey choice. No products, GTINs, prices or medical details are sent. */
export function GoogleCustomerReviews({ config, receipt, nonce, locale }: { config: GoogleCommerceConfiguration; receipt: ReviewReceipt | null; nonce?: string | undefined; locale: Locale }) {
  const rendered = useRef(false);
  const payload = surveyPayload(config, receipt);
  if (!payload) return null;
  function offer() {
    const google = window as GoogleWindow;
    google.___gcfg = { lang: locale };
    try { google.gapi?.load('surveyoptin', () => {
      if (rendered.current || !google.gapi?.surveyoptin) return;
      try {
        const key = `almina.google-review.offered.${payload!.order_id}`;
        try { if (sessionStorage.getItem(key)) return; } catch { /* Per-mount dedup still works. */ }
        google.gapi.surveyoptin.render(payload!);
        rendered.current = true;
        try { sessionStorage.setItem(key, '1'); } catch { /* Never block a confirmed order. */ }
      } catch { /* The optional provider cannot change checkout success. */ }
    }); } catch { /* An unavailable SDK cannot interrupt the receipt. */ }
  }
  return <Script id="google-customer-reviews" src="https://apis.google.com/js/platform.js" nonce={nonce} strategy="afterInteractive" referrerPolicy="origin" onReady={offer} />;
}
