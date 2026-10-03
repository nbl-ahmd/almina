import { CartView } from '../../../components/cart-view';
import { CheckoutForm } from '../../../components/checkout-form';
import { getWebEnvironment } from '../../../lib/server/env';
export const metadata = { title: 'Checkout', robots: { index: false, follow: true } };
export default function CheckoutPage() {
  if (getWebEnvironment().CHECKOUT_ENABLED) return <><div className="page-heading"><h1>Checkout</h1><p>Review delivery and the final total before placing your order.</p></div><CheckoutForm /></>;
  return <><div className="page-heading"><p className="eyebrow">YOUR SHOPPING</p><h1>Checkout</h1><p>Review your items before ordering.</p></div><section className="notice" aria-labelledby="checkout-availability"><h2 id="checkout-availability">Ordering is currently unavailable</h2><p role="status">Ordering is not available in this preview. Your cart is saved. Please contact the pharmacy for assistance.</p><a className="button button-secondary" href="tel:+971504825007">Call the pharmacy</a></section><CartView checkout /></>;
}
