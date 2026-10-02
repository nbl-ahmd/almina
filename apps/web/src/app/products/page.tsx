import { Suspense } from 'react';
import { CatalogList, type SearchParams } from '../../components/catalog-list';
export const metadata = { title: 'All products' };
export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) { return <Suspense fallback={<p role="status">Loading products…</p>}><CatalogList title="All products" params={await searchParams} /></Suspense>; }
