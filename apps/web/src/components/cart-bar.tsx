'use client';
import { usePathname } from 'next/navigation';
import Link from './app-link';
import { ChevronRightIcon, ShoppingCartIcon } from './storefront-icons';
import { itemCountText, type Locale } from '../lib/i18n';
import { useCartCount } from '../lib/catalog/use-cart-count';

// Talabat "View basket": while browsing on a phone, a basket bar floats above the tabs once something is in the cart.
// It shows the count only; prices, stock and totals stay with the cart and checkout, which revalidate on the server.
const browsing = /^\/(?:$|products\/?$|categories(?:\/|$)|search(?:\/|$)|offers(?:\/|$)|brands(?:\/|$)|collections\/|saved(?:\/|$))/;

export function CartBar({ locale = 'en' }: { locale?: Locale }) {
  const count = useCartCount();
  const path = usePathname() ?? '/';
  if (!count || !browsing.test(path)) return null;
  return <div className="qc-cart-bar" data-slot="cart-bar">
    <Link href="/cart" className="qc-cart-bar-link">
      <span className="qc-cart-bar-icon" aria-hidden="true"><ShoppingCartIcon /><span key={count} className="qc-cart-bar-count">{count > 99 ? '99+' : count}</span></span>
      <span className="qc-cart-bar-text">{itemCountText(locale, count)}</span>
      <span className="qc-cart-bar-action">{locale === 'ar' ? 'عرض السلة' : 'View cart'}<ChevronRightIcon className="rtl:rotate-180" aria-hidden="true" /></span>
    </Link>
  </div>;
}
