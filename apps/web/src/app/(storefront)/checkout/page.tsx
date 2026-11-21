import { headers } from 'next/headers';
import { googleCommerceConfiguration } from '../../../lib/google/commerce';
import { stripeCheckoutMode } from '../../../lib/server/checkout';
import { CartView } from '../../../components/cart-view';
import { CheckoutForm } from '../../../components/checkout-form';
import { CheckoutFrame } from '../../../components/checkout-frame';
import { Button } from '../../../components/ui/button';
import Link from '../../../components/app-link';
import { Icon } from '../../../components/icon';
import { getWebEnvironment } from '../../../lib/server/env';
import { getLocale } from '../../../lib/server/i18n';
import { t } from '../../../lib/i18n';

export async function generateMetadata() {
  return { title: t(await getLocale(), 'checkoutTitle'), robots: { index: false, follow: true } };
}

export default async function CheckoutPage() {
  const locale = await getLocale();
  const env = getWebEnvironment();
  if (env.CHECKOUT_ENABLED) {
    return <CheckoutFrame locale={locale}>
      <CheckoutForm googleReviews={googleCommerceConfiguration(process.env)} nonce={(await headers()).get('x-nonce') ?? undefined}
        locale={locale} stripeMode={await stripeCheckoutMode()} stripeTestMode={env.APP_ENV !== 'production'} />
    </CheckoutFrame>;
  }

  return <CheckoutFrame locale={locale}>
    <div className="checkout-flow checkout-unavailable">
      <header className="checkout-topbar">
        <Link className="checkout-back" href="/cart"><Icon name="back" />{locale === 'ar' ? 'العودة إلى السلة' : 'Back to cart'}</Link>
        <h1>{t(locale, 'checkoutTitle')}</h1>
      </header>
      <section className="checkout-status" aria-labelledby="checkout-availability">
        <h2 id="checkout-availability">{t(locale, 'checkoutUnavailableTitle')}</h2>
        <p role="status">{t(locale, 'checkoutUnavailableBody')}</p>
        <Button asChild size="sm" variant="outline"><a href="tel:+971504825007"><Icon name="phone" />{t(locale, 'checkoutCallPharmacy')}</a></Button>
      </section>
      <CartView checkout orderingEnabled={false} locale={locale} />
    </div>
  </CheckoutFrame>;
}
