'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon, type IconName } from './icon';
const links: { href: string; title: string; icon: IconName }[] = [
  { href: '/', title: 'Home', icon: 'home' },
  { href: '/products', title: 'Products', icon: 'leaf' },
  { href: '/categories', title: 'Categories', icon: 'grid' },
  { href: '/offers', title: 'Offers', icon: 'tag' },
  { href: '/cart', title: 'Cart', icon: 'bag' },
];
export function NavigationLinks() {
  const pathname = usePathname();
  return <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface px-1 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))] md:static md:gap-6 md:border-0 md:p-0" aria-label="Main navigation">
    {links.map(({ href, title, icon }) => <Link className="flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-xs text-muted aria-[current=page]:bg-subtle aria-[current=page]:font-bold aria-[current=page]:text-brand md:flex-none md:flex-row md:gap-2 md:rounded-none md:border-b-[3px] md:border-transparent md:text-sm md:aria-[current=page]:border-brand md:aria-[current=page]:bg-transparent md:[&>.icon]:h-[18px] md:[&>.icon]:w-[18px]" key={href} href={href} aria-current={(href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)) ? 'page' : undefined}>
      <Icon name={icon} /><span className="max-w-full wrap-anywhere">{title}</span>
    </Link>)}
  </nav>;
}
