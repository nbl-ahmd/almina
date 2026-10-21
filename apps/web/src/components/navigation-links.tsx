'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HomeIcon, BuildingStorefrontIcon, TagIcon, ShoppingCartIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { t, tf, type Locale, type MessageKey } from '../lib/i18n';
import { useCartCount } from '../lib/catalog/use-cart-count';

const mobile: { href: string; key: MessageKey; icon: typeof HomeIcon }[] = [
  { href: '/', key: 'navHome', icon: HomeIcon },
  { href: '/products', key: 'navShop', icon: BuildingStorefrontIcon },
  { href: '/offers', key: 'navOffers', icon: TagIcon },
  { href: '/cart', key: 'navCart', icon: ShoppingCartIcon },
  { href: '/account', key: 'navAccount', icon: UserCircleIcon },
];

const shopSections = ['/products', '/categories', '/collections', '/brands', '/productdetails', '/shop'];
export function NavigationLinks({ locale = 'en' }: { locale?: Locale }) {
  const pathname = usePathname();
  const count = useCartCount();
  const current = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/products') return shopSections.some(section => pathname === section || pathname.startsWith(`${section}/`));
    return pathname === href || pathname.startsWith(`${href}/`);
  };
  return <nav className="mobile-nav main-navigation fixed inset-x-0 bottom-0 z-20 mx-3 mb-3 flex gap-0.5 rounded-[20px] bg-surface px-1.5 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))] shadow-[0_18px_40px_-20px_rgb(21_23_26/35%)] md:hidden" aria-label={t(locale, 'mainNavigationAria')}>{mobile.map(link => {
    const active = current(link.href);
    const Glyph = link.icon;
    const cart = link.href === '/cart';
    return <Link key={link.href} aria-current={active ? 'page' : undefined} aria-label={cart && count ? tf(locale, 'headerCartCount', { count, unit: t(locale, count === 1 ? 'headerItem' : 'headerItems') }) : undefined} className={`flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-xs leading-none font-medium transition-colors ${active ? 'bg-care-mint text-ink' : 'text-muted hover:bg-subtle hover:text-ink'}`} href={link.href}>
      <span className="relative flex shrink-0">
        <Glyph className="size-[22px]" strokeWidth={active ? 1.9 : 1.5} aria-hidden="true" />
        {cart && count ? <span className={`absolute -top-1.5 -end-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] leading-none font-semibold text-ink ring-2 ${active ? 'ring-care-mint' : 'ring-surface'}`} aria-hidden="true">{count > 99 ? '99+' : count}</span> : null}
      </span>
      <span className="max-w-full truncate">{t(locale, link.key)}</span>
    </Link>;
  })}</nav>;
}
