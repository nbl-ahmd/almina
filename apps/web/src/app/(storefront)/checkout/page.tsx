import {headers} from 'next/headers';
import {googleCommerceConfiguration} from '../../../lib/google/commerce';
import {stripeCheckoutMode} from '../../../lib/server/checkout';
import { CartView } from '../../../components/cart-view';
import { CheckoutForm } from '../../../components/checkout-form';
import { getWebEnvironment } from '../../../lib/server/env';
import { getLocale } from '../../../lib/server/i18n';
import { t } from '../../../lib/i18n';
export async function generateMetadata() { return { title: t(await getLocale(), 'checkoutTitle'), robots: { index: false, follow: true } }; }
export default async function CheckoutPage() {
  const locale = await getLocale();
  if (getWebEnvironment().CHECKOUT_ENABLED) return <CheckoutForm googleReviews={googleCommerceConfiguration(process.env)} nonce={(await headers()).get('x-nonce') ?? undefined} locale={locale} stripeMode={await stripeCheckoutMode()} stripeTestMode={getWebEnvironment().APP_ENV!=='production'} />;
  return <><div className="page-heading mb-6 border-b border-border pb-5"><p className="eyebrow">{t(locale, 'checkoutEyebrow')}</p><h1>{t(locale, 'checkoutTitle')}</h1><p>{t(locale, 'checkoutIntro')}</p></div><section className="notice" aria-labelledby="checkout-availability"><h2 id="checkout-availability">{t(locale, 'checkoutUnavailableTitle')}</h2><p role="status">{t(locale, 'checkoutUnavailableBody')}</p><a className="button button-secondary" href="tel:+971504825007">{t(locale, 'checkoutCallPharmacy')}</a></section><CartView checkout orderingEnabled={false} locale={locale} /></>;
}
