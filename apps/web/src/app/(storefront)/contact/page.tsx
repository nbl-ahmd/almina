import { StorefrontIntro } from '../../../components/storefront-intro';
import Link from 'next/link';
import { Breadcrumb } from '../../../components/storefront';
import { metadataFor } from '../../../lib/server/seo';
import type { Query } from '../../../lib/seo';
export async function generateMetadata({ searchParams }: { searchParams: Promise<Query> }) {
  return metadataFor('Contact Al Mina Pharmacy', 'Contact Al Mina Pharmacy in Ras Al Khaimah for product, delivery and order enquiries.', '/contact', await searchParams);
}
export default function ContactPage() {
  return <><Breadcrumb title="Contact us" /><section className="mx-auto max-w-6xl">
    <StorefrontIntro title="Let’s talk care." description="For product, delivery or order enquiries, get in touch with your neighbourhood Al Mina Pharmacy in Ras Al Khaimah." artwork="family" />
    <div className="grid gap-6 py-2 md:grid-cols-2"><section className="rounded-2xl border border-border bg-white p-5 md:p-7"><h2 className="mb-3 text-xl">Call or email</h2><address className="flex flex-col items-start gap-4 not-italic"><a className="inline-flex min-h-11 items-center text-lg font-medium text-brand hover:text-brand-hover" href="tel:+971504825007">+971 50 482 5007</a><a className="inline-flex min-h-11 max-w-full items-center break-all text-lg font-medium text-brand hover:text-brand-hover" href="mailto:info@alminapharmacy.com">info@alminapharmacy.com</a><p>Ras Al Khaimah, United Arab Emirates</p></address>
      <p className="mt-5 max-w-prose leading-relaxed text-muted">Please do not include medical records or payment details in an email.</p></section>
    <section id="delivery" className="rounded-2xl bg-[#eeedfc] p-5 md:p-7"><h2 className="mb-3 text-xl">Delivery enquiries</h2><p className="mb-4 max-w-prose leading-relaxed">Contact the pharmacy to check delivery to your area. Checkout confirms the delivery charge and final AED total before you place an order.</p><p className="mb-5 max-w-prose leading-relaxed">Ordering may be unavailable while the store is closed.</p><Link className="button button-secondary" href="/cart">Review your cart</Link></section></div>
  </section></>;
}
