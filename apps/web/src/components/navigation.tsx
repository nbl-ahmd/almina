import Image from 'next/image';
import Link from 'next/link';
const links = [['/', 'Home'], ['/products', 'All Products'], ['/categories', 'Categories'], ['/offers', 'Offers'], ['/cart', 'Cart']] as const;
export function Navigation() {
  return <><header className="site-header"><div className="header-content"><Link href="/" aria-label="Al Mina Pharmacy home"><Image src="/logo.png" alt="Al Mina Pharmacy" width={120} height={60} loading="eager" style={{ objectFit: 'contain' }} /></Link>
    <form action="/search" role="search"><label className="sr-only" htmlFor="site-search">Search products</label><input id="site-search" name="q" type="search" placeholder="Search…" maxLength={100} /><button>Search</button></form><Link href="/cart">Your cart</Link></div></header>
    <nav className="desktop-nav" aria-label="Main navigation">{links.map(([href, title]) => <Link href={href} key={href}>{title}</Link>)}</nav>
    <nav className="mobile-nav" aria-label="Mobile navigation">{links.map(([href, title]) => <Link href={href} key={href}>{title}</Link>)}</nav></>;
}
export function Footer() { return <footer><p>Al Mina Pharmacy · Ras Al Khaimah</p><Link href="/products">Products</Link> · <Link href="/categories">Categories</Link></footer>; }
