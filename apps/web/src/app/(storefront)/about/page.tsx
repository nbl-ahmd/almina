import Link from 'next/link';
import { Breadcrumb } from '../../../components/storefront';
import { metadataFor } from '../../../lib/server/seo';
import type { Query } from '../../../lib/seo';
export async function generateMetadata({ searchParams }: { searchParams: Promise<Query> }) {
  return metadataFor('About Al Mina Pharmacy', 'Find pharmacy, skincare and everyday care products from Al Mina Pharmacy in Ras Al Khaimah.', '/about', await searchParams);
}
export default function AboutPage() {
  return <><Breadcrumb title="About us" /><section className="mx-auto max-w-5xl py-6 md:py-12">
    <div className="border-b border-line pb-8"><h1 className="mb-4 max-w-3xl text-3xl leading-tight md:text-5xl">Everyday care at Al Mina Pharmacy.</h1>
      <p className="max-w-2xl text-lg leading-relaxed text-muted">Browse pharmacy, skincare and everyday essentials from Al Mina Pharmacy in Ras Al Khaimah, United Arab Emirates.</p></div>
    <div className="grid gap-8 py-8 md:grid-cols-2"><section><h2 className="mb-3 text-xl">Find what you need</h2><p className="mb-5 max-w-prose leading-relaxed">Search by product name or browse our categories. Product pages show the current catalog price in AED and available stock.</p><Link className="button" href="/products">Browse products</Link></section>
      <section><h2 className="mb-3 text-xl">Help with your order</h2><p className="mb-5 max-w-prose leading-relaxed">Contact the pharmacy for product or order enquiries. Availability and delivery charges are checked again when you review your order.</p><Link className="button button-secondary" href="/contact">Contact the pharmacy</Link></section></div>
  </section></>;
}
