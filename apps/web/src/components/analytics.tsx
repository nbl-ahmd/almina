'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';
import Link from './app-link';
import { configureAnalytics, track } from '../lib/analytics/client';
import { consentCopy } from '../lib/analytics/copy';
import { analyticsMode, contactChannel, type AnalyticsConfig } from '../lib/analytics/policy';
import { chooseUsage, consentKey, privacyBlocked, usageChoice } from '../lib/telemetry/browser';
import type { Locale } from '../lib/i18n';

// One stable reference, so each measurement is reported once.
function reportVital(metric: { name: string; value: number }) {
  if (['LCP', 'INP', 'CLS', 'FCP', 'TTFB'].includes(metric.name)) track('$web_vitals', { [`$web_vitals_${metric.name}_value`]: metric.value });
}

/** Storefront measurement and the first-visit choice. Mounted only by the storefront layout, never on staff or wholesale screens. */
export function Analytics({ config, locale = 'en' }: { config: AnalyticsConfig; locale?: Locale }) {
  const pathname = usePathname();
  const [ask, setAsk] = useState(false);
  const [failed, setFailed] = useState(false);
  const counted = useRef<string | null>(null);
  const { key, host, cookieless } = config;
  useReportWebVitals(reportVital);
  useEffect(() => {
    const synchronize = () => {
      const choice = usageChoice(), blocked = privacyBlocked();
      configureAnalytics({ key, host, cookieless }, analyticsMode(choice, blocked, cookieless));
      setAsk(choice === 'unset' && !blocked);
    };
    const storage = (event: StorageEvent) => { if (event.key === consentKey || event.key === null) synchronize(); };
    synchronize();
    window.addEventListener('storage', storage);
    window.addEventListener('almina-usage-change', synchronize);
    return () => { window.removeEventListener('storage', storage); window.removeEventListener('almina-usage-change', synchronize); };
  }, [key, host, cookieless]);
  useEffect(() => {
    if (counted.current === pathname) return;
    counted.current = pathname;
    track('$pageview', { locale });
  }, [pathname, locale]);
  useEffect(() => {
    // Orders also arrive by phone and WhatsApp; only the channel is recorded, never the number or message.
    const contact = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      const channel = link ? contactChannel(link.getAttribute('href') ?? '') : undefined;
      if (channel) track('contact_clicked', { channel });
    };
    document.addEventListener('click', contact, true);
    return () => document.removeEventListener('click', contact, true);
  }, []);
  // The question never interrupts a purchase; the same controls stay in the footer.
  if (!ask || pathname.startsWith('/checkout')) return null;
  const copy = consentCopy(locale, cookieless);
  const choose = (value: 'allowed' | 'declined') => { if (!chooseUsage(value)) { setFailed(true); setAsk(false); } };
  return <section className="consent-banner" aria-label={copy.region}>
    <div className="consent-banner-text">
      <h2>{copy.title}</h2>
      <p>{copy.body} {copy.without} <Link href="/privacy">{copy.privacy}</Link></p>
      {failed ? <p role="alert">{copy.failed}</p> : null}
    </div>
    <div className="consent-banner-actions">
      <button type="button" onClick={() => choose('allowed')}>{copy.allow}</button>
      <button type="button" onClick={() => choose('declined')}>{copy.decline}</button>
    </div>
  </section>;
}
