'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from './icon';
import { t, type Locale, type MessageKey } from '../lib/i18n';
const mobile: { href: string; key: MessageKey; icon: IconName }[] = [
  { href: '/', key: 'navHome', icon: 'home' }, { href: '/categories', key: 'navCategories', icon: 'grid' },
  { href: '/products', key: 'navProducts', icon: 'shop' }, { href: '/cart', key: 'navCart', icon: 'bag' },
  { href: '/offers', key: 'navOffers', icon: 'tag' },
];
const desktopLinks: { href: string; key: MessageKey }[] = [{ href: '/products', key: 'navShopProducts' }, { href: '/categories', key: 'navBrowseCategories' }, { href: '/search?q=skin', key: 'navSkincare' }, { href: '/search?q=vitamin', key: 'navVitamins' }, { href: '/search?q=baby', key: 'navBaby' }, { href: '/offers', key: 'navOffers' }, { href: '/about', key: 'navAbout' }];
export function NavigationLinks({ desktop = false, locale = 'en' }: { desktop?: boolean; locale?: Locale }) {
  const pathname = usePathname();
  const current = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)) ? 'page' as const : undefined;
  if (desktop) return <nav className="flex flex-wrap items-center justify-start gap-x-6 text-sm leading-snug text-ocean lg:gap-6" aria-label={t(locale, 'shopNavigationAria')}>{desktopLinks.map(link => <Link key={link.href} className="inline-flex min-h-11 shrink-0 whitespace-nowrap items-center border-b-2 border-transparent font-medium text-ocean hover:text-brand aria-[current=page]:border-brand aria-[current=page]:font-bold" href={link.href} aria-current={current(link.href)}>{t(locale, link.key)}</Link>)}</nav>;
  return <nav className="mobile-nav main-navigation fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface px-2 pt-1 pb-[calc(5px+env(safe-area-inset-bottom))] md:hidden" aria-label={t(locale, 'mainNavigationAria')}>{mobile.map(link => <Link key={link.href} className="flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-1 py-1 text-[11px] text-ocean aria-[current=page]:bg-accent aria-[current=page]:font-semibold aria-[current=page]:text-teal" href={link.href} aria-current={current(link.href)}><Icon name={link.icon} /><span className="max-w-full leading-snug wrap-anywhere">{t(locale, link.key)}</span></Link>)}</nav>;
}
