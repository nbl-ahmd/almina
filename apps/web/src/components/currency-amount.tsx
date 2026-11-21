import { money } from '../lib/catalog/model';
import type { Locale } from '../lib/i18n';

/** Dirham shape follows UAE currency-symbol guidance; never mirror the mark in RTL. */
export function CurrencyAmount({ value, locale = 'en' }: { value: number; locale?: Locale }) {
  const amount = new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-AE', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(value);
  return <span className="currency-amount" role="img" aria-label={money(value, locale)}>
    <span aria-hidden="true" className="currency-visual" dir="ltr"><svg className="dirham-icon" viewBox="0 0 24 24" fill="currentColor" focusable="false"><path d="M5 3h6.2C17.6 3 21 6.3 21 12s-3.4 9-9.8 9H5c.7-.9 1-1.8 1-3V6c0-1.2-.3-2.1-1-3Zm4 2.5v13h2.2c4.5 0 6.8-2.3 6.8-6.5s-2.3-6.5-6.8-6.5H9Z"/><path d="M2 9h18.3c1.2 0 1.7.5 1.7 1.5V12c-.5-.5-1.1-.7-2-.7H3.7C2.5 11.3 2 10.5 2 9Zm0 4h18.3c1.2 0 1.7.5 1.7 1.5V16c-.5-.5-1.1-.7-2-.7H3.7C2.5 15.3 2 14.5 2 13Z"/></svg><span>{amount}</span></span>
  </span>;
}
