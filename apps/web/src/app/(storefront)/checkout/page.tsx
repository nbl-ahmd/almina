import { CartView } from '../../../components/cart-view';
import { CheckoutForm } from '../../../components/checkout-form';
import { getWebEnvironment } from '../../../lib/server/env';
import { getLocale } from '../../../lib/server/i18n';
import { t } from '../../../lib/i18n';
export const metadata = { title: 'Checkout', robots: { index: false, follow: true } };
export default async function CheckoutPage() {
  const locale = await getLocale();
  if (getWebEnvironment().CHECKOUT_ENABLED) return <><div className="page-heading mb-6 border-b border-border pb-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h1 className="m-0 text-2xl md:text-3xl">{t(locale, 'checkoutTitle')}</h1><span className="rounded-full bg-subtle px-3 py-1.5 text-xs font-semibold text-ocean">{t(locale, 'checkoutProgress')}</span></div><p className="text-sm">{t(locale, 'checkoutIntroEnabled')}</p></div><CheckoutForm /></>;
  return <><div className="page-heading mb-6 border-b border-border pb-5"><p className="eyebrow">{t(locale, 'checkoutEyebrow')}</p><h1>{t(locale, 'checkoutTitle')}</h1><p>{t(locale, 'checkoutIntro')}</p></div><section className="notice" aria-labelledby="checkout-availability"><h2 id="checkout-availability">{t(locale, 'checkoutUnavailableTitle')}</h2><p role="status">{t(locale, 'checkoutUnavailableBody')}</p><a className="button button-secondary" href="tel:+971504825007">{t(locale, 'checkoutCallPharmacy')}</a></section><CartView checkout locale={locale} /></>;
}
