import Image from 'next/image';
import Link from 'next/link';
import { NavigationLinks } from './navigation-links';
import { Icon } from './icon';
import { CartLink } from './cart-link';
import { DeliveryLocation, DeliveryAreaPrompt } from './delivery-location';
import { UsagePreferences } from './usage-preferences';

export function Navigation() {
  return <><a className="skip-link fixed left-2 top-2 z-[100] -translate-y-[160%] rounded-lg bg-surface px-4 py-3 focus:translate-y-0" href="#main-content">Skip to content</a>
    <header className="storefront-header border-b border-border bg-surface">
      <div className="announcement hidden bg-ocean text-xs text-white md:block"><div className="mx-auto flex min-h-8 max-w-[1344px] items-center justify-between gap-4 px-6 lg:px-8"><span className="flex items-center gap-2"><Icon name="check" />Al Mina Pharmacy · Health, skincare &amp; everyday essentials</span><a className="text-white" href="tel:+971504825007">Call the pharmacy: +971 50 482 5007</a></div></div>
      <div className="header-content mx-auto grid max-w-[1344px] grid-cols-[1fr_auto_auto] items-center gap-1.5 px-4 pt-2 pb-3 md:grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] md:gap-5 md:px-6 md:py-3 lg:px-8 max-md:group-has-[.pdp-page]/storefront:grid-cols-[44px_minmax(0,1fr)_44px] max-md:group-has-[.catalog-page]/storefront:grid-cols-[auto_minmax(0,1fr)_auto]">
        <Link className="product-back hidden min-h-11 text-ink items-center justify-center max-md:group-has-[.pdp-page]/storefront:flex" href="/products" aria-label="Back to products"><Icon name="back" /></Link>
        <Link className="brand-logo inline-flex w-fit max-md:group-has-[.pdp-page]/storefront:justify-self-center" href="/" aria-label="Al Mina Pharmacy home"><Image className="h-9 w-[106px] object-contain md:h-11 md:w-[120px]" src="/logo.png" alt="Al Mina Pharmacy" width={2789} height={910} sizes="(max-width: 767px) 106px, 120px" loading="eager" /></Link>
        <DeliveryLocation />
        <form className="hidden min-w-0 items-center gap-2 rounded-xl border border-border bg-page px-3 md:flex" action="/search" role="search" aria-label="Header product search"><Icon name="search" /><label className="sr-only" htmlFor="desktop-search">Search products</label><input id="desktop-search" name="q" type="search" maxLength={80} placeholder="Search products and essentials" className="min-h-11 min-w-0 flex-1 border-0 bg-transparent px-0 py-1 text-sm" /><button type="submit" className="sr-only">Search</button></form>
        <div className="flex items-center gap-2 max-md:group-has-[.pdp-page]/storefront:hidden"><Link className="header-help flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-accent/30 px-2.5 text-xs text-teal md:min-h-11 md:border-0 md:bg-transparent md:text-sm max-md:group-has-[.pdp-page]/storefront:hidden" href="/contact" aria-label="Contact us"><Icon name="phone" /><span className="md:hidden max-md:group-has-[.catalog-page]/storefront:hidden">Contact</span></Link></div>
        <CartLink />
        <form className="header-search col-span-full row-start-3 flex min-w-0 items-center gap-2 rounded-xl border border-border bg-surface p-1 pl-3 shadow-sm md:hidden max-md:group-has-[.pdp-page]/storefront:hidden max-md:group-has-[.cart-page]/storefront:hidden max-md:group-has-[.catalog-page]/storefront:hidden" action="/search" role="search" aria-label="Product search"><Icon name="search" /><label className="sr-only" htmlFor="site-search">Search products</label><input className="min-h-9 min-w-0 flex-1 border-0 bg-transparent px-1 py-2 text-sm focus-visible:outline-offset-[-3px]" id="site-search" name="q" type="search" placeholder="Search products and daily essentials" maxLength={80} /><button className="min-h-9 rounded-lg px-3 py-2 text-xs" type="submit">Search</button></form>
      </div>
      <div className="hidden border-t border-border md:block"><div className="mx-auto max-w-[1344px] px-6 lg:px-8"><NavigationLinks desktop /></div></div>
      <DeliveryAreaPrompt />
      <div className="header-navigation max-md:group-has-[.pdp-page]/storefront:hidden"><NavigationLinks /></div>
    </header></>;
}

export function Footer({ telemetryEnabled = false }: { telemetryEnabled?: boolean }) {
  return <footer className="storefront-footer mt-10 border-t border-border bg-subtle py-8"><div className="mx-auto max-w-[1344px] px-4 md:px-6 lg:px-8">
    <div className="grid gap-6 md:grid-cols-[1fr_2fr]"><div><Link href="/" className="inline-flex"><Image className="h-auto w-[120px] object-contain" src="/logo.png" alt="Al Mina Pharmacy home" width={2789} height={910} sizes="120px" /></Link><p className="mt-2 max-w-xs text-sm text-muted">Health, skincare and everyday essentials from your neighbourhood pharmacy.</p></div><nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ocean md:justify-end [&_a]:text-ocean [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a:hover]:text-brand" aria-label="Footer shop"><Link href="/products">All products</Link><Link href="/categories">Categories</Link><Link href="/offers">Current offers</Link><Link href="/about">About Al Mina</Link><Link href="/contact">Contact us</Link><Link href="/cart">Your cart</Link></nav></div>
    <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-5 text-xs text-ocean"><span className="inline-flex items-center gap-2"><Icon name="pin" />Ras Al Khaimah, United Arab Emirates</span><a className="inline-flex min-h-11 items-center text-ocean" href="tel:+971504825007">+971 50 482 5007</a><a className="inline-flex min-h-11 items-center text-ocean" href="mailto:info@alminapharmacy.com">info@alminapharmacy.com</a></div>
    {telemetryEnabled ? <UsagePreferences /> : null}
    <div className="mt-4 flex flex-wrap justify-between gap-3 border-t border-border pt-4 text-xs text-muted"><span>Al Mina Pharmacy · Ras Al Khaimah</span><span>Care for your everyday.</span></div>
  </div></footer>;
}
