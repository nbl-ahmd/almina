import { CartView } from '../../components/cart-view';
export const metadata = { title: 'Your cart', robots: { index: false, follow: true } };
export default function CartPage() { return <><h1>Your cart</h1><CartView /></>; }
