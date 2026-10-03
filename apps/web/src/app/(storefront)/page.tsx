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
  return <><section className="hero"><div className="hero-copy"><p className="eyebrow">YOUR NEIGHBOURHOOD PHARMACY</p><h1>Everyday essentials.<br /><span>A little more care.</span></h1><p>Explore health, skincare and wellness essentials at Al Mina Pharmacy. Find what you need, all in one place.</p><Link className="button" href="/products">Explore products <Icon name="arrow" /></Link><Link className="hero-secondary" href="/offers">Discover current offers</Link></div>
    <div className="hero-discovery"><span className="eyebrow">AL MINA PHARMACY</span><Icon name="leaf" /><h2>Care starts here.</h2><p>From your daily routine to your family’s essentials.</p><Link href="/categories">Find your category <Icon name="arrow" /></Link></div></section>
    <div className="service-strip"><span><Icon name="grid" />Easy category discovery</span><span><Icon name="search" />Find your everyday essentials</span><span><Icon name="bag" />Your cart, saved as you shop</span></div>
    {banners.length ? <section aria-label="Pharmacy promotions" className="banners">{banners.map((banner, i) => <Image key={banner.image} src={banner.image} alt={banner.name} width={1000} height={400} sizes="(max-width: 767px) 100vw, 1280px" loading={i === 0 ? 'eager' : 'lazy'} />)}</section> : null}
    <section><div className="section-heading"><div><p className="eyebrow">FIND YOUR ESSENTIALS</p><h2>Shop by category</h2></div><Link href="/categories">All categories <Icon name="arrow" /></Link></div><CategoryGrid categories={categories} /></section>
    <section><div className="section-heading"><div><p className="eyebrow">THE EVERYDAY EDIT</p><h2>Featured products</h2></div><Link href="/products">View all products <Icon name="arrow" /></Link></div><ProductGrid headingLevel={3} products={featured.products.slice(0, 10)} /></section>
    <section className="offers-section"><div className="section-heading"><div><p className="eyebrow">MORE CARE, MORE VALUE</p><h2>Top deals</h2></div><Link href="/offers">All offers <Icon name="arrow" /></Link></div><ProductGrid headingLevel={3} products={offers.products.slice(0, 10)} /></section></>;
}
