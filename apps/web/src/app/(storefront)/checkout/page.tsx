import { CartView } from '../../../components/cart-view';
import { CheckoutForm } from '../../../components/checkout-form';
import { getWebEnvironment } from '../../../lib/server/env';
export const metadata = { title: 'Checkout', robots: { index: false, follow: true } };
export default function CheckoutPage() {
  if (getWebEnvironment().CHECKOUT_ENABLED) return <><div className="page-heading mb-6 border-b border-border pb-5"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h1 className="m-0 text-2xl md:text-3xl">Checkout</h1><span className="rounded-full bg-subtle px-3 py-1.5 text-xs font-semibold text-ocean">Cart → Details → Review</span></div><p className="text-sm">Just a few details, then your order is ready to review.</p></div><CheckoutForm /></>;
  return <><div className="page-heading mb-6 border-b border-border pb-5"><p className="eyebrow">YOUR SHOPPING</p><h1>Checkout</h1><p>Review your items before ordering.</p></div><section className="notice" aria-labelledby="checkout-availability"><h2 id="checkout-availability">Ordering is currently unavailable</h2><p role="status">Ordering is not available in this preview. Your cart is saved. Please contact the pharmacy for assistance.</p><a className="button button-secondary" href="tel:+971504825007">Call the pharmacy</a></section><CartView checkout /></>;
}
