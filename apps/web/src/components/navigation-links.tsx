'use client';
import Link from './app-link';
import { usePathname } from 'next/navigation';
import { HomeIcon, BuildingStorefrontIcon, TagIcon, ShoppingCartIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { HomeIcon as HomeSolid, BuildingStorefrontIcon as ShopSolid, TagIcon as TagSolid,
  ShoppingCartIcon as CartSolid, UserCircleIcon as AccountSolid } from '@heroicons/react/24/solid';
import { cartCountText, t, type Locale, type MessageKey } from '../lib/i18n';
import { useCartCount } from '../lib/catalog/use-cart-count';

const mobile: { href: string; key: MessageKey; icon: typeof HomeIcon; activeIcon: typeof HomeIcon }[] = [
  { href: '/', key: 'navHome', icon: HomeIcon, activeIcon: HomeSolid },
  { href: '/categories', key: 'navShop', icon: BuildingStorefrontIcon, activeIcon: ShopSolid },
  { href: '/offers', key: 'navOffers', icon: TagIcon, activeIcon: TagSolid },
  { href: '/cart', key: 'navCart', icon: ShoppingCartIcon, activeIcon: CartSolid },
  { href: '/account', key: 'navAccount', icon: UserCircleIcon, activeIcon: AccountSolid },
];

const shopSections = ['/products', '/categories', '/collections', '/brands', '/productdetails', '/shop'];
export function NavigationLinks({ locale = 'en' }: { locale?: Locale }) {
  const pathname = usePathname();
  const count = useCartCount();
  const current = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href === '/categories') return shopSections.some(section => pathname === section || pathname.startsWith(`${section}/`));
    return pathname === href || pathname.startsWith(`${href}/`);
  };
  return <nav className="mobile-nav main-navigation fixed inset-x-0 bottom-0 z-40 flex gap-0.5 border-t border-border bg-surface px-2 pt-1 pb-[calc(4px+env(safe-area-inset-bottom))] md:hidden" aria-label={t(locale, 'mainNavigationAria')}>{mobile.map(link => {
    const active = current(link.href);
    const Glyph = active ? link.activeIcon : link.icon;
    const cart = link.href === '/cart';
    return <Link key={link.href} aria-current={active ? 'page' : undefined} aria-label={cart && count ? cartCountText(locale,count) : undefined} className={`mobile-tab flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-xs leading-none font-medium transition-colors ${active ? 'text-ink' : 'text-muted hover:bg-subtle hover:text-ink'}`} href={link.href}>
      <span className={`mobile-tab-icon relative flex h-7 w-12 shrink-0 items-center justify-center rounded-full ${active ? 'bg-accent' : ''}`}>
        <Glyph className={`size-[22px] ${active ? 'text-teal' : ''}`} strokeWidth={active ? 1.9 : 1.5} aria-hidden="true" />
        {cart && count ? <span data-cart-count className={`absolute -top-1.5 -end-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] leading-none font-semibold tabular-nums text-coral-ink ring-2 ${active ? 'ring-accent' : 'ring-surface'}`} aria-hidden="true">{count > 99 ? '99+' : count}</span> : null}
      </span>
      <span className="max-w-full truncate">{t(locale, link.key)}</span>
    </Link>;
  })}</nav>;
}
