import { money } from '../lib/catalog/money';
import type { Locale } from '../lib/i18n';

/** Visual currency mark with a complete spoken currency alternative. Never calculates totals. */
export function CurrencyAmount({ value, locale = 'en' }: { value: number; locale?: Locale }) {
  const amount = new Intl.NumberFormat(locale === 'ar' ? 'ar-AE' : 'en-AE', {minimumFractionDigits: 2, maximumFractionDigits: 2}).format(value);
  return <span className="currency-amount"><span className="sr-only">{money(value, locale)}</span><span className="currency-visual" dir="ltr" aria-hidden="true"><span className="dirham-symbol" />{amount}</span></span>;
}
