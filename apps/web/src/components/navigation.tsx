import { SearchBox } from "./search-box";
import Image from "next/image";
import Link from "next/link";
import {
  PhoneIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import { NavigationLinks } from "./navigation-links";
import { CartLink } from "./cart-link";
import { DeliveryAreaPrompt, DeliveryLocation } from "./delivery-location";
import { UsagePreferences } from "./usage-preferences";

export function Navigation() {
  return (
    <>
      <a
        className="skip-link fixed top-2 left-2 z-[100] -translate-y-[160%] rounded-xl bg-white px-4 py-3 text-brand focus:translate-y-0"
        href="#main-content"
      >
        Skip to content
      </a>
      <header className="storefront-header border-b border-border bg-white">
        <div className="hidden bg-[#eef1ff] md:block">
          <div className="mx-auto flex min-h-8 max-w-[1344px] items-center justify-between px-6 text-[11px] text-[#3f4f83] lg:px-8">
            <span>Health, beauty &amp; everyday care. Hello from Al Mina.</span>
            <a
              className="inline-flex items-center gap-2 text-[#3f4f83]"
              href="tel:+971504825007"
            >
              <PhoneIcon className="size-3.5" />
              +971 50 482 5007
            </a>
          </div>
        </div>
        <div className="header-content mx-auto grid max-w-[1344px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 py-2.5 md:grid-cols-[auto_minmax(0,1fr)_auto_auto] md:gap-5 md:px-6 lg:px-8">
          <Link
            href="/"
            aria-label="Al Mina Pharmacy home"
            className="brand-logo inline-flex w-fit"
          >
            <Image
              className="h-auto w-[112px] object-contain md:w-[140px]"
              src="/logo.png"
              alt="Al Mina Pharmacy"
              width={2789}
              height={910}
              sizes="(max-width: 767px) 112px, 140px"
            />
          </Link>
          <SearchBox />
          <DeliveryLocation />
          <CartLink />
        </div>
        <div className="hidden border-t border-border md:block">
          <div className="mx-auto max-w-[1344px] px-6 lg:px-8">
            <NavigationLinks desktop />
          </div>
        </div>
        <DeliveryAreaPrompt />
        <NavigationLinks />
      </header>
      <nav
        aria-label="Quick contact"
        className="floating-contact fixed right-4 bottom-[calc(80px+env(safe-area-inset-bottom))] z-30 md:right-6 md:bottom-6"
      >
        <Link
          href="/contact"
          aria-label="Contact Al Mina Pharmacy"
          className="flex size-12 items-center justify-center rounded-full bg-brand text-white shadow-raised transition-transform motion-safe:hover:-translate-y-0.5 md:size-14"
        >
          <ChatBubbleLeftRightIcon className="size-6" />
        </Link>
      </nav>
    </>
  );
}
const shopLinks = [
  ["Shop brands", "/brands"],
  ["Your account", "/account"],
  ["Saved products", "/saved"],
  ["All products", "/products"],
  ["Shop by category", "/categories"],
  ["Current offers", "/offers"],
  ["Your shopping cart", "/cart"],
];
const helpLinks = [
  ["Pharmacy in Ras Al Khaimah", "/ras-al-khaimah"],
  ["Care & buying guides", "/health-guides"],
  ["About Al Mina", "/about"],
  ["Contact our team", "/contact"],
  ["Delivery & order enquiries", "/contact"],
];
export function Footer({
  telemetryEnabled = false,
}: {
  telemetryEnabled?: boolean;
}) {
  return (
    <footer className="storefront-footer mt-7 border-t border-border bg-[#f1f3fc] pt-7 pb-5">
      <div className="mx-auto max-w-[1344px] px-4 md:px-6 lg:px-8">
        <div className="grid gap-8 border-b border-[#dce0ef] pb-9 md:grid-cols-[1.5fr_1fr_1fr_1.3fr]">
          <div>
            <Link href="/" className="inline-flex">
              <Image
                className="h-auto w-[145px] object-contain"
                src="/logo.png"
                alt="Al Mina Pharmacy home"
                width={2789}
                height={910}
                sizes="145px"
              />
            </Link>
            <p className="mt-4 mb-3 max-w-xs text-sm leading-6 text-muted">
              A little more care for your everyday. Health, skincare and
              essentials from your neighbourhood pharmacy.
            </p>
            <span className="text-xs text-muted">
              Ras Al Khaimah, United Arab Emirates
            </span>
          </div>
          <nav aria-label="Footer shop">
            <h2 className="mb-3 text-base font-semibold">
              Find your essentials
            </h2>
            {shopLinks.map(([name, path]) => (
              <Link
                key={path}
                className="flex min-h-10 items-center text-sm text-muted hover:text-brand"
                href={path!}
              >
                {name}
              </Link>
            ))}
          </nav>
          <nav aria-label="Footer help">
            <h2 className="mb-3 text-base font-semibold">Here to help</h2>
            {helpLinks.map(([name, path]) => (
              <Link
                key={name}
                className="flex min-h-10 items-center text-sm text-muted hover:text-brand"
                href={path!}
              >
                {name}
              </Link>
            ))}
          </nav>
          <div>
            <h2 className="mb-3 text-base font-semibold">Let’s talk care.</h2>
            <a
              href="tel:+971504825007"
              className="mb-2 flex min-h-11 items-center gap-2 text-sm font-medium text-brand"
            >
              <PhoneIcon className="size-4" />
              +971 50 482 5007
            </a>
            <a
              href="mailto:info@alminapharmacy.com"
              className="inline-flex min-h-11 items-center text-sm text-muted hover:text-brand"
            >
              info@alminapharmacy.com
            </a>
            <p className="mt-3 mb-0 text-xs leading-5 text-muted">
              For product availability, delivery and order support.
            </p>
          </div>
        </div>
        {telemetryEnabled ? <UsagePreferences /> : null}
        <div className="flex flex-wrap justify-between gap-3 pt-5 text-xs text-muted">
          <span>Al Mina Pharmacy · Ras Al Khaimah</span>
          <span>Care that feels a little closer.</span>
        </div>
      </div>
    </footer>
  );
}
