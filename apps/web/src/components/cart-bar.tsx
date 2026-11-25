'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { bump, haptic } from '../lib/ui/celebration';
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
  const link = useRef<HTMLAnchorElement>(null);
  const previous = useRef(count);
  // Instamart: each add nudges the basket bar and gives a light haptic tap, so the add registers without a toast.
  useEffect(() => {
    if (count > previous.current && previous.current > 0) { bump(link.current, 1.04); haptic(8); }
    previous.current = count;
  }, [count]);
  if (!count || !browsing.test(path)) return null;
  return <div className="qc-cart-bar" data-slot="cart-bar">
    <Link href="/cart" className="qc-cart-bar-link" ref={link}>
      <span className="qc-cart-bar-icon" aria-hidden="true"><ShoppingCartIcon /><span key={count} className="qc-cart-bar-count">{count > 99 ? '99+' : count}</span></span>
      <span className="qc-cart-bar-text">{itemCountText(locale, count)}</span>
      <span className="qc-cart-bar-action">{locale === 'ar' ? 'عرض السلة' : 'View cart'}<ChevronRightIcon className="rtl:rotate-180" aria-hidden="true" /></span>
    </Link>
  </div>;
}
