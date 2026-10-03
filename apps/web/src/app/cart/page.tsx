import { CartView } from '../../components/cart-view';
export const metadata = { title: 'Your cart', robots: { index: false, follow: true } };
export default function CartPage() { return <><div className="page-heading"><p className="eyebrow">YOUR EVERYDAY ESSENTIALS</p><h1>Your cart</h1><p>Review your items and adjust quantities here.</p></div><CartView /></>; }
