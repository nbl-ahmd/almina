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
export function NavigationLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return <nav className={mobile ? 'mobile-nav' : 'desktop-nav'} aria-label={mobile ? 'Mobile navigation' : 'Main navigation'}>
    {links.map(({ href, title, icon }) => <Link key={href} href={href} aria-current={(href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)) ? 'page' : undefined}>
      <Icon name={icon} /><span>{title}</span>
    </Link>)}
  </nav>;
}
