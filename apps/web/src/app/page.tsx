import { metadataFor } from '../lib/server/seo';
import type { Query } from '../lib/seo';
import Image from 'next/image';
import Link from 'next/link';
import { getBanners, getCategories, getProducts } from '../lib/server/catalog';
import { CategoryGrid, ProductGrid } from '../components/storefront';
export async function generateMetadata({ searchParams }: { searchParams: Promise<Query> }) { return metadataFor('Al Mina Pharmacy Ras Al Khaimah', 'Healthcare, skincare and pharmacy essentials from Al Mina Pharmacy.', '/', await searchParams); }
export default async function HomePage() {
  const [banners, categories, featured, offers] = await Promise.all([getBanners(), getCategories(), getProducts({ featured: true }), getProducts({ offers: true })]);
  return <><section className="hero"><h1>Al Mina Pharmacy</h1>{banners.length ? <div className="banners">{banners.map((banner, i) => <Image key={banner.image} src={banner.image} alt={banner.name} width={1000} height={400} sizes="(max-width: 700px) 100vw, 1000px" loading={i === 0 ? 'eager' : 'lazy'} />)}</div> : null}</section>
    <section><h2>Shop by category</h2><CategoryGrid categories={categories} /><Link href="/categories">All categories</Link></section>
    <section><h2>Featured products</h2><ProductGrid products={featured.products.slice(0, 10)} /></section>
    <section><h2>Top deals</h2><ProductGrid products={offers.products.slice(0, 10)} /><Link href="/offers">All offers</Link></section></>;
}
