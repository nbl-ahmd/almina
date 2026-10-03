import Image from 'next/image';
import Link from 'next/link';
import { NavigationLinks } from './navigation-links';
import { Icon } from './icon';
export function Navigation() {
  return <><a className="skip-link" href="#main-content">Skip to content</a>
    <header className="site-header"><div className="announcement"><span>Al Mina Pharmacy</span><span>Everyday care in Ras Al Khaimah</span></div>
    <div className="header-content">
      <Link className="brand" href="/" aria-label="Al Mina Pharmacy home"><Image src="/logo.png" alt="Al Mina Pharmacy" width={120} height={60} loading="eager" /><span>AL MINA<small>PHARMACY</small></span></Link>
      <form className="site-search" action="/search" role="search"><label className="sr-only" htmlFor="site-search">Search products</label><Icon name="search" /><input id="site-search" name="q" type="search" placeholder="Search products" maxLength={100} /><button type="submit">Search</button></form>
      <Link className="header-cart" href="/cart"><Icon name="bag" /><span>Your cart</span></Link>
    </div><div className="nav-container"><NavigationLinks /><span className="nav-note">Health, beauty & everyday essentials</span></div></header>
    <NavigationLinks mobile /></>;
}
export function Footer() {
  return <footer className="site-footer"><div className="footer-content"><div><p className="footer-brand">Al Mina Pharmacy<span>Care for your everyday.</span></p><p>Ras Al Khaimah, United Arab Emirates</p><div className="footer-contact"><a href="tel:+971504825007">+971 50 482 5007</a><a href="mailto:info@alminapharmacy.com">info@alminapharmacy.com</a></div></div>
    <nav aria-label="Footer shop"><h2>Explore the pharmacy</h2><Link href="/products">All products</Link><Link href="/categories">Shop by category</Link><Link href="/offers">Current offers</Link></nav>
    <nav aria-label="Footer shopping"><h2>Your shopping</h2><Link href="/search">Search products</Link><Link href="/cart">View your cart</Link><Link href="/checkout">Checkout review</Link></nav></div>
    <div className="footer-bottom"><span>Al Mina Pharmacy · Ras Al Khaimah</span><span>Health, skincare &amp; wellness essentials.</span></div></footer>;
}
