import { metadataFor } from '../../lib/server/seo';
import { Suspense } from 'react';
import { CatalogList, type SearchParams } from '../../components/catalog-list';
export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }) { return metadataFor('All products', 'Browse healthcare, skincare and pharmacy products at Al Mina Pharmacy.', '/products', await searchParams); }
export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) { return <Suspense fallback={<p role="status">Loading products…</p>}><CatalogList title="All products" params={await searchParams} /></Suspense>; }
