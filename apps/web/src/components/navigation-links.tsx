'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from './icon';
const mobile: { href: string; title: string; icon: IconName }[] = [
  { href: '/', title: 'Home', icon: 'home' }, { href: '/categories', title: 'Categories', icon: 'grid' },
  { href: '/products', title: 'Products', icon: 'shop' }, { href: '/cart', title: 'Cart', icon: 'bag' },
  { href: '/offers', title: 'Offers', icon: 'tag' },
];
const desktopLinks = [{ href: '/products', title: 'Shop products' }, { href: '/categories', title: 'Browse categories' }, { href: '/offers', title: 'Current offers' }, { href: '/about', title: 'About Al Mina' }];
export function NavigationLinks({ desktop = false }: { desktop?: boolean }) {
  const pathname = usePathname();
  const current = (href: string) => (href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)) ? 'page' as const : undefined;
  if (desktop) return <nav className="flex items-center justify-start gap-8 text-sm leading-snug text-ocean lg:gap-6" aria-label="Shop navigation">{desktopLinks.map(link => <Link key={link.href} className="inline-flex min-h-11 shrink-0 whitespace-nowrap items-center border-b-2 border-transparent font-medium text-ocean hover:text-brand aria-[current=page]:border-brand aria-[current=page]:font-bold" href={link.href} aria-current={current(link.href)}>{link.title}</Link>)}</nav>;
  return <nav className="mobile-nav main-navigation fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface px-2 pt-1 pb-[calc(5px+env(safe-area-inset-bottom))] md:hidden" aria-label="Main navigation">{mobile.map(link => <Link key={link.href} className="flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-1 py-1 text-[11px] text-ocean aria-[current=page]:bg-accent aria-[current=page]:font-semibold aria-[current=page]:text-teal" href={link.href} aria-current={current(link.href)}><Icon name={link.icon} /><span className="max-w-full leading-snug wrap-anywhere">{link.title}</span></Link>)}</nav>;
}
