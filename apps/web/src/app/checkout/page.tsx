import { CartView } from '../../components/cart-view';
export const metadata = { title: 'Checkout', robots: { index: false, follow: true } };
export default function CheckoutPage() {
  return <><h1>Checkout</h1><p role="status">Ordering is not available in this preview. Your cart is saved. Please contact the pharmacy for assistance.</p><CartView checkout /></>;
}
