import { StorefrontIntro } from '../../../components/storefront-intro';
import { metadataFor } from '../../../lib/server/seo';
import type { Query } from '../../../lib/seo';
import { getCategories } from '../../../lib/server/catalog';
import { CategoryGrid, Breadcrumb } from '../../../components/storefront';
import Link from 'next/link';
export async function generateMetadata({ searchParams }: { searchParams: Promise<Query> }) { return metadataFor('Categories', 'Browse healthcare, skincare and wellness categories at Al Mina Pharmacy.', '/categories', await searchParams); }
export default async function CategoriesPage() { return <><Breadcrumb title="Categories" /><StorefrontIntro title="Care for every routine" description="Find your essentials, one category at a time. Explore skincare, personal care and more." artwork="care" /><CategoryGrid categories={await getCategories()} />
  <section className="mt-8 flex flex-col gap-5 rounded-2xl bg-ink p-6 text-white md:flex-row md:items-center md:justify-between md:p-8">
    <div><h2 className="mb-1 text-xl font-semibold md:text-2xl">Not sure where to start?</h2><p className="m-0 max-w-[46ch] text-sm leading-6 text-white/60">Tell us what you need and our pharmacy team will help you find the right product.</p></div>
    <div className="flex flex-wrap gap-2.5"><Link className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-ink" href="/contact">Contact the pharmacy</Link><Link className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-5 text-sm font-medium text-white" href="/products">Browse all products</Link></div>
  </section></>; }
