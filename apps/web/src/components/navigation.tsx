import Image from 'next/image';
import Link from 'next/link';
import { NavigationLinks } from './navigation-links';
import { Icon } from './icon';
export function Navigation() {
  return <><a className="fixed top-2 left-2 z-[100] -translate-y-[160%] rounded-lg bg-surface px-4 py-3 text-brand shadow-sm focus:translate-y-0" href="#main-content">Skip to content</a>
    <header className="border-b border-border bg-surface">
      <div className="bg-brand text-xs text-surface"><div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-[var(--gutter)] py-1"><span>Al Mina Pharmacy · Ras Al Khaimah</span><Link className="inline-flex min-h-8 shrink-0 items-center text-surface" href="/contact">Contact us</Link></div></div>
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-[var(--gutter)] py-4 lg:gap-8">
        <Link className="flex shrink-0 items-center text-ink hover:no-underline" href="/" aria-label="Al Mina Pharmacy home"><Image className="h-[60px] w-[120px] object-contain md:h-[70px] md:w-[140px]" src="/logo.png" alt="Al Mina Pharmacy" width={140} height={70} sizes="(min-width: 768px) 140px, 120px" loading="eager" /></Link>
        <form className="order-3 flex w-full min-w-0 items-center gap-2 rounded-lg border border-muted bg-page p-1 focus-within:border-brand md:order-none md:max-w-[640px] md:min-w-[160px] md:flex-1 lg:[&>.icon]:ml-3 lg:[&>.icon]:block [&>.icon]:hidden [&>.icon]:text-muted" action="/search" role="search" aria-label="Product search"><label className="sr-only" htmlFor="site-search">Search products</label><Icon name="search" /><input className="min-h-11 min-w-0 flex-1 border-0 bg-transparent p-2" id="site-search" name="q" type="search" placeholder="Search products" maxLength={80} /><button className="min-h-11 shrink-0 px-3 py-2" type="submit">Search</button></form>
        <Link className="flex min-h-12 items-center justify-center gap-2 text-sm font-bold md:min-w-[90px]" href="/cart"><Icon name="bag" /><span>Your cart</span></Link>
      </div>
      <div className="mx-auto max-w-[1280px] px-[var(--gutter)] md:flex md:items-center md:justify-between"><NavigationLinks /><span className="hidden text-xs text-muted lg:inline">Health, beauty &amp; everyday essentials</span></div>
    </header></>;
}
export function Footer() {
  const navClass = 'flex flex-col items-start [&_a]:flex [&_a]:min-h-11 [&_a]:items-center [&_a]:text-sm';
  return <footer className="border-t border-border bg-subtle">
    <div className="mx-auto grid max-w-[1280px] gap-8 px-[var(--gutter)] py-8 md:grid-cols-[1.5fr_1fr_1fr] md:py-12">
      <div><p className="mb-4 text-2xl font-bold">Al Mina Pharmacy<span className="mt-2 block text-base font-normal text-muted">Care for your everyday.</span></p><p className="text-sm text-muted">Ras Al Khaimah, United Arab Emirates</p><div className="flex flex-col items-start text-sm [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:wrap-anywhere"><a href="tel:+971504825007">+971 50 482 5007</a><a href="mailto:info@alminapharmacy.com">info@alminapharmacy.com</a></div></div>
      <nav className={navClass} aria-label="Footer shop"><h2 className="mb-2 text-base">Explore the pharmacy</h2><Link href="/products">All products</Link><Link href="/categories">Shop by category</Link><Link href="/offers">Current offers</Link><Link href="/about">About us</Link><Link href="/contact">Contact us</Link></nav>
      <nav className={navClass} aria-label="Footer shopping"><h2 className="mb-2 text-base">Your shopping</h2><Link href="/search">Search products</Link><Link href="/cart">View your cart</Link><Link href="/checkout">Checkout review</Link></nav>
    </div>
    <div className="mx-auto flex max-w-[1280px] flex-wrap justify-between gap-4 border-t border-border px-[var(--gutter)] py-6 text-xs text-muted"><span>Al Mina Pharmacy · Ras Al Khaimah</span><span>Health, skincare &amp; wellness essentials.</span></div>
  </footer>;
}
