import { Suspense } from 'react';
import { CatalogLoading } from '../../components/catalog-loading';
import { metadataFor } from '../../lib/server/seo';
import type { Query } from '../../lib/seo';
import Image from 'next/image';
import Link from 'next/link';
import { getBanners, getCategories, getProducts } from '../../lib/server/catalog';
import { CategoryGrid, ProductGrid } from '../../components/storefront';
import { Icon } from '../../components/icon';
export async function generateMetadata({ searchParams }: { searchParams: Promise<Query> }) { return metadataFor('Al Mina Pharmacy Ras Al Khaimah', 'Healthcare, skincare and pharmacy essentials from Al Mina Pharmacy.', '/', await searchParams); }
export default function HomePage() {
  return <Suspense fallback={<CatalogLoading />}><HomeContent /></Suspense>;
}
async function HomeContent() {
  const [banners, categories, featured, offers] = await Promise.all([getBanners(), getCategories(), getProducts({ featured: true }), getProducts({ offers: true })]);
  return <><section className="hero mb-0 grid overflow-hidden rounded-[20px] border border-border bg-subtle md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"><div className="p-6 md:px-8 md:py-12 lg:px-12 lg:py-16"><p className="eyebrow">YOUR NEIGHBOURHOOD PHARMACY</p><h1 className="mb-6 text-[2.125rem] md:text-5xl lg:text-[3.5rem] min-[1440px]:text-[4rem]">Everyday essentials.<br /><span className="text-brand">A little more care.</span></h1><p className="mb-6 max-w-[44ch] text-muted">Explore health, skincare and wellness essentials at Al Mina Pharmacy. Find what you need, all in one place.</p><Link className="button" href="/products">Explore products <Icon name="arrow" /></Link><Link className="mt-2 flex min-h-11 items-center text-sm font-bold" href="/offers">Discover current offers</Link></div>
    <div className="hidden flex-col justify-end bg-accent p-8 md:flex lg:p-12 [&>.icon]:mb-auto [&>.icon]:size-[72px] [&>.icon]:text-brand"><span className="eyebrow order-first">AL MINA PHARMACY</span><Icon name="leaf" /><h2 className="mt-4 mb-2 text-[1.75rem]">Care starts here.</h2><p className="max-w-[28ch] text-ink">From your daily routine to your family’s essentials.</p><Link className="inline-flex min-h-11 items-center gap-3 font-bold" href="/categories">Find your category <Icon name="arrow" /></Link></div></section>
    <div className="mb-8 grid gap-3 border-b border-border pt-6 pb-8 text-sm text-muted md:grid-cols-3 md:gap-6 [&_span]:items-center [&_span]:gap-3 [&_.icon]:text-brand"><span className="flex"><Icon name="grid" />Easy category discovery</span><span className="hidden md:flex"><Icon name="search" />Find your everyday essentials</span><span className="hidden md:flex"><Icon name="bag" />Your cart, saved as you shop</span></div>
    {banners.length ? <section aria-label="Pharmacy promotions" className="grid gap-4 [&_img]:h-auto [&_img]:w-full [&_img]:rounded-xl">{banners.map((banner, i) => <Image key={banner.image} src={banner.image} alt={banner.name} width={1000} height={400} sizes="(max-width: 767px) 100vw, 1280px" loading={i === 0 ? 'eager' : 'lazy'} />)}</section> : null}
    <section><div className="section-heading"><div><p className="eyebrow">FIND YOUR ESSENTIALS</p><h2>Shop by category</h2></div><Link href="/categories">All categories <Icon name="arrow" /></Link></div><CategoryGrid categories={categories} /></section>
    <section><div className="section-heading"><div><p className="eyebrow">THE EVERYDAY EDIT</p><h2>Featured products</h2></div><Link href="/products">View all products <Icon name="arrow" /></Link></div><ProductGrid headingLevel={3} products={featured.products.slice(0, 10)} /></section>
    <section className="offers-section"><div className="section-heading"><div><p className="eyebrow">MORE CARE, MORE VALUE</p><h2>Top deals</h2></div><Link href="/offers">All offers <Icon name="arrow" /></Link></div><ProductGrid headingLevel={3} products={offers.products.slice(0, 10)} /></section></>;
}
